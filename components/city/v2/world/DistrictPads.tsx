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
  const { mat, edgeMat } = useMemo(() => {
    const accent = new THREE.Color(CATEGORY_PAD_COLOR[category]);
    const base = accent.clone().multiplyScalar(0.58).lerp(new THREE.Color(0x08121c), 0.24);
    return {
      mat: new THREE.MeshStandardMaterial({
        map: makePadTexture(accent),
        color: base,
        emissive: accent,
        emissiveIntensity: 0.22,
        roughness: 0.56,
        metalness: 0.34,
        envMapIntensity: 0.16,
      }),
      edgeMat: new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, [category]);

  const half = DISTRICT_SIZE / 2;
  return (
    <group position={[x, 0, z]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, PAD_Y, 0]}
        receiveShadow
        material={mat}
      >
        <planeGeometry args={[DISTRICT_SIZE, DISTRICT_SIZE]} />
      </mesh>
      {[
        { key: 'north', position: [0, PAD_Y + 0.035, -half] as const, size: [DISTRICT_SIZE, 0.05, 0.18] as const },
        { key: 'south', position: [0, PAD_Y + 0.035, half] as const, size: [DISTRICT_SIZE, 0.05, 0.18] as const },
        { key: 'west', position: [-half, PAD_Y + 0.035, 0] as const, size: [0.18, 0.05, DISTRICT_SIZE] as const },
        { key: 'east', position: [half, PAD_Y + 0.035, 0] as const, size: [0.18, 0.05, DISTRICT_SIZE] as const },
      ].map((edge) => (
        <mesh key={edge.key} position={edge.position} material={edgeMat}>
          <boxGeometry args={edge.size} />
        </mesh>
      ))}
    </group>
  );
}

function makePadTexture(accent: THREE.Color) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0a111b';
  ctx.fillRect(0, 0, size, size);

  const color = `rgb(${Math.round(accent.r * 255)}, ${Math.round(accent.g * 255)}, ${Math.round(accent.b * 255)})`;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  for (let i = -size; i < size * 2; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.36;
  ctx.strokeRect(18, 18, size - 36, size - 36);
  ctx.globalAlpha = 0.46;
  for (let i = 0; i < 4; i++) {
    const p = 34 + i * 42;
    ctx.fillStyle = color;
    ctx.fillRect(p, 34, 18, 3);
    ctx.fillRect(size - 52, p, 3, 18);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}
