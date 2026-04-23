'use client';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useQuality } from '../quality/QualityContext';
import { BUILDING_BASES, type BuildingBase } from './Buildings.layout';

// Self-host the Draco decoder so we don't depend on www.gstatic.com
// (which is also not in our CSP connect-src). The decoder files are
// copied from `three/examples/jsm/libs/draco/gltf/` into public/draco/.
useGLTF.setDecoderPath('/draco/');

export interface BuildingPrimitive {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export interface BuildingAsset {
  /** Every Mesh.primitives[] entry becomes one InstancedMesh at render
   *  time. Quaternius FBX exports ship one material per structural
   *  element (Bricks / Glass / Wood / Dark / ...), so each building
   *  lands in 6-9 primitives. */
  primitives: BuildingPrimitive[];
  /** Native height of the source mesh (max Y - min Y), computed once
   *  so Buildings.tsx can scale Y to target height without hardcoding
   *  an assumed unit height. */
  nativeHeight: number;
  /** Min Y of the native bounding box — used to keep the building's
   *  foundation on the ground plane after scaling. */
  minY: number;
}

function collectPrimitives(root: THREE.Object3D): BuildingPrimitive[] {
  const out: BuildingPrimitive[] = [];
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    if (Array.isArray(m.material)) {
      m.material.forEach((mat) => {
        out.push({ geometry: m.geometry, material: mat.clone() });
      });
    } else if (m.material) {
      out.push({ geometry: m.geometry, material: (m.material as THREE.Material).clone() });
    }
  });
  return out;
}

function computeNativeBounds(root: THREE.Object3D): { height: number; minY: number } {
  const box = new THREE.Box3().setFromObject(root);
  if (!isFinite(box.min.y) || !isFinite(box.max.y)) {
    return { height: 3, minY: 0 };
  }
  return { height: box.max.y - box.min.y, minY: box.min.y };
}

/**
 * Preload + expose the 8 base building assets at the current quality
 * preset. Returns each base's primitives (one per material) + native
 * bounds for correct Y-scaling.
 */
export function useCityBuildings(): Record<BuildingBase, BuildingAsset | null> {
  const quality = useQuality();
  const urls = BUILDING_BASES.map(
    (b) => `/assets/3d/city/buildings/${b}.${quality}.glb`,
  );
  const gltfs = useGLTF(urls) as unknown as Array<{ scene: THREE.Object3D }>;

  return useMemo(() => {
    const out = {} as Record<BuildingBase, BuildingAsset | null>;
    BUILDING_BASES.forEach((base, i) => {
      const gltf = gltfs[i];
      if (!gltf?.scene) {
        out[base] = null;
        return;
      }
      const primitives = collectPrimitives(gltf.scene);
      const { height, minY } = computeNativeBounds(gltf.scene);
      out[base] = { primitives, nativeHeight: height > 0 ? height : 3, minY };
    });
    return out;
  }, [gltfs]);
}

// Preload at module load — drei caches by URL so the first <Buildings>
// mount doesn't pay a network cost. We intentionally preload both
// variants because quality can toggle at runtime via QualityToggle.
BUILDING_BASES.forEach((b) => {
  useGLTF.preload(`/assets/3d/city/buildings/${b}.high.glb`);
  useGLTF.preload(`/assets/3d/city/buildings/${b}.low.glb`);
});
