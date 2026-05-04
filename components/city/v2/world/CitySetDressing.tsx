'use client';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { CATEGORIES } from '@/components/city/types';
import { useQuality } from '../quality/QualityContext';
import { DISTRICT_SIZE, districtPosition } from './grid';

const ASSET_BASE = '/assets/3d/agent-room/quaternius/';
const EDGE_OFFSET = DISTRICT_SIZE * 0.38;

type Vec3 = [number, number, number];

function cloneAsset(root: THREE.Group) {
  const clone = root.clone(true);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = materials.map((material) => {
      const mat = material.clone();
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.color.multiplyScalar(0.36);
        mat.color.lerp(new THREE.Color(0x06111b), 0.26);
        mat.roughness = Math.min(0.86, mat.roughness + 0.08);
        mat.metalness = Math.max(0.42, mat.metalness);
        mat.envMapIntensity = 0.08;
      }
      return mat;
    });
    mesh.material = Array.isArray(mesh.material) ? next : next[0]!;
  });
  return clone;
}

function ScifiAsset({
  name,
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  name: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
}) {
  const gltf = useGLTF(`${ASSET_BASE}${name}.gltf`) as unknown as { scene: THREE.Group };
  const object = useMemo(() => cloneAsset(gltf.scene), [gltf.scene]);
  return <primitive object={object} position={position} rotation={rotation} scale={scale} />;
}

function LightPylon({
  position,
  rotation = 0,
  color,
}: {
  position: Vec3;
  rotation?: number;
  color: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.15, 0]} receiveShadow>
        <boxGeometry args={[0.28, 2.3, 0.28]} />
        <meshStandardMaterial color={0x0b111c} metalness={0.68} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.22, -0.02]}>
        <boxGeometry args={[0.46, 0.12, 0.06]} />
        <meshBasicMaterial color={color} transparent opacity={0.82} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.46, 18]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} toneMapped={false} />
      </mesh>
    </group>
  );
}

function DistrictTerminal({ index }: { index: number }) {
  const pos = districtPosition(index);
  const side = index % 2 === 0 ? 1 : -1;
  const front = index % 3 === 0 ? 1 : -1;
  const accent = index % 2 === 0 ? '#8cffda' : '#7ad8ff';
  const x = pos.x + side * EDGE_OFFSET;
  const z = pos.z + front * (DISTRICT_SIZE * 0.31);
  const rotation = side > 0 ? -Math.PI / 2 : Math.PI / 2;

  return (
    <group>
      <ScifiAsset
        name={index % 4 === 0 ? 'Prop_Chest' : 'Prop_Computer'}
        position={[x, 0.16, z]}
        rotation={[0, rotation + (front > 0 ? 0.22 : -0.22), 0]}
        scale={index % 4 === 0 ? 0.92 : 1.06}
      />
      {index % 2 === 0 && (
        <ScifiAsset
          name="Prop_Cable_1"
          position={[x - side * 1.35, 0.1, z - front * 0.35]}
          rotation={[0, rotation + 0.8, 0]}
          scale={0.88}
        />
      )}
      <LightPylon
        position={[pos.x - side * (DISTRICT_SIZE * 0.34), 0.02, pos.z + front * EDGE_OFFSET]}
        rotation={rotation}
        color={accent}
      />
    </group>
  );
}

function VentCluster({ index }: { index: number }) {
  const pos = districtPosition(index);
  const offset = DISTRICT_SIZE * 0.34;
  return (
    <group position={[pos.x - offset, 0.18, pos.z - offset]} rotation={[0, index * 0.38, 0]}>
      <ScifiAsset name="Prop_Fan_Small" position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.82} />
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.88, 18]} />
        <meshBasicMaterial color={0x5df7ff} transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function CitySetDressing() {
  const quality = useQuality();
  if (quality === 'low') return null;

  const terminalStride = quality === 'high' ? 1 : 2;
  const ventStride = quality === 'high' ? 4 : 7;

  return (
    <group>
      {CATEGORIES.map((_, index) =>
        index % terminalStride === 0 ? <DistrictTerminal key={`terminal-${index}`} index={index} /> : null,
      )}
      {CATEGORIES.map((_, index) =>
        index % ventStride === 0 ? <VentCluster key={`vent-${index}`} index={index} /> : null,
      )}
    </group>
  );
}

useGLTF.preload(`${ASSET_BASE}Prop_Computer.gltf`);
useGLTF.preload(`${ASSET_BASE}Prop_Chest.gltf`);
useGLTF.preload(`${ASSET_BASE}Prop_Cable_1.gltf`);
useGLTF.preload(`${ASSET_BASE}Prop_Fan_Small.gltf`);
