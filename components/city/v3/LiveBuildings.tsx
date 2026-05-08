'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { LiveBuildingLayout } from './liveLayout';

interface Props {
  buildings: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}

type BuildingTierVisual = 'free' | 'starter' | 'pro' | 'enterprise';

interface TierVisualConfig {
  key: BuildingTierVisual;
  facade: string;
  trim: string;
  roof: string;
  window: string;
  emissive: string;
  footprint: [number, number];
}

const TIER_VISUALS: TierVisualConfig[] = [
  {
    key: 'free',
    facade: '#62728b',
    trim: '#283246',
    roof: '#273040',
    window: '#ffd089',
    emissive: '#ffd089',
    footprint: [3.35, 3.25],
  },
  {
    key: 'starter',
    facade: '#6287aa',
    trim: '#31496a',
    roof: '#2d3949',
    window: '#ffe4a8',
    emissive: '#ffe4a8',
    footprint: [4.25, 4.05],
  },
  {
    key: 'pro',
    facade: '#5a728b',
    trim: '#314054',
    roof: '#253244',
    window: '#7fd9ff',
    emissive: '#74d5ff',
    footprint: [5.05, 5.75],
  },
  {
    key: 'enterprise',
    facade: '#4f5f79',
    trim: '#252f45',
    roof: '#1e2739',
    window: '#a9d8ff',
    emissive: '#92ceff',
    footprint: [6.15, 6.15],
  },
];

interface FacadeTextures {
  colorMap: THREE.Texture | null;
  emissiveMap: THREE.Texture | null;
}

const facadeTextureCache = new Map<string, FacadeTextures>();

export function LiveBuildings({ buildings, onBuildingClick }: Props) {
  return (
    <group>
      {buildings.map((building) => (
        <LiveProceduralBuilding
          key={building.ownerKey}
          building={building}
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

function LiveProceduralBuilding({
  building,
  onBuildingClick,
}: {
  building: LiveBuildingLayout;
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}) {
  const visual = tierVisualFor(building.tier);
  const variant = Math.floor(hashStr(`${building.ownerKey}:building-style`) * 4);
  const baseHeight = Math.max(2.1, building.height);
  const widthBoost =
    1 + Math.min(0.16, Math.log2(building.agentCount + 1) * 0.034);
  const footprint = {
    w: visual.footprint[0] * widthBoost,
    d: visual.footprint[1] * widthBoost,
  };

  const textures = useMemo(
    () => getFacadeTextures(visual, variant),
    [visual, variant],
  );
  const facadeMaterial = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: '#ffffff',
        map: textures.colorMap,
        emissive: new THREE.Color(visual.emissive),
        emissiveMap: textures.emissiveMap,
        emissiveIntensity: building.status === 'running' ? 0.34 : 0.16,
      }),
    [building.status, textures, visual],
  );
  const trimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: visual.trim,
        roughness: 0.78,
        metalness: 0.08,
      }),
    [visual],
  );
  const roofMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: visual.roof,
        roughness: 0.82,
        metalness: 0.05,
      }),
    [visual],
  );
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: visual.window,
        emissive: new THREE.Color(visual.window),
        emissiveIntensity: building.status === 'running' ? 0.42 : 0.18,
        roughness: 0.28,
        metalness: 0.12,
        transparent: true,
        opacity: 0.72,
      }),
    [building.status, visual],
  );

  useEffect(() => {
    return () => {
      facadeMaterial.dispose();
      trimMaterial.dispose();
      roofMaterial.dispose();
      glassMaterial.dispose();
    };
  }, [facadeMaterial, glassMaterial, roofMaterial, trimMaterial]);

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
      {visual.key === 'free' ? (
        <FreeBuilding
          building={building}
          height={Math.min(4.2, baseHeight)}
          width={footprint.w}
          depth={footprint.d}
          facadeMaterial={facadeMaterial}
          trimMaterial={trimMaterial}
          roofMaterial={roofMaterial}
        />
      ) : visual.key === 'starter' ? (
        <StarterBuilding
          building={building}
          height={Math.min(6.2, Math.max(3.2, baseHeight))}
          width={footprint.w}
          depth={footprint.d}
          facadeMaterial={facadeMaterial}
          trimMaterial={trimMaterial}
          roofMaterial={roofMaterial}
          glassMaterial={glassMaterial}
        />
      ) : visual.key === 'pro' ? (
        <ProBuilding
          building={building}
          height={Math.min(13.2, Math.max(6.2, baseHeight))}
          width={footprint.w}
          depth={footprint.d}
          facadeMaterial={facadeMaterial}
          trimMaterial={trimMaterial}
          roofMaterial={roofMaterial}
          glassMaterial={glassMaterial}
        />
      ) : (
        <EnterpriseBuilding
          building={building}
          height={Math.min(28, Math.max(13, baseHeight))}
          width={footprint.w}
          depth={footprint.d}
          facadeMaterial={facadeMaterial}
          trimMaterial={trimMaterial}
          roofMaterial={roofMaterial}
          glassMaterial={glassMaterial}
        />
      )}
    </group>
  );
}

function FreeBuilding({
  building,
  height,
  width,
  depth,
  facadeMaterial,
  trimMaterial,
  roofMaterial,
}: BuildingPartProps) {
  const wallHeight = height * 0.72;
  const roofGeometry = useMemo(
    () => makePitchedRoofGeometry(width * 1.14, depth * 1.16, height * 0.32),
    [depth, height, width],
  );

  useEffect(() => () => roofGeometry.dispose(), [roofGeometry]);

  return (
    <group>
      <mesh position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, wallHeight, depth]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <mesh
        geometry={roofGeometry}
        material={roofMaterial}
        position={[0, wallHeight, 0]}
        rotation={[0, (building.rank % 2) * Math.PI * 0.5, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        position={[
          width * 0.24,
          wallHeight + height * 0.18,
          -depth * 0.18,
        ]}
        castShadow
      >
        <boxGeometry args={[0.32, height * 0.28, 0.32]} />
        <primitive object={trimMaterial} attach="material" />
      </mesh>
      <SmallAwning
        width={width * 0.54}
        depth={0.42}
        y={wallHeight * 0.36}
        z={depth / 2 + 0.04}
        material={trimMaterial}
      />
    </group>
  );
}

function StarterBuilding({
  building,
  height,
  width,
  depth,
  facadeMaterial,
  trimMaterial,
  roofMaterial,
  glassMaterial,
}: BuildingPartProps) {
  const hasPitchedRoof = hashStr(`${building.ownerKey}:roof`) > 0.42;
  const roofGeometry = useMemo(
    () => makePitchedRoofGeometry(width * 1.1, depth * 1.1, height * 0.22),
    [depth, height, width],
  );

  useEffect(() => () => roofGeometry.dispose(), [roofGeometry]);

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <mesh position={[0, height + 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 1.08, 0.18, depth * 1.08]} />
        <primitive object={trimMaterial} attach="material" />
      </mesh>
      {hasPitchedRoof ? (
        <mesh
          geometry={roofGeometry}
          material={roofMaterial}
          position={[0, height + 0.08, 0]}
          rotation={[0, (building.rank % 2) * Math.PI * 0.5, 0]}
          castShadow
          receiveShadow
        />
      ) : (
        <RooftopEquipment
          height={height}
          width={width}
          depth={depth}
          trimMaterial={trimMaterial}
          roofMaterial={roofMaterial}
        />
      )}
      <GlassLobby
        width={width * 0.74}
        height={Math.min(1.3, height * 0.25)}
        z={depth / 2 + 0.035}
        material={glassMaterial}
      />
    </group>
  );
}

function ProBuilding({
  height,
  width,
  depth,
  facadeMaterial,
  trimMaterial,
  roofMaterial,
  glassMaterial,
}: BuildingPartProps) {
  const baseHeight = height * 0.54;
  const topHeight = height * 0.42;

  return (
    <group>
      <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, baseHeight, depth]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <mesh
        position={[0, baseHeight + topHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.78, topHeight, depth * 0.72]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.18, depth / 2 + 0.04]}>
        <boxGeometry args={[width * 0.9, 0.72, 0.08]} />
        <primitive object={glassMaterial!} attach="material" />
      </mesh>
      <mesh position={[0, baseHeight + 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.92, 0.22, depth * 0.86]} />
        <primitive object={trimMaterial} attach="material" />
      </mesh>
      <RooftopEquipment
        height={height}
        width={width * 0.78}
        depth={depth * 0.72}
        trimMaterial={trimMaterial}
        roofMaterial={roofMaterial}
      />
    </group>
  );
}

function EnterpriseBuilding({
  height,
  width,
  depth,
  facadeMaterial,
  trimMaterial,
  roofMaterial,
  glassMaterial,
}: BuildingPartProps) {
  const podium = Math.min(4.2, height * 0.22);
  const segmentHeight = (height - podium) / 3;

  return (
    <group>
      <mesh position={[0, podium / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 1.12, podium, depth * 1.12]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      {[0, 1, 2].map((segment) => {
        const scale = 1 - segment * 0.12;
        const y = podium + segmentHeight * segment + segmentHeight / 2;
        return (
          <group key={segment}>
            <mesh position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry
                args={[width * scale, segmentHeight * 0.96, depth * scale]}
              />
              <primitive object={facadeMaterial} attach="material" />
            </mesh>
            <mesh
              position={[0, y + segmentHeight * 0.3, depth * scale * 0.5 + 0.045]}
            >
              <boxGeometry args={[width * scale * 0.72, 0.5, 0.08]} />
              <primitive object={glassMaterial!} attach="material" />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, height + 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.56, 0.42, depth * 0.56]} />
        <primitive object={roofMaterial} attach="material" />
      </mesh>
      <mesh position={[0, height + 1.45, 0]} castShadow>
        <boxGeometry args={[0.16, 2.55, 0.16]} />
        <primitive object={trimMaterial} attach="material" />
      </mesh>
    </group>
  );
}

interface BuildingPartProps {
  building: LiveBuildingLayout;
  height: number;
  width: number;
  depth: number;
  facadeMaterial: THREE.Material;
  trimMaterial: THREE.Material;
  roofMaterial: THREE.Material;
  glassMaterial?: THREE.Material;
}

function SmallAwning({
  width,
  depth,
  y,
  z,
  material,
}: {
  width: number;
  depth: number;
  y: number;
  z: number;
  material: THREE.Material;
}) {
  return (
    <mesh position={[0, y, z]} castShadow receiveShadow>
      <boxGeometry args={[width, 0.12, depth]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function GlassLobby({
  width,
  height,
  z,
  material,
}: {
  width: number;
  height: number;
  z: number;
  material?: THREE.Material;
}) {
  if (!material) return null;
  return (
    <mesh position={[0, height * 0.6, z]}>
      <boxGeometry args={[width, height, 0.08]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function RooftopEquipment({
  height,
  width,
  depth,
  trimMaterial,
  roofMaterial,
}: {
  height: number;
  width: number;
  depth: number;
  trimMaterial: THREE.Material;
  roofMaterial: THREE.Material;
}) {
  return (
    <group>
      <mesh position={[-width * 0.2, height + 0.32, depth * 0.12]} castShadow>
        <boxGeometry args={[width * 0.26, 0.48, depth * 0.2]} />
        <primitive object={trimMaterial} attach="material" />
      </mesh>
      <mesh position={[width * 0.22, height + 0.26, -depth * 0.16]} castShadow>
        <boxGeometry args={[width * 0.18, 0.36, depth * 0.22]} />
        <primitive object={roofMaterial} attach="material" />
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
      const visual = tierVisualFor(building.tier);
      const footprint =
        Math.max(visual.footprint[0], visual.footprint[1]) +
        Math.min(2.2, Math.log2(building.agentCount + 1) * 0.32);
      matrix.position.set(
        building.x,
        Math.max(1.7, building.height / 2),
        building.z,
      );
      matrix.rotation.set(0, building.rotation, 0);
      matrix.scale.set(footprint, Math.max(4, building.height + 1.8), footprint);
      matrix.updateMatrix();
      mesh.setMatrixAt(index, matrix.matrix);
    });
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

function tierVisualFor(tier: number): TierVisualConfig {
  if (tier <= 0) return TIER_VISUALS[0]!;
  if (tier === 1) return TIER_VISUALS[1]!;
  if (tier === 2) return TIER_VISUALS[2]!;
  return TIER_VISUALS[3]!;
}

function getFacadeTextures(
  visual: TierVisualConfig,
  variant: number,
): FacadeTextures {
  const key = `${visual.key}:${variant}`;
  const cached = facadeTextureCache.get(key);
  if (cached) return cached;

  if (typeof document === 'undefined') {
    const empty = { colorMap: null, emissiveMap: null };
    facadeTextureCache.set(key, empty);
    return empty;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = visual.facade;
  ctx.fillRect(0, 0, 256, 256);

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = 256;
  emissiveCanvas.height = 256;
  const emissiveCtx = emissiveCanvas.getContext('2d')!;
  emissiveCtx.fillStyle = '#000000';
  emissiveCtx.fillRect(0, 0, 256, 256);

  const columns = visual.key === 'free' ? 3 : visual.key === 'starter' ? 4 : 6;
  const rows =
    visual.key === 'free' ? 3 : visual.key === 'starter' ? 5 : visual.key === 'pro' ? 9 : 14;
  const padX = visual.key === 'free' ? 26 : 18;
  const padY = visual.key === 'free' ? 26 : 16;
  const gapX = (256 - padX * 2) / columns;
  const gapY = (256 - padY * 2) / rows;
  const litChance =
    visual.key === 'free'
      ? 0.26
      : visual.key === 'starter'
        ? 0.34
        : visual.key === 'pro'
          ? 0.46
          : 0.54;

  ctx.fillStyle = subtleShade(visual.facade, -0.13);
  for (let y = 8; y < 256; y += 24) {
    ctx.fillRect(0, y, 256, 1);
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const r = hashStr(`${visual.key}:${variant}:${row}:${col}`);
      const lit = r < litChance;
      const w = Math.max(9, gapX * 0.44);
      const h = Math.max(10, gapY * 0.34);
      const x = padX + col * gapX + (gapX - w) / 2;
      const y = padY + row * gapY + (gapY - h) / 2;
      ctx.fillStyle = lit ? visual.window : subtleShade(visual.facade, 0.18);
      ctx.globalAlpha = lit ? 0.92 : 0.58;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = subtleShade(visual.facade, -0.24);
      ctx.fillRect(x, y + h + 1, w, 1);

      if (lit) {
        emissiveCtx.fillStyle = visual.emissive;
        emissiveCtx.globalAlpha = 0.86;
        emissiveCtx.fillRect(x, y, w, h);
        emissiveCtx.globalAlpha = 1;
      }
    }
  }

  const colorMap = new THREE.CanvasTexture(canvas);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(1, visual.key === 'enterprise' ? 2.4 : visual.key === 'pro' ? 1.7 : 1);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.needsUpdate = true;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;
  emissiveMap.repeat.copy(colorMap.repeat);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.needsUpdate = true;

  const textures = { colorMap, emissiveMap };
  facadeTextureCache.set(key, textures);
  return textures;
}

function makePitchedRoofGeometry(
  width: number,
  depth: number,
  height: number,
): THREE.BufferGeometry {
  const hw = width / 2;
  const hd = depth / 2;
  const vertices = new Float32Array([
    -hw,
    0,
    -hd,
    hw,
    0,
    -hd,
    0,
    height,
    -hd,
    -hw,
    0,
    hd,
    hw,
    0,
    hd,
    0,
    height,
    hd,
  ]);
  const indices = [
    0,
    1,
    2,
    3,
    5,
    4,
    0,
    3,
    4,
    0,
    4,
    1,
    1,
    4,
    5,
    1,
    5,
    2,
    2,
    5,
    3,
    2,
    3,
    0,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function subtleShade(hex: string, amount: number) {
  const color = new THREE.Color(hex);
  if (amount >= 0) color.lerp(new THREE.Color('#ffffff'), amount);
  else color.lerp(new THREE.Color('#000000'), Math.abs(amount));
  return `#${color.getHexString()}`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}
