'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQuality } from '../quality/QualityContext';
import {
  DISTRICT_COLS,
  DISTRICT_ROWS,
  DISTRICT_STEP,
  DISTRICT_GAP,
} from './grid';

const STREET_Y = 0.18;
const LANE_HALF = 2.5;

/**
 * Ambient vehicle traffic moving along street centrelines. 40
 * vehicles HIGH / 12 LOW, distributed across the street grid:
 *   - horizontal streets (z = constant) carry cars going ±x
 *   - vertical streets (x = constant) carry cars going ±z
 *
 * Each vehicle is a short box with emissive head + tail lights. Three
 * InstancedMesh draws (body, head, tail) amortise the 40-vehicle
 * render over ~3 draw calls. Matrices are rewritten imperatively in a
 * single useFrame — no React reconciliation on movement.
 */
export function Traffic() {
  const quality = useQuality();
  const count = quality === 'high' ? 40 : 12;

  const { bodyMat, headMat, tailMat } = useMemo(() => {
    return {
      // Dark body — single colour per vehicle type would require
      // instanceColor attribute; keep it uniform for now so the
      // moving lights are what pop visually.
      bodyMat: new THREE.MeshStandardMaterial({
        color: 0x1a2030,
        roughness: 0.55,
        metalness: 0.5,
      }),
      headMat: new THREE.MeshStandardMaterial({
        color: 0xfff5dc,
        emissive: 0xfff5dc,
        emissiveIntensity: 3,
        roughness: 0.2,
        metalness: 0.1,
      }),
      tailMat: new THREE.MeshStandardMaterial({
        color: 0xff2a4b,
        emissive: 0xff2a4b,
        emissiveIntensity: 3.2,
        roughness: 0.3,
        metalness: 0.1,
      }),
    };
  }, []);

  // Precompute one Lane per vehicle — evenly split between horizontal
  // and vertical streets. Each lane owns axis, offset, direction, and
  // a random phase so vehicles don't move in lockstep.
  const lanes = useMemo(() => buildLanes(count), [count]);

  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const tailRef = useRef<THREE.InstancedMesh>(null);

  useFrame(({ clock }) => {
    if (!bodyRef.current || !headRef.current || !tailRef.current) return;
    const t = clock.getElapsedTime();
    const obj = new THREE.Object3D();
    lanes.forEach((l, i) => {
      const progress = (l.phase + t * l.speed) % l.length;
      const travel = progress - l.length / 2; // -half..+half so we cover the whole street

      // Map travel + offset to world (x, z) depending on axis
      let x: number;
      let z: number;
      let rotY: number;
      if (l.axis === 'x') {
        x = travel * l.dir;
        z = l.offset;
        rotY = l.dir > 0 ? 0 : Math.PI;
      } else {
        x = l.offset;
        z = travel * l.dir;
        rotY = l.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      obj.position.set(x, STREET_Y + 0.3, z);
      obj.rotation.set(0, rotY, 0);
      obj.scale.set(1, 1, 1);
      obj.updateMatrix();
      bodyRef.current!.setMatrixAt(i, obj.matrix);

      // Headlights — shift forward along local +x before rotation so
      // they always end up at the vehicle's nose.
      const nose = new THREE.Object3D();
      nose.position.set(x + Math.cos(rotY) * 1.1, STREET_Y + 0.55, z + Math.sin(rotY) * 1.1);
      nose.rotation.set(0, rotY, 0);
      nose.scale.set(1, 1, 1);
      nose.updateMatrix();
      headRef.current!.setMatrixAt(i, nose.matrix);

      const tail = new THREE.Object3D();
      tail.position.set(x - Math.cos(rotY) * 1.1, STREET_Y + 0.55, z - Math.sin(rotY) * 1.1);
      tail.rotation.set(0, rotY, 0);
      tail.scale.set(1, 1, 1);
      tail.updateMatrix();
      tailRef.current!.setMatrixAt(i, tail.matrix);
    });
    bodyRef.current.instanceMatrix.needsUpdate = true;
    headRef.current.instanceMatrix.needsUpdate = true;
    tailRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, count]} castShadow>
        <boxGeometry args={[2.2, 0.7, 1.0]} />
        <primitive attach="material" object={bodyMat} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.3, 0.2, 0.8]} />
        <primitive attach="material" object={headMat} />
      </instancedMesh>
      <instancedMesh ref={tailRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.2, 0.2, 0.7]} />
        <primitive attach="material" object={tailMat} />
      </instancedMesh>
    </group>
  );
}

interface Lane {
  axis: 'x' | 'z';
  offset: number;
  dir: 1 | -1;
  phase: number;
  speed: number;
  length: number;
}

function buildLanes(n: number): Lane[] {
  const step = DISTRICT_STEP;
  const totalRows = DISTRICT_ROWS;
  const longEdge = Math.max(DISTRICT_COLS, totalRows) * step + 20;

  // Street centrelines — same math as Streets.tsx
  const horizontalZs: number[] = [];
  for (let r = 0; r <= totalRows; r++) {
    horizontalZs.push((r - totalRows / 2) * step - DISTRICT_GAP / 2);
  }
  const verticalXs: number[] = [];
  for (let c = 0; c <= DISTRICT_COLS; c++) {
    verticalXs.push((c - DISTRICT_COLS / 2) * step - DISTRICT_GAP / 2);
  }

  const out: Lane[] = [];
  for (let i = 0; i < n; i++) {
    // Alternate axes so vehicles are split roughly 50/50 between
    // horizontal and vertical streets.
    const onX = i % 2 === 0;
    if (onX) {
      const z = horizontalZs[i % horizontalZs.length]!;
      // Two sub-lanes per street, one each direction, inset by LANE_HALF
      const dir: 1 | -1 = i % 4 === 0 ? 1 : -1;
      out.push({
        axis: 'x',
        offset: z + (dir === 1 ? -LANE_HALF / 2 : LANE_HALF / 2),
        dir,
        phase: Math.random() * longEdge,
        speed: 6 + Math.random() * 4,
        length: longEdge,
      });
    } else {
      const x = verticalXs[i % verticalXs.length]!;
      const dir: 1 | -1 = i % 4 === 1 ? 1 : -1;
      out.push({
        axis: 'z',
        offset: x + (dir === 1 ? LANE_HALF / 2 : -LANE_HALF / 2),
        dir,
        phase: Math.random() * longEdge,
        speed: 6 + Math.random() * 4,
        length: longEdge,
      });
    }
  }
  return out;
}
