'use client';
import { useEffect, useMemo, useRef } from 'react';
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
  freeShell: THREE.MeshLambertMaterial;
  freeTrim: THREE.MeshLambertMaterial;
  starterShell: THREE.MeshLambertMaterial;
  starterParapet: THREE.MeshLambertMaterial;
  starterTank: THREE.MeshLambertMaterial;
  proLobby: THREE.MeshLambertMaterial;
  enterprisePodium: THREE.MeshLambertMaterial;
  enterpriseLedge: THREE.MeshLambertMaterial;
  ivoryShell: THREE.MeshLambertMaterial;
  graphiteShell: THREE.MeshLambertMaterial;
  warmGold: THREE.MeshLambertMaterial;
  cyanGlass: THREE.MeshLambertMaterial;
  cyanLine: THREE.MeshBasicMaterial;
  darkPanel: THREE.MeshLambertMaterial;
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

// Every building renders as a full multi-mesh house/tower. (A distance LOD that
// collapsed far buildings into one grey instanced box layer was removed — it
// made the city read as flat grey boxes, and at current city size the full
// render is cheap enough.)
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
      ) : building.visual.tierKey === 'business' ? (
        <EnterpriseBuilding
          building={building}
          facadeMaterial={facadeMaterial}
          glassMaterial={glassMaterial}
          materials={materials}
        />
      ) : (
        <FoundingBuilding
          building={building}
          facadeMaterial={facadeMaterial}
          glassMaterial={glassMaterial}
          materials={materials}
        />
      )}
      <TierMarker building={building} materials={materials} />
      <Plinth building={building} materials={materials} />
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
    const shellH = 0.72 + rng() * 0.18;
    const signalNode = makeSignalNodeSpec(rng, width, depth);
    return {
      shellH,
      signalNode,
      doorOffset: (rng() - 0.5) * width * 0.18,
    };
  }, [depth, seed, width]);

  if (building.visual.variant % 3 === 1) {
    return (
      <FreeStudioBuilding
        building={building}
        facadeMaterial={facadeMaterial}
        materials={materials}
        signalNode={spec.signalNode}
      />
    );
  }

  if (building.visual.variant % 3 === 2) {
    return (
      <FreeTwinCapsuleBuilding
        building={building}
        materials={materials}
        signalNode={spec.signalNode}
      />
    );
  }

  return (
    <group>
      <mesh position={[0, height * 0.38, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[width * 0.48, width * 0.56, height * 0.76, 28]} />
        <primitive object={materials.ivoryShell} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.82, 0]} scale={[width * 0.58, spec.shellH, depth * 0.58]} castShadow receiveShadow>
        <sphereGeometry args={[1, 28, 14]} />
        <primitive object={materials.freeShell} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.98, depth * 0.12]} scale={[width * 0.3, 0.22, 0.08]} castShadow>
        <sphereGeometry args={[1, 18, 10]} />
        <primitive object={materials.cyanGlass} attach="material" />
      </mesh>
      <mesh position={[spec.doorOffset, height * 0.34, depth * 0.52]} castShadow>
        <boxGeometry args={[width * 0.22, height * 0.38, 0.06]} />
        <primitive object={materials.darkPanel} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[Math.max(width, depth) * 0.45, 0.045, 8, 48]} />
        <primitive object={materials.freeTrim} attach="material" />
      </mesh>
      <HatchPodPetals
        width={width}
        depth={depth}
        height={height}
        materials={materials}
        scale={0.72}
      />
      {spec.signalNode && <SignalNode spec={spec.signalNode} materials={materials} />}
    </group>
  );
}

function FreeStudioBuilding({
  building,
  facadeMaterial,
  materials,
  signalNode,
}: {
  building: LiveBuildingLayout;
  facadeMaterial: THREE.Material;
  materials: StaticMaterialSet;
  signalNode: { x: number; z: number } | null;
}) {
  const { width, depth, height } = building.visual;
  return (
    <group>
      <mesh position={[0, height * 0.43, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.98, height * 0.86, depth * 0.92]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 1.12, height * 0.22, depth * 1.06]} />
        <primitive object={materials.ivoryShell} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.5, depth * 0.48]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.42, height * 0.36, 0.055]} />
        <primitive object={materials.darkPanel} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.52, depth * 0.515]}>
        <boxGeometry args={[width * 0.26, height * 0.06, 0.035]} />
        <primitive object={materials.cyanLine} attach="material" />
      </mesh>
      <mesh position={[0, height + 0.22, 0]} scale={[width * 0.36, 0.28, depth * 0.28]} castShadow receiveShadow>
        <sphereGeometry args={[1, 18, 10]} />
        <primitive object={materials.cyanGlass} attach="material" />
      </mesh>
      {signalNode && <SignalNode spec={signalNode} materials={materials} />}
    </group>
  );
}

function FreeTwinCapsuleBuilding({
  building,
  materials,
  signalNode,
}: {
  building: LiveBuildingLayout;
  materials: StaticMaterialSet;
  signalNode: { x: number; z: number } | null;
}) {
  const { width, depth, height } = building.visual;
  return (
    <group>
      <mesh position={[0, height * 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 1.18, height * 0.32, depth * 0.82]} />
        <primitive object={materials.graphiteShell} attach="material" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * width * 0.28, 0, 0]}>
          <mesh position={[0, height * 0.52, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[width * 0.24, width * 0.28, height * 0.62, 22]} />
            <primitive object={materials.ivoryShell} attach="material" />
          </mesh>
          <mesh position={[0, height * 0.86, 0]} scale={[width * 0.29, 0.32, depth * 0.29]} castShadow receiveShadow>
            <sphereGeometry args={[1, 18, 10]} />
            <primitive object={materials.freeShell} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, height * 0.48, depth * 0.38]}>
        <boxGeometry args={[width * 0.34, height * 0.09, 0.04]} />
        <primitive object={materials.cyanLine} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[Math.max(width, depth) * 0.44, 0.025, 8, 44]} />
        <primitive object={materials.cyanLine} attach="material" />
      </mesh>
      {signalNode && <SignalNode spec={signalNode} materials={materials} />}
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
    const signalNode = makeSignalNodeSpec(rng, width, depth);
    return {
      signalNode,
      baseH: height * 0.48,
      labH: height * 0.56,
      atriumOffset: (rng() - 0.5) * width * 0.12,
    };
  }, [depth, height, seed, width]);

  return (
    <group>
      <mesh position={[0, spec.baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 1.18, spec.baseH, depth * 1.04]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <mesh position={[0, spec.baseH + 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 1.26, 0.22, depth * 1.12]} />
        <primitive object={materials.starterParapet} attach="material" />
      </mesh>
      <mesh position={[spec.atriumOffset, spec.baseH + spec.labH * 0.42, depth * 0.08]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.72, spec.labH * 0.84, depth * 0.52]} />
        <primitive object={materials.ivoryShell} attach="material" />
      </mesh>
      <mesh position={[spec.atriumOffset, spec.baseH + spec.labH * 0.92, depth * 0.08]} scale={[width * 0.48, 0.34, depth * 0.32]} castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 12]} />
        <primitive object={materials.starterShell} attach="material" />
      </mesh>
      <mesh position={[0, spec.baseH * 0.62, depth * 0.54]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.54, spec.baseH * 0.5, 0.08]} />
        <primitive object={materials.darkPanel} attach="material" />
      </mesh>
      <mesh position={[0, spec.baseH * 0.68, depth * 0.59]}>
        <boxGeometry args={[width * 0.36, spec.baseH * 0.08, 0.035]} />
        <primitive object={materials.cyanLine} attach="material" />
      </mesh>
      <StarterSideModules width={width} depth={depth} height={height} materials={materials} />
      <StarterAtriumPods width={width} depth={depth} height={height} materials={materials} />
      <CornerPylons width={width * 1.06} depth={depth * 0.98} height={height * 0.74} materials={materials} />
      {spec.signalNode && <SignalNode spec={spec.signalNode} materials={materials} />}
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
    const baseHeight = Math.max(1.2, totalHeight * 0.22);
    const shaftHeight = Math.max(2.2, totalHeight * 0.62);
    const deckY = baseHeight + shaftHeight + 0.12;
    return {
      width,
      depth,
      baseHeight,
      shaftHeight,
      deckY,
      shaftRadius: Math.min(width, depth) * 0.27,
      deckRadius: Math.min(width, depth) * 0.52,
      antennaX: (rng() - 0.5) * width * 0.34,
      antennaZ: (rng() - 0.5) * depth * 0.34,
    };
  }, [baseDepth, baseWidth, seed, totalHeight]);

  return (
    <group>
      <mesh position={[0, spec.baseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.width * 1.16, spec.baseHeight, spec.depth * 1.16]} />
        <primitive object={materials.proLobby} attach="material" />
      </mesh>
      <mesh position={[0, spec.baseHeight + spec.shaftHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[spec.shaftRadius * 0.82, spec.shaftRadius, spec.shaftHeight, 8]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <mesh position={[0, spec.baseHeight + spec.shaftHeight * 0.52, spec.shaftRadius * 0.86]}>
        <boxGeometry args={[spec.shaftRadius * 0.92, spec.shaftHeight * 0.76, 0.055]} />
        <primitive object={materials.cyanGlass} attach="material" />
      </mesh>
      <mesh position={[0, spec.deckY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[spec.deckRadius, spec.deckRadius * 0.92, 0.32, 8]} />
        <primitive object={materials.warmGold} attach="material" />
      </mesh>
      <mesh position={[0, spec.deckY + 0.28, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[spec.deckRadius * 0.72, spec.deckRadius * 0.78, 0.5, 8]} />
        <primitive object={materials.graphiteShell} attach="material" />
      </mesh>
      <mesh position={[0, spec.deckY + 0.68, 0]} scale={[spec.deckRadius * 0.52, 0.34, spec.deckRadius * 0.52]} castShadow receiveShadow>
        <sphereGeometry args={[1, 20, 10]} />
        <primitive object={materials.ivoryShell} attach="material" />
      </mesh>
      <mesh position={[0, spec.deckY + 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[spec.deckRadius * 0.9, 0.04, 8, 48]} />
        <primitive object={materials.cyanLine} attach="material" />
      </mesh>
      <ControlTowerFins
        width={spec.width * 0.92}
        depth={spec.depth * 0.92}
        baseY={spec.baseHeight}
        height={spec.shaftHeight}
        materials={materials}
      />
      <RooftopEquipment
        seed={seed}
        skipAfterVisual={1}
        width={spec.width}
        depth={spec.depth}
        baseY={spec.baseHeight}
        dense={false}
        materials={materials}
      />
      <mesh position={[spec.antennaX, spec.deckY + 1.55, spec.antennaZ]} castShadow>
        <cylinderGeometry args={[0.035, 0.06, 1.55, 7]} />
        <primitive object={materials.antenna} attach="material" />
      </mesh>
      <mesh position={[spec.antennaX, spec.deckY + 2.38, spec.antennaZ]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <primitive object={materials.beacon} attach="material" />
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
    const podiumHeight = 1.9 + rng() * 0.5;
    const podiumWidth = baseWidth + 1.55;
    const podiumDepth = baseDepth + 1.55;
    const towerHeight = Math.max(2.8, totalHeight - podiumHeight - 0.9);
    const coreWidth = baseWidth * 0.54;
    const coreDepth = baseDepth * 0.54;
    const towerSpecs = [
      { x: -0.34, z: -0.32, scale: 0.74 },
      { x: 0.34, z: -0.3, scale: 0.84 },
      { x: -0.32, z: 0.34, scale: 0.66 },
      { x: 0.32, z: 0.34, scale: 0.7 },
    ];
    return {
      podiumHeight,
      podiumWidth,
      podiumDepth,
      towerHeight,
      coreWidth,
      coreDepth,
      towerSpecs,
      topY: podiumHeight + towerHeight,
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
      <mesh position={[0, spec.podiumHeight + 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.podiumWidth * 1.04, 0.16, spec.podiumDepth * 1.04]} />
        <primitive object={materials.warmGold} attach="material" />
      </mesh>
      {glassMaterial && (
        <mesh position={[0, spec.podiumHeight * 0.52, 0]}>
          <boxGeometry
            args={[
              spec.podiumWidth * 0.72,
              spec.podiumHeight * 0.64,
              spec.podiumDepth * 0.72,
            ]}
          />
          <primitive object={glassMaterial} attach="material" />
        </mesh>
      )}
      <CampusSatellites
        width={spec.podiumWidth}
        depth={spec.podiumDepth}
        y={spec.podiumHeight + 0.38}
        materials={materials}
      />
      <mesh position={[0, spec.podiumHeight + spec.towerHeight * 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.coreWidth, spec.towerHeight * 0.92, spec.coreDepth]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      <mesh position={[0, spec.podiumHeight + spec.towerHeight * 0.94, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.coreWidth * 1.16, 0.26, spec.coreDepth * 1.16]} />
        <primitive object={materials.warmGold} attach="material" />
      </mesh>
      {spec.towerSpecs.map((tower, index) => {
        const towerH = spec.towerHeight * tower.scale;
        return (
          <group
            key={index}
            position={[
              tower.x * spec.podiumWidth,
              spec.podiumHeight + towerH / 2,
              tower.z * spec.podiumDepth,
            ]}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[baseWidth * 0.26, towerH, baseDepth * 0.26]} />
              <primitive object={facadeMaterial} attach="material" />
            </mesh>
            <mesh position={[0, towerH / 2 + 0.18, 0]} castShadow receiveShadow>
              <boxGeometry args={[baseWidth * 0.34, 0.18, baseDepth * 0.34]} />
              <primitive object={materials.enterpriseLedge} attach="material" />
            </mesh>
            {glassMaterial && (
              <mesh position={[0, 0, baseDepth * 0.135]}>
                <boxGeometry args={[baseWidth * 0.14, towerH * 0.72, 0.04]} />
                <primitive object={glassMaterial} attach="material" />
              </mesh>
            )}
          </group>
        );
      })}
      {[
        [0, -0.48],
        [0.48, 0],
        [0, 0.48],
        [-0.48, 0],
      ].map(([x, z], index) => (
        <mesh
          key={`bridge-${index}`}
          position={[
            x * spec.podiumWidth * 0.5,
            spec.podiumHeight + spec.towerHeight * 0.36,
            z * spec.podiumDepth * 0.5,
          ]}
          rotation={[0, index % 2 ? Math.PI / 2 : 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[spec.podiumWidth * 0.42, 0.16, 0.16]} />
          <primitive object={materials.enterpriseLedge} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, spec.topY + 0.42, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[spec.coreWidth * 0.42, spec.coreWidth * 0.52, 0.84, 8]} />
        <primitive object={materials.enterprisePodium} attach="material" />
      </mesh>
      <mesh position={[0, spec.topY + 0.94, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[spec.coreWidth * 0.48, 0.035, 8, 44]} />
        <primitive object={materials.cyanLine} attach="material" />
      </mesh>
      <mesh position={[0, spec.topY + 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.09, 1.34, 6]} />
        <primitive object={materials.antenna} attach="material" />
      </mesh>
      <mesh position={[0, spec.topY + 2.42, 0]}>
        <sphereGeometry args={[0.2, 12, 8]} />
        <primitive object={materials.beacon} attach="material" />
      </mesh>
      <RooftopEquipment
        seed={seed}
        skipAfterVisual={1}
        width={spec.podiumWidth * 0.78}
        depth={spec.podiumDepth * 0.78}
        baseY={spec.podiumHeight}
        dense
        materials={materials}
      />
    </group>
  );
}

function FoundingBuilding({
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
  const { width, depth, height, seed } = building.visual;
  const spec = useMemo(() => {
    const rng = rngAfterVisual(seed);
    const baseHeight = height * 0.18;
    const shaftHeight = height * 0.72;
    return {
      baseHeight,
      shaftHeight,
      spireHeight: height * 0.26,
      finOffset: width * (0.6 + rng() * 0.08),
    };
  }, [height, seed, width]);

  return (
    <group>
      <mesh position={[0, spec.baseHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[width * 0.64, width * 0.78, spec.baseHeight, 8]} />
        <primitive object={materials.enterprisePodium} attach="material" />
      </mesh>
      <mesh position={[0, spec.baseHeight + spec.shaftHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[width * 0.24, width * 0.36, spec.shaftHeight, 8]} />
        <primitive object={facadeMaterial} attach="material" />
      </mesh>
      {glassMaterial && (
        <mesh position={[0, spec.baseHeight + spec.shaftHeight / 2, depth * 0.18]}>
          <boxGeometry args={[width * 0.18, spec.shaftHeight * 0.82, 0.05]} />
          <primitive object={glassMaterial} attach="material" />
        </mesh>
      )}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rotation, index) => (
        <mesh
          key={index}
          position={[
            Math.sin(rotation) * spec.finOffset * 0.28,
            spec.baseHeight + spec.shaftHeight * 0.38,
            Math.cos(rotation) * spec.finOffset * 0.28,
          ]}
          rotation={[0, rotation, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.12, spec.shaftHeight * 0.78, spec.finOffset]} />
          <primitive object={materials.ivoryShell} attach="material" />
        </mesh>
      ))}
      <FoundingBasePavilions width={width} depth={depth} y={spec.baseHeight + 0.12} materials={materials} />
      <mesh position={[0, spec.baseHeight + spec.shaftHeight + spec.spireHeight / 2, 0]} castShadow>
        <coneGeometry args={[width * 0.2, spec.spireHeight, 8]} />
        <primitive object={materials.warmGold} attach="material" />
      </mesh>
      <mesh position={[0, spec.baseHeight + spec.shaftHeight + spec.spireHeight + 0.3, 0]}>
        <sphereGeometry args={[0.2, 12, 8]} />
        <primitive object={materials.beacon} attach="material" />
      </mesh>
      <RooftopEquipment
        seed={seed}
        skipAfterVisual={2}
        width={width * 1.2}
        depth={depth * 1.2}
        baseY={spec.baseHeight}
        dense
        materials={materials}
      />
    </group>
  );
}

function FoundingBasePavilions({
  width,
  depth,
  y,
  materials,
}: {
  width: number;
  depth: number;
  y: number;
  materials: StaticMaterialSet;
}) {
  return (
    <group>
      {[
        [0, -0.52],
        [0.52, 0],
        [0, 0.52],
        [-0.52, 0],
      ].map(([x, z], index) => (
        <group key={index} position={[x * width, y, z * depth]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width * 0.18, 0.42, depth * 0.18]} />
            <primitive object={materials.enterprisePodium} attach="material" />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[width * 0.24, 0.08, depth * 0.24]} />
            <primitive object={materials.warmGold} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CornerPylons({
  width,
  depth,
  height,
  materials,
}: {
  width: number;
  depth: number;
  height: number;
  materials: StaticMaterialSet;
}) {
  const x = width * 0.43;
  const z = depth * 0.43;
  return (
    <group>
      {[
        [-x, -z],
        [x, -z],
        [-x, z],
        [x, z],
      ].map(([px, pz], index) => (
        <mesh key={index} position={[px, height * 0.5, pz]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.1, height * 0.95, 8]} />
          <primitive object={materials.ivoryShell} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function StarterSideModules({
  width,
  depth,
  height,
  materials,
}: {
  width: number;
  depth: number;
  height: number;
  materials: StaticMaterialSet;
}) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * width * 0.6, 0, -depth * 0.06]}>
          <mesh position={[0, height * 0.33, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.26, height * 0.5, depth * 0.62]} />
            <primitive object={materials.graphiteShell} attach="material" />
          </mesh>
          <mesh position={[0, height * 0.62, 0]} scale={[width * 0.16, 0.18, depth * 0.34]} castShadow receiveShadow>
            <sphereGeometry args={[1, 16, 8]} />
            <primitive object={materials.starterShell} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, height * 0.84, depth * 0.12]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.86, 0.12, depth * 0.2]} />
        <primitive object={materials.warmGold} attach="material" />
      </mesh>
    </group>
  );
}

function StarterAtriumPods({
  width,
  depth,
  height,
  materials,
}: {
  width: number;
  depth: number;
  height: number;
  materials: StaticMaterialSet;
}) {
  return (
    <group>
      {[-0.34, 0.34].map((x, index) => (
        <group key={index} position={[x * width, height * 0.72, -depth * 0.36]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.22, height * 0.38, 14]} />
            <primitive object={materials.starterTank} attach="material" />
          </mesh>
          <mesh position={[0, height * 0.24, 0]} scale={[0.24, 0.16, 0.24]}>
            <sphereGeometry args={[1, 12, 8]} />
            <primitive object={materials.cyanGlass} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ControlTowerFins({
  width,
  depth,
  baseY,
  height,
  materials,
}: {
  width: number;
  depth: number;
  baseY: number;
  height: number;
  materials: StaticMaterialSet;
}) {
  return (
    <group>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rotation, index) => (
        <mesh
          key={index}
          position={[
            Math.sin(rotation) * width * 0.46,
            baseY + height * 0.5,
            Math.cos(rotation) * depth * 0.46,
          ]}
          rotation={[0, rotation, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.07, height * 0.82, 0.16]} />
          <primitive object={index % 2 ? materials.cyanLine : materials.ivoryShell} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function CampusSatellites({
  width,
  depth,
  y,
  materials,
}: {
  width: number;
  depth: number;
  y: number;
  materials: StaticMaterialSet;
}) {
  return (
    <group>
      {[
        [-0.34, -0.36],
        [0.34, 0.36],
        [-0.34, 0.34],
        [0.34, -0.34],
      ].map(([x, z], index) => (
        <group key={index} position={[x * width, y, z * depth]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.34, 0.48, 12]} />
            <primitive object={materials.ivoryShell} attach="material" />
          </mesh>
          <mesh position={[0, 0.34, 0]} scale={[0.28, 0.14, 0.28]}>
            <sphereGeometry args={[1, 14, 8]} />
            <primitive object={materials.cyanGlass} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Plinth({
  building,
  materials,
}: {
  building: LiveBuildingLayout;
  materials: StaticMaterialSet;
}) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry
          args={[building.visual.width + 0.68, 0.12, building.visual.depth + 0.68]}
        />
        <primitive object={materials.plinth} attach="material" />
      </mesh>
      <mesh position={[0, 0.135, 0]} receiveShadow>
        <boxGeometry
          args={[building.visual.width + 0.38, 0.035, building.visual.depth + 0.38]}
        />
        <primitive object={materials.darkPanel} attach="material" />
      </mesh>
      <mesh position={[0, 0.158, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[Math.max(building.visual.width, building.visual.depth) * 0.54, 0.025, 8, 48]} />
        <primitive object={building.visual.tierKey === 'founding' ? materials.warmGold : materials.cyanLine} attach="material" />
      </mesh>
    </group>
  );
}

function HatchPodPetals({
  width,
  depth,
  height,
  materials,
  scale = 1,
}: {
  width: number;
  depth: number;
  height: number;
  materials: StaticMaterialSet;
  scale?: number;
}) {
  const radius = Math.max(width, depth) * 0.34 * scale;
  return (
    <group>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, index) => (
        <mesh
          key={index}
          position={[
            Math.sin(angle) * width * 0.24,
            height * 0.82,
            Math.cos(angle) * depth * 0.24,
          ]}
          rotation={[0.24, angle, 0]}
          scale={[radius, radius * 0.62, radius * 0.24]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
          <primitive object={materials.ivoryShell} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function TierMarker({
  building,
  materials,
}: {
  building: LiveBuildingLayout;
  materials: StaticMaterialSet;
}) {
  const rank = tierRank(building.visual.tierKey);
  const frontZ = building.visual.depth * 0.5 + 0.52;
  const markerHeight = 0.46 + rank * 0.08;
  return (
    <group position={[0, 0.28, frontZ]}>
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.08, 0.08, 0.3]} />
        <primitive object={materials.darkPanel} attach="material" />
      </mesh>
      <mesh position={[0, markerHeight / 2 + 0.08, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.12, markerHeight, 0.08]} />
        <primitive object={building.visual.tierKey === 'founding' ? materials.warmGold : materials.cyanLine} attach="material" />
      </mesh>
      {Array.from({ length: rank }, (_, index) => (
        <mesh
          key={index}
          position={[-0.36 + index * 0.18, 0.16, -0.08]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.055, 14]} />
          <primitive object={index === rank - 1 && building.visual.tierKey === 'founding' ? materials.warmGold : materials.cyanLine} attach="material" />
        </mesh>
      ))}
    </group>
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

function SignalNode({
  spec,
  materials,
}: {
  spec: { x: number; z: number };
  materials: StaticMaterialSet;
}) {
  return (
    <group position={[spec.x, 0.16, spec.z]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.055, 0.62, 8]} />
        <primitive object={materials.treeTrunk} attach="material" />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.22, 0]} />
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

function makeSignalNodeSpec(rng: () => number, width: number, depth: number) {
  if (rng() <= 0.4) return null;
  return {
    x: (rng() - 0.5) * width * 1.3,
    z: depth * 0.7 * (rng() < 0.5 ? 1 : -1),
  };
}

function tierRank(tier: LiveCityTierKey): number {
  switch (tier) {
    case 'free':
      return 1;
    case 'starter':
      return 2;
    case 'pro':
      return 3;
    case 'business':
      return 4;
    case 'founding':
      return 5;
    default:
      return 1;
  }
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
      base: '#d7d5ca',
      trim: '#8b8e91',
      litColor: '#b7c8c0',
    },
    starter: {
      cols: 5,
      rows: 6,
      base: '#a9b0b4',
      trim: '#596066',
      litColor: '#ffe4a8',
    },
    pro: {
      cols: 7,
      rows: 10,
      base: '#4d5560',
      trim: '#252b33',
      litColor: '#7fd9ff',
    },
    business: {
      cols: 9,
      rows: 16,
      base: '#3f4852',
      trim: '#20262e',
      litColor: '#a9d8ff',
    },
    founding: {
      cols: 10,
      rows: 20,
      base: '#d9d5c9',
      trim: '#5c6064',
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
    freeShell: new THREE.MeshLambertMaterial({
      color: 0xf0ede4,
      flatShading: true,
    }),
    freeTrim: new THREE.MeshLambertMaterial({ color: 0xd6b177 }),
    starterShell: new THREE.MeshLambertMaterial({
      color: 0xe8e3d7,
      flatShading: true,
    }),
    starterParapet: new THREE.MeshLambertMaterial({ color: 0x343a3b }),
    starterTank: new THREE.MeshLambertMaterial({ color: 0xa4a7a6 }),
    proLobby: new THREE.MeshLambertMaterial({ color: 0x232b30 }),
    enterprisePodium: new THREE.MeshLambertMaterial({ color: 0x30373a }),
    enterpriseLedge: new THREE.MeshLambertMaterial({ color: 0x242b2e }),
    ivoryShell: new THREE.MeshLambertMaterial({ color: 0xe9e4d8, flatShading: true }),
    graphiteShell: new THREE.MeshLambertMaterial({ color: 0x2c3339, flatShading: true }),
    warmGold: new THREE.MeshLambertMaterial({ color: 0xc7a86a }),
    cyanGlass: new THREE.MeshLambertMaterial({
      color: 0x9fe7ef,
      emissive: 0x60dbe8,
      emissiveIntensity: 0.34,
      transparent: true,
      opacity: 0.78,
    }),
    cyanLine: new THREE.MeshBasicMaterial({
      color: 0x9bcfd0,
      transparent: true,
      opacity: 0.56,
      toneMapped: false,
    }),
    darkPanel: new THREE.MeshLambertMaterial({ color: 0x232a2d }),
    antenna: new THREE.MeshLambertMaterial({ color: 0x9ba0a3 }),
    beacon: new THREE.MeshBasicMaterial({ color: 0xffd89a, toneMapped: false }),
    plinth: new THREE.MeshLambertMaterial({ color: 0x6c7276 }),
    equipment: new THREE.MeshLambertMaterial({ color: 0x545b62 }),
    duct: new THREE.MeshLambertMaterial({ color: 0x2d343b }),
    treeTrunk: new THREE.MeshLambertMaterial({ color: 0x27323d }),
    treeFoliage: new THREE.MeshLambertMaterial({
      color: 0x6f966c,
      flatShading: true,
    }),
  };
  return staticMaterials;
}
