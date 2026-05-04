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

  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0f1017,
    metalness: 0.45,
    roughness: 0.62,
  }), []);

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
      {[-8, -4, 0, 4, 8].map(x => (
        <group key={`floor-${x}`}>
          <mesh position={[x, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} material={trimMat}>
            <planeGeometry args={[0.035, ROOM_SIZE * 0.92]} />
          </mesh>
          <mesh position={[0, 0.056, x]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={trimMat}>
            <planeGeometry args={[0.035, ROOM_SIZE * 0.92]} />
          </mesh>
        </group>
      ))}
      {[-8, -4, 0, 4, 8].map(x => (
        <group key={`wall-panels-${x}`}>
          <mesh position={[x, ROOM_HEIGHT * 0.55, -ROOM_HALF + 0.025]} material={panelMat}>
            <boxGeometry args={[2.5, ROOM_HEIGHT * 0.58, 0.05]} />
          </mesh>
          <mesh position={[x, ROOM_HEIGHT * 0.55, ROOM_HALF - 0.025]} material={panelMat}>
            <boxGeometry args={[2.5, ROOM_HEIGHT * 0.58, 0.05]} />
          </mesh>
          <mesh position={[-ROOM_HALF + 0.025, ROOM_HEIGHT * 0.55, x]} material={panelMat}>
            <boxGeometry args={[0.05, ROOM_HEIGHT * 0.58, 2.5]} />
          </mesh>
          <mesh position={[ROOM_HALF - 0.025, ROOM_HEIGHT * 0.55, x]} material={panelMat}>
            <boxGeometry args={[0.05, ROOM_HEIGHT * 0.58, 2.5]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map(s => (
        <group key={`ceiling-rail-${s}`}>
          <mesh position={[0, ROOM_HEIGHT - 0.18, s * 4.25]} material={trimMat}>
            <boxGeometry args={[ROOM_SIZE * 0.74, 0.035, 0.035]} />
          </mesh>
          <mesh position={[s * 4.25, ROOM_HEIGHT - 0.2, 0]} material={trimMat}>
            <boxGeometry args={[0.035, 0.035, ROOM_SIZE * 0.74]} />
          </mesh>
        </group>
      ))}
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
