'use client';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useQuality } from '../quality/QualityContext';
import { BUILDING_BASES, type BuildingBase } from './Buildings.layout';

/**
 * Preload + expose the 8 base building meshes at the current quality
 * preset. Returns a map `base -> THREE.Mesh` the Buildings component
 * can pull geometry + material from. All GLBs are preloaded at module
 * load time so the scene mounts without pop-in.
 */
export function useCityBuildings(): Record<BuildingBase, THREE.Mesh | null> {
  const quality = useQuality();
  const urls = BUILDING_BASES.map(
    (b) => `/assets/3d/city/buildings/${b}.${quality}.glb`,
  );
  // drei's useGLTF accepts an array and returns an array of gltf objs
  const gltfs = useGLTF(urls) as unknown as Array<{ scene: THREE.Object3D }>;

  return useMemo(() => {
    const out = {} as Record<BuildingBase, THREE.Mesh | null>;
    BUILDING_BASES.forEach((base, i) => {
      const gltf = gltfs[i];
      let mesh: THREE.Mesh | null = null;
      gltf?.scene?.traverse((obj) => {
        if (!mesh && (obj as THREE.Mesh).isMesh) {
          mesh = obj as THREE.Mesh;
        }
      });
      out[base] = mesh;
    });
    return out;
  }, [gltfs]);
}

// Preload immediately so the first <Buildings> mount has zero wait.
BUILDING_BASES.forEach((b) => {
  useGLTF.preload(`/assets/3d/city/buildings/${b}.high.glb`);
  useGLTF.preload(`/assets/3d/city/buildings/${b}.low.glb`);
});
