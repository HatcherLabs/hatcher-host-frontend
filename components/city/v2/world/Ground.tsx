'use client';
import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * 600×600 ground plane. Phase 1 uses a flat color; Phase 2 will swap in
 * a PBR asphalt-concrete texture from Poly Haven.
 */
export function Ground() {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1a1f2b,
        roughness: 0.92,
        metalness: 0.05,
      }),
    [],
  );
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      material={material}
    >
      <planeGeometry args={[600, 600]} />
    </mesh>
  );
}
