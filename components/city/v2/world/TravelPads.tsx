'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CATEGORIES } from '@/components/city/types';
import { DISTRICT_SIZE, districtPosition } from './grid';

// Corner offset from district centre — past the landmark clearance.
const PAD_OFFSET = DISTRICT_SIZE * 0.3;

/**
 * Shimmering glow ring + core for each district. Purely visual —
 * fast-travel triggers off the minimap; the pads are there to give a
 * walking user a landmark they can wander over to. Placed at the SE
 * corner of each district so they don't fight the central landmark
 * sculpt.
 */
export function TravelPads() {
  return (
    <group>
      {CATEGORIES.map((_, idx) => {
        const pos = districtPosition(idx);
        return (
          <TravelPad
            key={idx}
            x={pos.x + PAD_OFFSET}
            z={pos.z + PAD_OFFSET}
            phase={idx * 0.37}
          />
        );
      })}
    </group>
  );
}

function TravelPad({ x, z, phase }: { x: number; z: number; phase: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const ringMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x7ad8ff,
        emissive: 0x4db2ff,
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.85,
        roughness: 0.2,
        metalness: 0.1,
      }),
    [],
  );
  const coreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phase;
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.6;
      const scale = 1 + Math.sin(t * 2) * 0.04;
      ringRef.current.scale.set(scale, scale, scale);
    }
    if (coreRef.current) {
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.55 + Math.sin(t * 3) * 0.25;
    }
  });

  return (
    <group position={[x, 0.05, z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[1.8, 2.4, 32]} />
      </mesh>
      <mesh ref={coreRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={coreMat}>
        <circleGeometry args={[1.7, 24]} />
      </mesh>
    </group>
  );
}
