'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { ROOM_SIZE, ROOM_HEIGHT, ROOM_HALF } from './grid';
import { paletteFor } from '../colors';

interface Props { framework: string; }

export function RoomShell({ framework }: Props) {
  const palette = paletteFor(framework);

  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0a0a12,
    metalness: 0.6,
    roughness: 0.3,
    emissive: new THREE.Color(palette.primary),
    emissiveIntensity: 0.03,
  }), [palette.primary]);

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x15151c,
    metalness: 0.5,
    roughness: 0.7,
  }), []);

  const trimMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: palette.primary,
    toneMapped: false,
  }), [palette.primary]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, 0]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_HALF]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, ROOM_HALF]} rotation={[0, Math.PI, 0]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[-ROOM_HALF, ROOM_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[ROOM_HALF, ROOM_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
      </mesh>
      {[0, 1, 2, 3].map(i => {
        const a = (i * Math.PI) / 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * ROOM_HALF, 0.05, Math.cos(a) * ROOM_HALF]}
            rotation={[0, a, 0]}
            material={trimMat}
          >
            <boxGeometry args={[ROOM_SIZE, 0.1, 0.1]} />
          </mesh>
        );
      })}
    </group>
  );
}
