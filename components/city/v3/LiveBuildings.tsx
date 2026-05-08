'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  createSeededRng,
  type LiveCityTimeMode,
  type LiveCityTierKey,
} from './liveCityHandoff';
import type { LiveBuildingLayout } from './liveLayout';

interface Props {
  buildings: LiveBuildingLayout[];
  timeMode: LiveCityTimeMode;
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}

interface FacadeTextures {
  map: THREE.Texture | null;
  emissiveMap: THREE.Texture | null;
}

interface StaticMaterialSet {
  freeRoof: THREE.MeshLambertMaterial;
  freeChimney: THREE.MeshLambertMaterial;
  starterRoof: THREE.MeshLambertMaterial;
  starterParapet: THREE.MeshLambertMaterial;
  starterTank: THREE.MeshLambertMaterial;
  proLobby: THREE.MeshLambertMaterial;
  enterprisePodium: THREE.MeshLambertMaterial;
  enterpriseLedge: THREE.MeshLambertMaterial;
  antenna: THREE.MeshLambertMaterial;
  beacon: THREE.MeshBasicMaterial;
  plinth: THREE.MeshLambertMaterial;
  equipment: THREE.MeshLambertMaterial;
  duct: THREE.MeshLambertMaterial;
  treeTrunk: THREE.MeshLambertMaterial;
  treeFoliage: THREE.MeshLambertMaterial;
}

const facadeTextureCache = new Map<string, FacadeTextures>();
let staticMaterials: StaticMaterialSet | null = null;

function isTowerTier(tier: LiveCityTierKey): boolean {
  return tier === 'business' || tier === 'founding';
}

export function LiveBuildings({ buildings, timeMode, onBuildingClick }: Props) {
  return (
    <group>
      {buildings.map((building) => (
        <HandoffBuilding
          key={building.ownerKey}
          building={building}
          timeMode={timeMode}
          onBuildingClick={onBuildingClick}
        />
      ))}
      <LiveBuildingClickTargets
        buildings={buildings}
        onBuildingClick={onBuildingClick}
      />
    </group>
  );
}

function HandoffBuilding({
  building,
  timeMode,
  onBuildingClick,
}: {
  building: LiveBuildingLayout;
  timeMode: LiveCityTimeMode;
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}) {
  const materials = useMemo(() => getStaticMaterials(), []);
  const facadeMaterial = useMemo(() => {
    const textures = makeFacadeTextures(
      building.visual.tierKey,
      building.visual.variant,
    );
    const material = new THREE.MeshLambertMaterial({
      map: textures.map,
      emissive: 0xffffff,
      emissiveMap: textures.emissiveMap,
      emissiveIntensity: timeMode === 'night' ? 0.85 : 0.05,
    });
    material.userData.isFacade = true;
    return material;
  }, [building.visual.tierKey, building.visual.variant, timeMode]);
  const glassMaterial = useMemo(() => {
    if (!isTowerTier(building.visual.tierKey)) return null;
    const material = new THREE.MeshLambertMaterial({
      color: 0x0c1a2a,
      emissive: new THREE.Color(
        building.visual.tierKey === 'founding' ? '#ffd46b' : '#a9d8ff',
      ),
      emissiveIntensity: timeMode === 'night' ? 0.7 : 0.08,
      transparent: true,
      opacity: 0.95,
    });
    material.userData.isGlass = true;
    return material;
  }, [building.visual.tierKey, timeMode]);

  useEffect(() => {
    return () => {
      facadeMaterial.dispose();
      glassMaterial?.dispose();
    };
  }, [facadeMaterial, glassMaterial]);

  const handlePointer = (event: { stopPropagation: () => void }) => {
    if (!onBuildingClick) return;
    event.stopPropagation();
    onBuildingClick(building);
  };

  return (
    <group
      position={[building.x, 0, building.z]}
      rotation={[0, building.rotation, 0]}
      onClick={handlePointer}
      onPointerDown={handlePointer}
    >
      {building.visual.tierKey === 'free' ? (
        <FreeBuilding
          building={building}
          facadeMaterial={facadeMaterial}
          materials={materials}
        />
      ) : building.visual.tierKey === 'starter' ? (
        <StarterBuilding
          building={building}
          facadeMaterial={facadeMaterial}
          materials={materials}
        />
      ) : building.visual.tierKey === 'pro' ? (
        <ProBuilding
          building={building}
          facadeMaterial={facadeMaterial}
          materials={materials}
        />
      ) : (
        <EnterpriseBuilding
          building={building}
          facadeMaterial={facadeMaterial}
          glassMaterial={glassMaterial}
          materials={materials}
        />
      )}
      <Plinth building={building} material={materials.plinth} />
      {building.mine && <MyBuildingMarker height={building.height} />}
    </group>
  );
}

function MyBuildingMarker({ height }: { height: number }) {
  return (
    <group position={[0, height + 1.2, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.035, 8, 36]} />
        <meshBasicMaterial color={0xffd24a} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.22, 14, 10]} />
        <meshBasicMaterial color={0xffd24a} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.65, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.35, 6]} />
        <meshBasicMaterial
          color={0xffd24a}
          transparent
          opacity={0.72}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function FreeBuilding({
  building,
  facadeMaterial,
  materials,
}: {
  building: LiveBuildingLayout;
  facadeMaterial: THREE.Material;
  materials: StaticMaterialSet;
}) {
  const { width, depth, height, seed } = building.visual;
  const spec = useMemo(() => {
    const rng = rngAfterVisual(seed);
    const roofH = 0.7 + rng() * 0.4;
    const hasChimney = rng() > 0.4;
    const chimney = hasChimney
      ? {
          x: (rng() - 0.5) * width * 0.5,
          y: height + 0.5 + roofH * 0.3,
          z: (rng() - 0.5) * depth * 0.3,
        }
      : null;
    const tree = makeTreeSpec(rng, width, depth);
    return { roofH, chimney, tree };
  }, [depth, height, seed, width]);

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <PitchedRoof
        width={width * 1.06}
        depth={depth * 1.06}
        height={spec.roofH}
        y={height}
        material={materials.freeRoof}
      />
      {spec.chimney && (
        <mesh
          position={[spec.chimney.x, spec.chimney.y, spec.chimney.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.35, 1, 0.35]} />
          <primitive object={materials.freeChimney} attach="material" />
        </mesh>
      )}
      {spec.tree && <SmallTree spec={spec.tree} materials={materials} />}
    </group>
  );
}

function StarterBuilding({
  building,
  facadeMaterial,
  materials,
}: {
  building: LiveBuildingLayout;
  facadeMaterial: THREE.Material;
  materials: StaticMaterialSet;
}) {
  const { width, depth, height, seed } = building.visual;
  const spec = useMemo(() => {
    const rng = rngAfterVisual(seed);
    const pitched = rng() < 0.5;
    const tank = pitched
      ? null
      : {
          x: (rng() - 0.5) * width * 0.3,
          z: (rng() - 0.5) * depth * 0.3,
        };
    const tree = makeTreeSpec(rng, width, depth);
    return { pitched, tank, tree };
  }, [depth, seed, width]);

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      {spec.pitched ? (
        <PitchedRoof
          width={width * 1.05}
          depth={depth * 1.05}
          height={0.9}
          y={height}
          material={materials.starterRoof}
        />
      ) : (
        <>
          <mesh position={[0, height + 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 1.04, 0.25, depth * 1.04]} />
            <primitive object={materials.starterParapet} attach="material" />
          </mesh>
          <mesh
            position={[spec.tank?.x ?? 0, height + 0.6, spec.tank?.z ?? 0]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.4, 0.4, 0.7, 10]} />
            <primitive object={materials.starterTank} attach="material" />
          </mesh>
        </>
      )}
      {spec.tree && <SmallTree spec={spec.tree} materials={materials} />}
    </group>
  );
}

function ProBuilding({
  building,
  facadeMaterial,
  materials,
}: {
  building: LiveBuildingLayout;
  facadeMaterial: THREE.Material;
  materials: StaticMaterialSet;
}) {
  const {
    width: baseWidth,
    depth: baseDepth,
    height: totalHeight,
    seed,
  } = building.visual;
  const spec = useMemo(() => {
    const rng = rngAfterVisual(seed);
    const width = baseWidth + 0.6;
    const depth = baseDepth + 0.6;
    const baseHeight = totalHeight * (0.55 + rng() * 0.15);
    const topHeight = totalHeight - baseHeight;
    return {
      width,
      depth,
      baseHeight,
      topHeight,
      topWidth: width * 0.78,
      topDepth: depth * 0.78,
    };
  }, [baseDepth, baseWidth, seed, totalHeight]);

  return (
    <group>
      <mesh position={[0, spec.baseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.width, spec.baseHeight, spec.depth]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <mesh
        position={[0, spec.baseHeight + spec.topHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[spec.topWidth, spec.topHeight, spec.topDepth]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <RooftopEquipment
        seed={seed}
        skipAfterVisual={1}
        width={spec.topWidth}
        depth={spec.topDepth}
        baseY={totalHeight}
        dense={false}
        materials={materials}
      />
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.width * 1.005, 1, spec.depth * 1.005]} />
        <primitive object={materials.proLobby} attach="material" />
      </mesh>
    </group>
  );
}

function EnterpriseBuilding({
  building,
  facadeMaterial,
  glassMaterial,
  materials,
}: {
  building: LiveBuildingLayout;
  facadeMaterial: THREE.Material;
  glassMaterial: THREE.Material | null;
  materials: StaticMaterialSet;
}) {
  const {
    width: baseWidth,
    depth: baseDepth,
    height: totalHeight,
    seed,
  } = building.visual;
  const spec = useMemo(() => {
    const rng = rngAfterVisual(seed);
    const podiumHeight = 2.8 + rng() * 1.2;
    const podiumWidth = baseWidth + 1.2;
    const podiumDepth = baseDepth + 1.2;
    const remaining = Math.max(1, totalHeight - podiumHeight);
    const segmentHeight = remaining / 3;
    const segments = Array.from({ length: 3 }, (_, index) => {
      const scale = 0.86 ** index;
      return {
        index,
        width: baseWidth * 1.05 * scale,
        depth: baseDepth * 1.05 * scale,
        height: segmentHeight,
        y: podiumHeight + segmentHeight * index + segmentHeight / 2,
        topY: podiumHeight + segmentHeight * (index + 1),
      };
    });
    const finalScale = 0.86 ** 3;
    return {
      podiumHeight,
      podiumWidth,
      podiumDepth,
      segments,
      crownWidth: baseWidth * 1.05 * finalScale * 0.7,
      crownDepth: baseDepth * 1.05 * finalScale * 0.7,
      topY: podiumHeight + remaining,
    };
  }, [baseDepth, baseWidth, seed, totalHeight]);

  return (
    <group>
      <mesh position={[0, spec.podiumHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry
          args={[spec.podiumWidth, spec.podiumHeight, spec.podiumDepth]}
        />
        <primitive object={materials.enterprisePodium} attach="material" />
      </mesh>
      {glassMaterial && (
        <mesh position={[0, spec.podiumHeight * 0.45, 0]}>
          <boxGeometry
            args={[
              spec.podiumWidth * 1.005,
              spec.podiumHeight * 0.6,
              spec.podiumDepth * 1.005,
            ]}
          />
          <primitive object={glassMaterial} attach="material" />
        </mesh>
      )}
      {spec.segments.map((segment) => (
        <group key={segment.index}>
          <mesh position={[0, segment.y, 0]} castShadow receiveShadow>
            <boxGeometry
              args={[segment.width, segment.height, segment.depth]}
            />
            <primitive object={facadeMaterial} attach="material" />
          </mesh>
          {segment.index < spec.segments.length - 1 && (
            <mesh position={[0, segment.topY, 0]} castShadow receiveShadow>
              <boxGeometry
                args={[segment.width * 1.02, 0.2, segment.depth * 1.02]}
              />
              <primitive object={materials.enterpriseLedge} attach="material" />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[0, spec.topY + 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.crownWidth, 1.4, spec.crownDepth]} />
        <primitive object={materials.enterprisePodium} attach="material" />
      </mesh>
      <mesh position={[0, spec.topY + 1.4 + totalHeight * 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, totalHeight * 0.18, 6]} />
        <primitive object={materials.antenna} attach="material" />
      </mesh>
      <mesh position={[0, spec.topY + 1.4 + totalHeight * 0.18 + 0.18, 0]}>
        <sphereGeometry args={[0.22, 12, 8]} />
        <primitive object={materials.beacon} attach="material" />
      </mesh>
      <RooftopEquipment
        seed={seed}
        skipAfterVisual={1}
        width={spec.podiumWidth * 0.7}
        depth={spec.podiumDepth * 0.7}
        baseY={spec.podiumHeight}
        dense
        materials={materials}
      />
    </group>
  );
}

function Plinth({
  building,
  material,
}: {
  building: LiveBuildingLayout;
  material: THREE.Material;
}) {
  return (
    <mesh position={[0, 0.06, 0]} receiveShadow>
      <boxGeometry
        args={[building.visual.width + 0.5, 0.12, building.visual.depth + 0.5]}
      />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function PitchedRoof({
  width,
  depth,
  height,
  y,
  material,
}: {
  width: number;
  depth: number;
  height: number;
  y: number;
  material: THREE.Material;
}) {
  const geometry = useMemo(
    () => makePitchedRoofGeometry(width, depth, height),
    [depth, height, width],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, y, 0]}
      castShadow
      receiveShadow
    />
  );
}

function RooftopEquipment({
  seed,
  skipAfterVisual,
  width,
  depth,
  baseY,
  dense,
  materials,
}: {
  seed: number;
  skipAfterVisual: number;
  width: number;
  depth: number;
  baseY: number;
  dense: boolean;
  materials: StaticMaterialSet;
}) {
  const spec = useMemo(() => {
    const rng = rngAfterVisual(seed);
    for (let i = 0; i < skipAfterVisual; i++) rng();
    const count = dense ? 4 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 2);
    const boxes = Array.from({ length: count }, () => {
      const boxWidth = 0.4 + rng() * 0.6;
      const boxHeight = 0.3 + rng() * 0.4;
      const boxDepth = 0.4 + rng() * 0.6;
      return {
        width: boxWidth,
        height: boxHeight,
        depth: boxDepth,
        x: (rng() - 0.5) * width * 0.7,
        y: baseY + boxHeight / 2 + 0.05,
        z: (rng() - 0.5) * depth * 0.7,
      };
    });
    const vent =
      rng() > 0.5
        ? {
            x: (rng() - 0.5) * width * 0.5,
            z: (rng() - 0.5) * depth * 0.5,
          }
        : null;
    return { boxes, vent };
  }, [baseY, dense, depth, seed, skipAfterVisual, width]);

  return (
    <group>
      {spec.boxes.map((box, index) => (
        <mesh
          key={`equipment-${index}`}
          position={[box.x, box.y, box.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[box.width, box.height, box.depth]} />
          <primitive object={materials.equipment} attach="material" />
        </mesh>
      ))}
      {spec.vent && (
        <mesh
          position={[spec.vent.x, baseY + 0.4, spec.vent.z]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.08, 0.08, 0.7, 6]} />
          <primitive object={materials.duct} attach="material" />
        </mesh>
      )}
    </group>
  );
}

function SmallTree({
  spec,
  materials,
}: {
  spec: { x: number; z: number };
  materials: StaticMaterialSet;
}) {
  return (
    <group position={[spec.x, 0.16, spec.z]}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.5, 5]} />
        <primitive object={materials.treeTrunk} attach="material" />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.42, 0]} />
        <primitive object={materials.treeFoliage} attach="material" />
      </mesh>
    </group>
  );
}

function LiveBuildingClickTargets({
  buildings,
  onBuildingClick,
}: {
  buildings: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}) {
  const matrix = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
      }),
    [],
  );
  const mesh = useMemo(
    () => new THREE.InstancedMesh(geometry, material, buildings.length),
    [buildings.length, geometry, material],
  );

  useEffect(() => {
    buildings.forEach((building, index) => {
      const footprint = Math.max(
        building.visual.width + 1.4,
        building.visual.depth + 1.4,
        3.8,
      );
      matrix.position.set(
        building.x,
        Math.max(1.7, building.height / 2),
        building.z,
      );
      matrix.rotation.set(0, building.rotation, 0);
      matrix.scale.set(
        footprint,
        Math.max(3, building.height + 2.6),
        footprint,
      );
      matrix.updateMatrix();
      mesh.setMatrixAt(index, matrix.matrix);
    });
    mesh.count = buildings.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [buildings, matrix, mesh]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    };
  }, [geometry, material, mesh]);

  const handlePointer = (event: {
    instanceId?: number;
    stopPropagation: () => void;
  }) => {
    if (!onBuildingClick || event.instanceId == null) return;
    const building = buildings[event.instanceId];
    if (!building) return;
    event.stopPropagation();
    onBuildingClick(building);
  };

  return (
    <primitive
      object={mesh}
      frustumCulled={false}
      onClick={handlePointer}
      onPointerDown={handlePointer}
    />
  );
}

function rngAfterVisual(seed: number): () => number {
  const rng = createSeededRng(seed);
  rng();
  rng();
  rng();
  rng();
  return rng;
}

function makeTreeSpec(rng: () => number, width: number, depth: number) {
  if (rng() <= 0.4) return null;
  return {
    x: (rng() - 0.5) * width * 1.3,
    z: depth * 0.7 * (rng() < 0.5 ? 1 : -1),
  };
}

function makePitchedRoofGeometry(
  width: number,
  depth: number,
  height: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(-width / 2, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function makeFacadeTextures(
  tier: LiveCityTierKey,
  variant: number,
): FacadeTextures {
  const key = `${tier}:lowpoly:${variant}`;
  const cached = facadeTextureCache.get(key);
  if (cached) return cached;

  if (typeof document === 'undefined') {
    const empty = { map: null, emissiveMap: null };
    facadeTextureCache.set(key, empty);
    return empty;
  }

  const cfg = {
    free: {
      cols: 4,
      rows: 4,
      base: '#3d4a63',
      trim: '#2a3346',
      litColor: '#ffd089',
    },
    starter: {
      cols: 5,
      rows: 6,
      base: '#4d6d92',
      trim: '#33486a',
      litColor: '#ffe4a8',
    },
    pro: {
      cols: 7,
      rows: 10,
      base: '#475a72',
      trim: '#2c3a4d',
      litColor: '#7fd9ff',
    },
    business: {
      cols: 9,
      rows: 16,
      base: '#3d4863',
      trim: '#222a3d',
      litColor: '#a9d8ff',
    },
    founding: {
      cols: 10,
      rows: 20,
      base: '#3f4354',
      trim: '#25283a',
      litColor: '#ffd46b',
    },
  }[tier];

  const W = 256;
  const H = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = W;
  colorCanvas.height = H;
  const cx = colorCanvas.getContext('2d')!;

  cx.fillStyle = cfg.base;
  cx.fillRect(0, 0, W, H);

  cx.fillStyle = cfg.trim;
  const colW = W / cfg.cols;
  for (let i = 0; i <= cfg.cols; i++) {
    cx.fillRect(Math.round(i * colW) - 1, 0, 2, H);
  }
  const rowH = H / cfg.rows;
  for (let r = 0; r <= cfg.rows; r++) {
    cx.fillRect(0, Math.round(r * rowH) - 1, W, 2);
  }

  const padX = colW * 0.18;
  const padY = rowH * 0.22;
  for (let row = 0; row < cfg.rows; row++) {
    for (let col = 0; col < cfg.cols; col++) {
      const x = col * colW + padX;
      const y = row * rowH + padY;
      const width = colW - padX * 2;
      const height = rowH - padY * 2;
      cx.fillStyle = '#0a1220';
      cx.fillRect(x, y, width, height);
      cx.fillStyle = cfg.trim;
      cx.fillRect(x + width / 2 - 0.5, y, 1, height);
    }
  }

  const gy = (cfg.rows - 1) * rowH;
  cx.fillStyle = '#0e1726';
  cx.fillRect(0, gy + rowH * 0.2, W, rowH * 0.7);
  cx.fillStyle = '#1a232f';
  cx.fillRect(W * 0.45, gy + rowH * 0.25, W * 0.1, rowH * 0.7);

  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping;
  colorTexture.anisotropy = 4;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = W;
  emissiveCanvas.height = H;
  const ex = emissiveCanvas.getContext('2d')!;
  ex.fillStyle = '#000000';
  ex.fillRect(0, 0, W, H);
  const litRng = createSeededRng(variant * 977 + tier.length * 131);
  const litChance = {
    free: 0.25,
    starter: 0.32,
    pro: 0.45,
    business: 0.55,
    founding: 0.62,
  }[tier];
  for (let row = 0; row < cfg.rows; row++) {
    for (let col = 0; col < cfg.cols; col++) {
      if (litRng() > litChance) continue;
      const flicker = 0.75 + litRng() * 0.25;
      const baseColor = new THREE.Color(cfg.litColor).multiplyScalar(flicker);
      const x = col * colW + padX;
      const y = row * rowH + padY;
      const width = colW - padX * 2;
      const height = rowH - padY * 2;
      ex.fillStyle = `#${baseColor.getHexString()}`;
      ex.fillRect(x, y, width, height);
    }
  }
  if (litRng() > 0.4) {
    ex.fillStyle = '#fff2c8';
    ex.fillRect(0, gy + rowH * 0.2, W, rowH * 0.7);
    ex.fillStyle = '#000000';
    ex.fillRect(W * 0.45, gy + rowH * 0.25, W * 0.1, rowH * 0.7);
  }

  const emissiveTexture = new THREE.CanvasTexture(emissiveCanvas);
  emissiveTexture.wrapS = emissiveTexture.wrapT = THREE.RepeatWrapping;
  emissiveTexture.anisotropy = 4;

  const result = { map: colorTexture, emissiveMap: emissiveTexture };
  facadeTextureCache.set(key, result);
  return result;
}

function getStaticMaterials(): StaticMaterialSet {
  if (staticMaterials) return staticMaterials;
  staticMaterials = {
    freeRoof: new THREE.MeshLambertMaterial({
      color: 0x6b3c2e,
      flatShading: true,
    }),
    freeChimney: new THREE.MeshLambertMaterial({ color: 0x4a3a30 }),
    starterRoof: new THREE.MeshLambertMaterial({
      color: 0x5a4030,
      flatShading: true,
    }),
    starterParapet: new THREE.MeshLambertMaterial({ color: 0x2a3346 }),
    starterTank: new THREE.MeshLambertMaterial({ color: 0x6b6e7a }),
    proLobby: new THREE.MeshLambertMaterial({ color: 0x1a2030 }),
    enterprisePodium: new THREE.MeshLambertMaterial({ color: 0x222a3d }),
    enterpriseLedge: new THREE.MeshLambertMaterial({ color: 0x1a2030 }),
    antenna: new THREE.MeshLambertMaterial({ color: 0x666e80 }),
    beacon: new THREE.MeshBasicMaterial({ color: 0xff5050 }),
    plinth: new THREE.MeshLambertMaterial({ color: 0x6b6f78 }),
    equipment: new THREE.MeshLambertMaterial({ color: 0x4a525e }),
    duct: new THREE.MeshLambertMaterial({ color: 0x2e3340 }),
    treeTrunk: new THREE.MeshLambertMaterial({ color: 0x4a3624 }),
    treeFoliage: new THREE.MeshLambertMaterial({
      color: 0x4d7d44,
      flatShading: true,
    }),
  };
  return staticMaterials;
}
