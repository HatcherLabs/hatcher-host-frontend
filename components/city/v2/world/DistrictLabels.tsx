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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const panel = ctx.createLinearGradient(4, 4, 760, 156);
    panel.addColorStop(0, 'rgba(4, 12, 24, 0.9)');
    panel.addColorStop(0.5, 'rgba(6, 18, 31, 0.78)');
    panel.addColorStop(1, 'rgba(10, 8, 27, 0.88)');
    ctx.fillStyle = panel;
    chamferRect(ctx, 4, 4, 760, 152, 28);
    ctx.fill();

    ctx.shadowColor = 'rgba(98, 244, 255, 0.75)';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = 'rgba(124, 216, 255, 0.82)';
    ctx.lineWidth = 2;
    chamferRect(ctx, 4, 4, 760, 152, 28);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(140, 255, 218, 0.48)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(24, 28);
    ctx.lineTo(86, 28);
    ctx.moveTo(682, 132);
    ctx.lineTo(744, 132);
    ctx.stroke();

    ctx.fillStyle = 'rgba(124, 216, 255, 0.1)';
    chamferRect(ctx, 32, 24, 112, 112, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 255, 218, 0.62)';
    ctx.lineWidth = 2;
    chamferRect(ctx, 32, 24, 112, 112, 24);
    ctx.stroke();

    ctx.font = '72px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(icon, 88, 82);

    const title = label.toUpperCase();
    ctx.font = `bold ${fitFont(ctx, title, 42, 30, 486)}px "Press Start 2P", monospace`;
    ctx.fillStyle = '#7ad8ff';
    ctx.shadowColor = 'rgba(122, 216, 255, 0.65)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'left';
    ctx.fillText(title, 172, 64);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(172, 84, 512, 2);
    ctx.fillStyle = 'rgba(140, 255, 218, 0.6)';
    ctx.fillRect(172, 84, Math.min(80 + count * 7, 360), 2);

    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${count} ${count === 1 ? 'AGENT' : 'AGENTS'}`, 170, 118);

    ctx.fillStyle = 'rgba(124, 216, 255, 0.28)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(664 + i * 14, 42, 7, 52 - i * 5);
    }
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

function chamferRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cut: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  start: number,
  min: number,
  maxWidth: number,
) {
  let size = start;
  while (size > min) {
    ctx.font = `bold ${size}px "Press Start 2P", monospace`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}
