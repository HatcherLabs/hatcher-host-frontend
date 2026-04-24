'use client';
import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import type { StationLayout } from '../world/layout';
import { ROOM_SIZE } from '../world/grid';
import { paletteFor } from '../colors';

const SIZE = 160;

interface Props {
  layout: StationLayout;
  playerPos: React.MutableRefObject<THREE.Vector3>;
  framework: string;
}

export function RoomMinimap({ layout, playerPos, framework }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const palette = paletteFor(framework);

  useEffect(() => {
    let frame = 0;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, SIZE - 2, SIZE - 2);

      const scale = (SIZE - 16) / ROOM_SIZE;
      for (const s of Object.values(layout)) {
        const x = SIZE / 2 + s.position[0] * scale;
        const y = SIZE / 2 + s.position[2] * scale;
        ctx.fillStyle = palette.accent;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      const px = SIZE / 2 + playerPos.current.x * scale;
      const py = SIZE / 2 + playerPos.current.z * scale;
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [layout, playerPos, palette]);

  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      className="fixed bottom-4 left-4 z-30 hidden rounded-lg border border-white/10 sm:block"
    />
  );
}
