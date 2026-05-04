'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CATEGORIES } from '@/components/city/types';
import { DISTRICT_SIZE, districtPosition } from './grid';

// Corner offset from district centre — past the landmark clearance.
const PAD_OFFSET = DISTRICT_SIZE * 0.3;

/**
 * Hatch portal for each district. Purely visual — fast-travel
 * triggers off the minimap; the pads are there to give a walking user
 * a landmark they can wander over to.
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
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const chevronRef = useRef<THREE.Group>(null);

  const { platformMat, ringMat, innerMat, beamMat, coreMat } = useMemo(() => ({
    platformMat: new THREE.MeshStandardMaterial({
      color: 0x0f1724,
      emissive: 0x061b26,
      emissiveIntensity: 0.5,
      roughness: 0.42,
      metalness: 0.78,
      envMapIntensity: 0.14,
    }),
    ringMat: new THREE.MeshStandardMaterial({
      color: 0x7ad8ff,
      emissive: 0x4db2ff,
      emissiveIntensity: 2.8,
      transparent: true,
      opacity: 0.9,
      roughness: 0.16,
      metalness: 0.2,
    }),
    innerMat: new THREE.MeshBasicMaterial({
      color: 0x8cffda,
      transparent: true,
      opacity: 0.76,
      toneMapped: false,
      depthWrite: false,
    }),
    beamMat: new THREE.MeshBasicMaterial({
      color: 0x9df7ff,
      transparent: true,
      opacity: 0.22,
      toneMapped: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    coreMat: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
      toneMapped: false,
    }),
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phase;
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 0.55;
      const scale = 1 + Math.sin(t * 2) * 0.04;
      outerRingRef.current.scale.set(scale, scale, scale);
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -t * 0.9;
    }
    if (chevronRef.current) {
      chevronRef.current.rotation.y = t * 0.22;
    }
    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.14 + Math.sin(t * 2.2) * 0.06;
    }
    if (coreRef.current) {
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.64 + Math.sin(t * 3) * 0.22;
      coreRef.current.rotation.y = t * 0.72;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.12, 0]} material={platformMat} receiveShadow>
        <cylinderGeometry args={[2.85, 3.15, 0.24, 8]} />
      </mesh>
      <mesh ref={outerRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.27, 0]} material={ringMat}>
        <ringGeometry args={[1.9, 2.48, 48]} />
      </mesh>
      <mesh ref={innerRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]} material={innerMat}>
        <ringGeometry args={[0.86, 1.08, 6]} />
      </mesh>
      <mesh ref={beamRef} position={[0, 2.7, 0]} material={beamMat}>
        <cylinderGeometry args={[0.84, 1.2, 4.8, 24, 1, true]} />
      </mesh>
      <mesh ref={coreRef} position={[0, 0.82, 0]} material={coreMat}>
        <octahedronGeometry args={[0.48, 0]} />
      </mesh>
      <group ref={chevronRef}>
        {[0, 1, 2, 3].map((i) => {
          const a = (Math.PI * 2 * i) / 4;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 2.45, 0.36, Math.sin(a) * 2.45]}
              rotation={[0, -a, 0]}
              material={innerMat}
            >
              <boxGeometry args={[0.72, 0.08, 0.18]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
