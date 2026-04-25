'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DISTRICT_COLS,
  DISTRICT_ROWS,
  DISTRICT_STEP,
} from './grid';

/**
 * Street lamps at every district-grid intersection. Post + frosted
 * bulb; the bulb is emissive so Bloom lifts it into a neon halo. All
 * bulbs share one InstancedMesh → one draw call for the full grid.
 */
export function Streetlights() {
  const step = DISTRICT_STEP;
  const totalRows = DISTRICT_ROWS;

  const positions = useMemo(() => {
    const out: Array<[number, number]> = [];
    // Sit at street intersections — same gap-centre formula as
    // Streets.tsx (no half-gap offset).
    for (let r = 0; r <= totalRows; r++) {
      const z = (r - totalRows / 2) * step;
      for (let c = 0; c <= DISTRICT_COLS; c++) {
        const x = (c - DISTRICT_COLS / 2) * step;
        out.push([x, z]);
      }
    }
    return out;
  }, [step, totalRows]);

  const postMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1d2434,
        roughness: 0.6,
        metalness: 0.45,
      }),
    [],
  );
  const bulbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xf0f9ff,
        emissive: 0xa8dcff,
        emissiveIntensity: 3,
      }),
    [],
  );

  const postRef = useRef<THREE.InstancedMesh>(null);
  const bulbRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    if (!postRef.current || postRef.current.count === positions.length + 1) return;
    const obj = new THREE.Object3D();
    positions.forEach(([x, z], i) => {
      obj.position.set(x, 2.5, z);
      obj.scale.set(1, 1, 1);
      obj.rotation.set(0, 0, 0);
      obj.updateMatrix();
      postRef.current!.setMatrixAt(i, obj.matrix);
      obj.position.set(x, 5.2, z);
      obj.updateMatrix();
      bulbRef.current!.setMatrixAt(i, obj.matrix);
    });
    postRef.current.instanceMatrix.needsUpdate = true;
    if (bulbRef.current) bulbRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={postRef} args={[undefined, undefined, positions.length]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 5, 8]} />
        <primitive attach="material" object={postMat} />
      </instancedMesh>
      <instancedMesh ref={bulbRef} args={[undefined, undefined, positions.length]}>
        <sphereGeometry args={[0.28, 10, 8]} />
        <primitive attach="material" object={bulbMat} />
      </instancedMesh>
    </group>
  );
}
