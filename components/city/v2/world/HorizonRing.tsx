'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD_HALF } from './grid';

/**
 * Ring of dark silhouette buildings just beyond the play area so the
 * city's edge reads as "more city fading into night" instead of
 * "flat indigo void". Geometry is a ring of thin extruded boxes at
 * randomised heights, arranged around a circle of radius ~WORLD_HALF+60.
 *
 * Rendered as a single InstancedMesh — 120 silhouette columns is free.
 * Material is unlit and almost black so it blends into the fog rather
 * than competing with the lit city centre. The fog's far-plane (~450u
 * from CitySceneV2) hides the outer edge completely; what you see is
 * a suggestive jagged horizon line at ~320-380u out.
 */
const COUNT = 120;
const RADIUS = WORLD_HALF + 40;

export function HorizonRing() {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mesh = useMemo(() => {
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x06060d });
    const im = new THREE.InstancedMesh(geom, mat, COUNT);
    im.castShadow = false;
    im.receiveShadow = false;
    // Stable pseudo-random heights via index-keyed hash so hot reload
    // doesn't shuffle the skyline.
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2;
      // Hash-based jitter — deterministic, avoids Math.random on mount.
      const jitter = (Math.sin(i * 13.37) + Math.cos(i * 7.919)) * 0.5;
      const h = 40 + ((i * 9301 + 49297) % 233381) / 8000; // ~40..70
      const w = 18 + ((i * 7919 + 2017) % 100) / 8;        // ~18..30
      const r = RADIUS + jitter * 12;
      dummy.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      dummy.rotation.set(0, -a + Math.PI / 2, 0);
      dummy.scale.set(w, h, 8);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    return im;
  }, [dummy]);
  return <primitive object={mesh} />;
}
