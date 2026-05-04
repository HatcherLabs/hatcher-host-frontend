'use client';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { paletteFor } from '../colors';
import type { Quality } from '../quality';
import { ROOM_HALF, ROOM_HEIGHT } from './grid';

interface Props {
  framework: string;
  quality: Quality;
}

const ASSET_BASE = '/assets/3d/agent-room/quaternius/';
const WALL_MODEL = 'WallAstra_Straight';
const WINDOW_MODEL = 'WallAstra_Straight_Window';

type Vec3 = [number, number, number];

function cloneAsset(root: THREE.Group) {
  const clone = root.clone(true);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = materials.map((material) => {
      const mat = material.clone();
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.color.multiplyScalar(0.28);
        mat.color.lerp(new THREE.Color(0x05080d), 0.25);
        mat.roughness = Math.min(0.84, mat.roughness + 0.12);
        mat.metalness = Math.max(0.28, mat.metalness);
        mat.envMapIntensity = 0.05;
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

function LightBar({
  position,
  rotation = [0, 0, 0],
  size,
  color,
  opacity = 0.75,
}: {
  position: Vec3;
  rotation?: Vec3;
  size: Vec3;
  color: string;
  opacity?: number;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

function Canopy({ color, accent }: { color: string; accent: string }) {
  const fan = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (fan.current) fan.current.rotation.y = clock.getElapsedTime() * 0.55;
  });

  return (
    <group>
      <mesh position={[0, ROOM_HEIGHT - 0.22, 0]}>
        <boxGeometry args={[5.2, 0.18, ROOM_HALF * 1.72]} />
        <meshStandardMaterial color={0x06090f} metalness={0.6} roughness={0.46} envMapIntensity={0.14} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-7.5, -3.75, 0, 3.75, 7.5].map((z, index) => (
            <group key={z} position={[side * 5.85, ROOM_HEIGHT - 0.68, z]} rotation={[0, 0, side * 0.28]}>
              <mesh receiveShadow>
                <boxGeometry args={[4.7, 0.08, 3.1]} />
                <meshStandardMaterial
                  color={index % 2 ? 0x0b141b : 0x080d14}
                  metalness={0.34}
                  roughness={0.66}
                  transparent
                  opacity={0.82}
                  envMapIntensity={0.08}
                />
              </mesh>
              {[-0.9, 0.9].map((x) => (
                <LightBar
                  key={x}
                  position={[x, 0.065, -1.3]}
                  size={[1.15, 0.035, 0.045]}
                  color={index % 2 ? accent : color}
                  opacity={0.46}
                />
              ))}
            </group>
          ))}
        </group>
      ))}
      {[-7.8, -3.9, 0, 3.9, 7.8].map((z, index) => (
        <LightBar
          key={z}
          position={[0, ROOM_HEIGHT - 0.06, z]}
          size={[2.9, 0.05, 0.08]}
          color={index % 2 ? accent : color}
          opacity={0.84}
        />
      ))}
      <group ref={fan} position={[0, ROOM_HEIGHT - 0.52, 0]}>
        <ScifiAsset name="Prop_Fan_Small" position={[0, 0, 0]} rotation={[Math.PI, 0, 0]} scale={1.75} />
      </group>
    </group>
  );
}

function WallModules() {
  const sideZ = [-8, -4, 0, 4, 8];
  const faceX = [-8, -4, 0, 4, 8];

  return (
    <group>
      {sideZ.map((z, index) => (
        <group key={`side-${z}`}>
          <ScifiAsset
            name={index % 2 ? WINDOW_MODEL : WALL_MODEL}
            position={[-9.18, 0, z]}
            scale={1.02}
          />
          <ScifiAsset
            name={index % 2 ? WALL_MODEL : WINDOW_MODEL}
            position={[9.18, 0, z]}
            rotation={[0, Math.PI, 0]}
            scale={1.02}
          />
          <ScifiAsset
            name="TopCables_Straight"
            position={[-9.05, 0, z]}
            scale={1.03}
          />
          <ScifiAsset
            name="TopCables_Straight"
            position={[9.05, 0, z]}
            rotation={[0, Math.PI, 0]}
            scale={1.03}
          />
        </group>
      ))}
      {faceX.map((x, index) => (
        <group key={`face-${x}`}>
          <ScifiAsset
            name={index % 2 ? WINDOW_MODEL : WALL_MODEL}
            position={[x, 0, -13.52]}
            rotation={[0, Math.PI / 2, 0]}
            scale={1.02}
          />
          <ScifiAsset
            name={index % 2 ? WALL_MODEL : WINDOW_MODEL}
            position={[x, 0, 13.52]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={1.02}
          />
        </group>
      ))}
    </group>
  );
}

function FloorProps() {
  return (
    <group>
      <ScifiAsset name="Prop_Computer" position={[-9.7, 0.18, -8.35]} rotation={[0, Math.PI * 0.5, 0]} scale={1.18} />
      <ScifiAsset name="Prop_Computer" position={[9.7, 0.18, 5.45]} rotation={[0, -Math.PI * 0.5, 0]} scale={1.18} />
      <ScifiAsset name="Prop_Chest" position={[8.9, 0.16, 9.2]} rotation={[0, -0.35, 0]} scale={1.15} />
      <ScifiAsset name="Prop_Chest" position={[-9.2, 0.16, 8.8]} rotation={[0, 0.55, 0]} scale={0.96} />
      <ScifiAsset name="Prop_Cable_1" position={[-4.2, 0.11, 9.4]} rotation={[0, 1.2, 0]} scale={1.35} />
      <ScifiAsset name="Prop_Cable_1" position={[5.6, 0.11, -9.4]} rotation={[0, -1.1, 0]} scale={1.25} />
    </group>
  );
}

function RoomLightLanguage({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-9, -5, -1, 3, 7].map((z, index) => (
            <LightBar
              key={`${side}-${z}`}
              position={[side * (ROOM_HALF - 0.18), 2.25 + (index % 2) * 1.55, z]}
              size={[0.08, 0.085, 1.45]}
              color={index % 3 === 0 ? accent : color}
              opacity={0.52}
            />
          ))}
        </group>
      ))}
      {[-9, -5, -1, 3, 7].map((x, index) => (
        <group key={x}>
          <LightBar
            position={[x, 3.15, -ROOM_HALF + 0.18]}
            rotation={[0, Math.PI / 2, 0]}
            size={[0.08, 0.085, 1.45]}
            color={index % 2 ? accent : color}
            opacity={0.52}
          />
          <LightBar
            position={[x, 2.65, ROOM_HALF - 0.18]}
            rotation={[0, Math.PI / 2, 0]}
            size={[0.08, 0.085, 1.45]}
            color={index % 2 ? color : accent}
            opacity={0.46}
          />
        </group>
      ))}
    </group>
  );
}

export function RoomSetDressing({ framework, quality }: Props) {
  const palette = paletteFor(framework);
  const color = framework === 'openclaw' ? '#39ff88' : palette.primary;
  const accent = framework === 'openclaw' ? '#38bdf8' : palette.accent;

  return (
    <group>
      <Canopy color={color} accent={accent} />
      <RoomLightLanguage color={color} accent={accent} />
      {quality !== 'low' && (
        <>
          <WallModules />
          <FloorProps />
        </>
      )}
    </group>
  );
}

useGLTF.preload(`${ASSET_BASE}${WALL_MODEL}.gltf`);
useGLTF.preload(`${ASSET_BASE}${WINDOW_MODEL}.gltf`);
useGLTF.preload(`${ASSET_BASE}TopCables_Straight.gltf`);
useGLTF.preload(`${ASSET_BASE}Prop_Computer.gltf`);
useGLTF.preload(`${ASSET_BASE}Prop_Chest.gltf`);
useGLTF.preload(`${ASSET_BASE}Prop_Cable_1.gltf`);
useGLTF.preload(`${ASSET_BASE}Prop_Fan_Small.gltf`);
