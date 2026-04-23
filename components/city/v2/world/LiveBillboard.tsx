'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CityAgent } from '@/components/city/types';
import { CATEGORIES } from '@/components/city/types';
import { districtPosition } from './grid';

const ROTATE_MS = 3000;

/**
 * A single billboard rising over the Marketing district showing the
 * currently-busiest agent on the platform on loop. Cheap canvas
 * texture re-baked every ROTATE_MS; no network calls, reads straight
 * from the shared agents array.
 */
export function LiveBillboard({ agents }: { agents: CityAgent[] }) {
  const marketingIdx = CATEGORIES.indexOf('marketing');
  const pos = districtPosition(marketingIdx >= 0 ? marketingIdx : 0);

  // Sort agents by messageCount, take top 6. Recompute only on agent
  // list identity change, not every render.
  const top = useMemo(() => {
    return [...agents]
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 6)
      .filter((a) => a.messageCount > 0);
  }, [agents]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (top.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % top.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [top]);

  // Hold a ref to the previous material + its texture so we can dispose
  // them when useMemo re-runs. Without this the 3s rotation leaks
  // ~1MB of GPU memory per tick on an open tab.
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
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(5,8,20,0.95)';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 1020, 252);

    const agent = top[idx];
    if (!agent) {
      ctx.fillStyle = '#7ad8ff';
      ctx.font = 'bold 36px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HATCHER.HOST', 512, 128);
    } else {
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 28px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('▲ TRENDING NOW', 40, 32);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 48px "Press Start 2P", monospace';
      ctx.fillText(agent.name.slice(0, 20).toUpperCase(), 40, 90);

      ctx.fillStyle = '#7ad8ff';
      ctx.font = '24px "Press Start 2P", monospace';
      ctx.fillText(
        `${agent.framework.toUpperCase()} · ${agent.messageCount} MSGS`,
        40,
        168,
      );
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    // Release the previous bake before stashing the new one — without
    // this the 3s rotation leaks ~1MB of GPU memory per tick.
    prevRef.current?.mat.dispose();
    prevRef.current?.tex.dispose();
    prevRef.current = { mat, tex };
    return mat;
  }, [top, idx]);

  // Bail if no qualifying agents — keep the district clean rather
  // than show a stale placeholder.
  if (top.length === 0) return null;

  // Billboard sits behind the Marketing district's own landmark,
  // elevated well above the rooftops so it reads at distance.
  return (
    <mesh position={[pos.x, 26, pos.z - 16]} material={material}>
      <planeGeometry args={[22, 5.5]} />
    </mesh>
  );
}
