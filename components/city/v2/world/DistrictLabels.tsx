'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Category } from '@/components/city/types';
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_ICON } from '@/components/city/types';

const DISTRICT_COLS = 5;
const DISTRICT_SIZE = 52;
const DISTRICT_GAP = 14;
const LABEL_Y = 22; // above the tallest skyscraper

function districtPosition(idx: number): { x: number; z: number } {
  const col = idx % DISTRICT_COLS;
  const row = Math.floor(idx / DISTRICT_COLS);
  const totalRows = Math.ceil(CATEGORIES.length / DISTRICT_COLS);
  const step = DISTRICT_SIZE + DISTRICT_GAP;
  return {
    x: (col - (DISTRICT_COLS - 1) / 2) * step,
    z: (row - (totalRows - 1) / 2) * step,
  };
}

/**
 * Floating district name above each pad. Sprite so it always faces
 * the camera; disappears below a polar angle threshold (handled by
 * size falloff) so walking under it doesn't show tiny text above your
 * head.
 */
export function DistrictLabels() {
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
}: {
  x: number;
  z: number;
  label: string;
  icon: string;
}) {
  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    // Translucent pill background for contrast against skybox
    ctx.fillStyle = 'rgba(5,8,20,0.82)';
    const r = 22;
    roundRect(ctx, 4, 4, 760, 152, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(124, 216, 255, 0.65)';
    ctx.lineWidth = 2;
    roundRect(ctx, 4, 4, 760, 152, r);
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
    ctx.fillText(label.toUpperCase(), 170, 82);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  }, [label, icon]);

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
