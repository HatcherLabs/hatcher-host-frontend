'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityAgent, Category } from '@/components/city/types';
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_ICON } from '@/components/city/types';
import { districtPosition } from './grid';

const LABEL_Y = 22;

interface Props {
  agents: CityAgent[];
}

/**
 * Floating district name + population above each pad. Sprite so it
 * always faces the camera. Population is recomputed whenever the
 * agents array changes identity — the sprite texture is rebaked only
 * when the count for that district actually changes (baking 25 canvas
 * textures every render would flood the GC).
 */
export function DistrictLabels({ agents }: Props) {
  const counts = useMemo(() => {
    const m: Record<Category, number> = Object.fromEntries(
      CATEGORIES.map((c) => [c, 0]),
    ) as Record<Category, number>;
    for (const a of agents) if (a.category in m) m[a.category]++;
    return m;
  }, [agents]);

  return (
    <group>
      {CATEGORIES.map((cat, idx) => {
        const pos = districtPosition(idx);
        return (
          <DistrictLabel
            key={cat}
            x={pos.x}
            z={pos.z}
            label={CATEGORY_LABELS[cat]}
            icon={CATEGORY_ICON[cat]}
            count={counts[cat]}
          />
        );
      })}
    </group>
  );
}

function DistrictLabel({
  x,
  z,
  label,
  icon,
  count,
}: {
  x: number;
  z: number;
  label: string;
  icon: string;
  count: number;
}) {
  // See LiveBillboard for the same pattern — dispose the old
  // SpriteMaterial + CanvasTexture when the count changes so agent
  // growth over time doesn't leak GPU memory.
  const prevRef = useRef<{ mat: THREE.Material; tex: THREE.Texture } | null>(null);
  useEffect(() => {
    return () => {
      prevRef.current?.mat.dispose();
      prevRef.current?.tex.dispose();
      prevRef.current = null;
    };
  }, []);

  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(5,8,20,0.82)';
    roundRect(ctx, 4, 4, 760, 152, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(124, 216, 255, 0.65)';
    ctx.lineWidth = 2;
    roundRect(ctx, 4, 4, 760, 152, 22);
    ctx.stroke();
    // Icon
    ctx.font = '82px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(icon, 90, 82);
    // Label
    ctx.font = 'bold 44px "Press Start 2P", monospace';
    ctx.fillStyle = '#7ad8ff';
    ctx.textAlign = 'left';
    ctx.fillText(label.toUpperCase(), 170, 70);
    // Count subline
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${count} ${count === 1 ? 'AGENT' : 'AGENTS'}`, 170, 118);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    prevRef.current?.mat.dispose();
    prevRef.current?.tex.dispose();
    prevRef.current = { mat, tex };
    return mat;
  }, [label, icon, count]);

  return (
    <sprite position={[x, LABEL_Y, z]} scale={[16, 3.3, 1]} material={material} />
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
