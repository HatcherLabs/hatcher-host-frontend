'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Category } from '@/components/city/types';
import { CATEGORIES } from '@/components/city/types';
import { DISTRICT_SIZE, districtPosition } from './grid';

const PAD_Y = 0.01;

// One base color per category. Tuned for distinctiveness at survey
// distance, not brand fidelity — each landmark (Phase 3) reinforces
// its district with a more distinctive prop.
const CATEGORY_PAD_COLOR: Record<Category, number> = {
  automation: 0x3b4b5c,
  business: 0x1e3a8a,
  compliance: 0x4a4a4a,
  creative: 0xff77a8,
  'customer-success': 0x14b8a6,
  data: 0x4c1d95,
  development: 0x22c55e,
  devops: 0xea580c,
  ecommerce: 0xf59e0b,
  education: 0x3b82f6,
  finance: 0xca8a04,
  freelance: 0x84cc16,
  healthcare: 0xef4444,
  hr: 0x06b6d4,
  legal: 0x1f2937,
  marketing: 0xec4899,
  moltbook: 0x7c3aed,
  ollama: 0xfbbf24,
  personal: 0x64748b,
  productivity: 0x10b981,
  'real-estate': 0x8b5cf6,
  saas: 0x38bdf8,
  security: 0xdc2626,
  'supply-chain': 0xa16207,
  voice: 0xf472b6,
};

/**
 * 25 themed ground pads, one per category. Sits on top of the asphalt
 * Ground but under Streets so the road grid cuts through district
 * boundaries visually. Phase 3 will add a central landmark per pad.
 */
export function DistrictPads() {
  return (
    <group>
      {CATEGORIES.map((cat, idx) => {
        const pos = districtPosition(idx);
        return <DistrictPad key={cat} category={cat} x={pos.x} z={pos.z} />;
      })}
    </group>
  );
}

function DistrictPad({
  category,
  x,
  z,
}: {
  category: Category;
  x: number;
  z: number;
}) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CATEGORY_PAD_COLOR[category],
        roughness: 0.85,
        metalness: 0.05,
      }),
    [category],
  );
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[x, PAD_Y, z]}
      receiveShadow
      material={mat}
    >
      <planeGeometry args={[DISTRICT_SIZE, DISTRICT_SIZE]} />
    </mesh>
  );
}
