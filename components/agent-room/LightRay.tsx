'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';

interface Props {
  palette: FrameworkPalette;
}

/**
 * Soft cone of light descending onto the platform — gives the scene
 * a "stage spot" feel without a heavy volumetric shader. Just a
 * downward cone with additive blending + subtle rotation pulse.
 */
export function LightRay({ palette }: Props) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) matRef.current.opacity = 0.1 + Math.sin(t * 0.5) * 0.04;
    if (groupRef.current) groupRef.current.rotation.y = t * 0.06;
  });
  return (
    <group ref={groupRef} position={[0, 5.5, 0]}>
      <mesh>
        <coneGeometry args={[3.8, 11, 32, 1, true]} />
        <meshBasicMaterial
          ref={matRef}
          color={palette.primary}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
