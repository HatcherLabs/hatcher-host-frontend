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
  const [diffBase, normBase, roughBase] = useTexture([
    '/assets/3d/textures/asphalt_diff.jpg',
    '/assets/3d/textures/asphalt_norm.jpg',
    '/assets/3d/textures/asphalt_rough.jpg',
  ]);

  // drei's useTexture returns shared-cached THREE.Texture instances.
  // Streets also tiles these with a different repeat; mutating the
  // shared one leaks config between consumers, so clone here.
  const { diff, norm, rough } = useMemo(() => {
    const d = diffBase.clone();
    const n = normBase.clone();
    const r = roughBase.clone();
    for (const t of [d, n, r]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(40, 40);
      t.needsUpdate = true;
    }
    d.colorSpace = THREE.SRGBColorSpace;
    return { diff: d, norm: n, rough: r };
  }, [diffBase, normBase, roughBase]);

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
