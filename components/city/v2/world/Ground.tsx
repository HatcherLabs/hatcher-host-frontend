'use client';
import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * 600×600 ground plane with a tiled PBR asphalt texture. Phase 2.
 *
 * The texture is shared across the whole ground — district pads
 * (DistrictPads.tsx) sit on top and override the look per category.
 */
export function Ground() {
  const [diff, norm, rough] = useTexture([
    '/assets/3d/textures/asphalt_diff.jpg',
    '/assets/3d/textures/asphalt_norm.jpg',
    '/assets/3d/textures/asphalt_rough.jpg',
  ]);

  useMemo(() => {
    for (const t of [diff, norm, rough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(40, 40);
    }
    diff.colorSpace = THREE.SRGBColorSpace;
  }, [diff, norm, rough]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[600, 600]} />
      <meshStandardMaterial
        map={diff}
        normalMap={norm}
        roughnessMap={rough}
        roughness={0.95}
        metalness={0.02}
      />
    </mesh>
  );
}
