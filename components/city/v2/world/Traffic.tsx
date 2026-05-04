'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQuality } from '../quality/QualityContext';
import {
  DISTRICT_COLS,
  DISTRICT_ROWS,
  DISTRICT_STEP,
} from './grid';

const STREET_Y = 0.18;
const LANE_HALF = 2.5;

/**
 * Ambient hover traffic moving along street centrelines. Vehicles are
 * built from a handful of instanced parts so the scene reads as
 * futuristic traffic without paying per-car React reconciliation cost.
 */
export function Traffic() {
  const quality = useQuality();
  const count = quality === 'high' ? 40 : 12;

  const { bodyMat, canopyMat, wingMat, underMat, headMat, tailMat, trailMat } = useMemo(() => {
    return {
      bodyMat: new THREE.MeshStandardMaterial({
        color: 0x111826,
        emissive: 0x08243a,
        emissiveIntensity: 0.45,
        roughness: 0.34,
        metalness: 0.78,
        envMapIntensity: 0.18,
      }),
      canopyMat: new THREE.MeshPhysicalMaterial({
        color: 0x9cf5ff,
        emissive: 0x39cfff,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.58,
        roughness: 0.08,
        metalness: 0.08,
        transmission: 0.2,
      }),
      wingMat: new THREE.MeshStandardMaterial({
        color: 0x172033,
        emissive: 0x0e3c5f,
        emissiveIntensity: 0.42,
        roughness: 0.38,
        metalness: 0.7,
      }),
      underMat: new THREE.MeshBasicMaterial({
        color: 0x51f0ff,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        toneMapped: false,
      }),
      headMat: new THREE.MeshStandardMaterial({
        color: 0xcff8ff,
        emissive: 0x8ef7ff,
        emissiveIntensity: 4.5,
        roughness: 0.2,
        metalness: 0.1,
      }),
      tailMat: new THREE.MeshStandardMaterial({
        color: 0xff4f8b,
        emissive: 0xff1f6a,
        emissiveIntensity: 4,
        roughness: 0.3,
        metalness: 0.1,
      }),
      trailMat: new THREE.MeshBasicMaterial({
        color: 0x5df7ff,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, []);

  // Precompute one Lane per vehicle — evenly split between horizontal
  // and vertical streets. Each lane owns axis, offset, direction, and
  // a random phase so vehicles don't move in lockstep.
  const lanes = useMemo(() => buildLanes(count), [count]);

  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const wingRef = useRef<THREE.InstancedMesh>(null);
  const underRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const tailRef = useRef<THREE.InstancedMesh>(null);
  const trailRef = useRef<THREE.InstancedMesh>(null);

  useFrame(({ clock }) => {
    if (
      !bodyRef.current ||
      !canopyRef.current ||
      !wingRef.current ||
      !underRef.current ||
      !headRef.current ||
      !tailRef.current ||
      !trailRef.current
    ) return;
    const t = clock.getElapsedTime();
    const obj = new THREE.Object3D();
    const base = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const setPart = (
      mesh: THREE.InstancedMesh,
      index: number,
      localOffset: [number, number, number],
      scale: [number, number, number],
    ) => {
      offset.set(localOffset[0], localOffset[1], localOffset[2]).applyQuaternion(quat);
      obj.position.copy(base).add(offset);
      obj.quaternion.copy(quat);
      obj.scale.set(scale[0], scale[1], scale[2]);
      obj.updateMatrix();
      mesh.setMatrixAt(index, obj.matrix);
    };

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

      const float = Math.sin(t * 2.4 + l.phase * 0.07) * 0.08;
      base.set(x, STREET_Y + 0.56 + float, z);
      quat.setFromEuler(new THREE.Euler(0, rotY, 0));

      setPart(bodyRef.current!, i, [0, 0, 0], [2.6, 0.5, 1.06]);
      setPart(canopyRef.current!, i, [0.28, 0.34, 0], [0.96, 0.36, 0.62]);
      setPart(wingRef.current!, i, [-0.1, -0.02, 0], [1.72, 0.1, 1.7]);
      setPart(underRef.current!, i, [0, -0.32, 0], [2.18, 0.035, 1.08]);
      setPart(headRef.current!, i, [1.35, 0.05, 0], [0.18, 0.12, 0.72]);
      setPart(tailRef.current!, i, [-1.34, 0.03, 0], [0.2, 0.12, 0.68]);
      setPart(trailRef.current!, i, [-1.82, -0.02, 0], [1.0, 0.055, 0.92]);
    });
    bodyRef.current.instanceMatrix.needsUpdate = true;
    canopyRef.current.instanceMatrix.needsUpdate = true;
    wingRef.current.instanceMatrix.needsUpdate = true;
    underRef.current.instanceMatrix.needsUpdate = true;
    headRef.current.instanceMatrix.needsUpdate = true;
    tailRef.current.instanceMatrix.needsUpdate = true;
    trailRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={bodyMat} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.5, 16, 10]} />
        <primitive attach="material" object={canopyMat} />
      </instancedMesh>
      <instancedMesh ref={wingRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={wingMat} />
      </instancedMesh>
      <instancedMesh ref={underRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={underMat} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={headMat} />
      </instancedMesh>
      <instancedMesh ref={tailRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={tailMat} />
      </instancedMesh>
      <instancedMesh ref={trailRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={trailMat} />
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

  // Street centrelines — same math as Streets.tsx (gap centres, no
  // half-gap shift).
  const horizontalZs: number[] = [];
  for (let r = 0; r <= totalRows; r++) {
    horizontalZs.push((r - totalRows / 2) * step);
  }
  const verticalXs: number[] = [];
  for (let c = 0; c <= DISTRICT_COLS; c++) {
    verticalXs.push((c - DISTRICT_COLS / 2) * step);
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
