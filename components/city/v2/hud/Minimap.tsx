'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CityAgent, Category } from '@/components/city/types';
import { CATEGORIES, FRAMEWORK_COLORS } from '@/components/city/types';
import type { CharacterState } from '../character/CharacterController';
import {
  DISTRICT_COLS,
  DISTRICT_ROWS,
  DISTRICT_SIZE,
  DISTRICT_GAP,
  DISTRICT_STEP,
  WORLD_HALF,
} from '../world/grid';

// Minimap canvas size in CSS px. Doubled internally via DPR for
// crisp strokes on HiDPI displays.
const MAP_PX = 200;

// Same colors as DistrictPads.tsx — duplicated here because importing
// that file would pull in a bunch of three.js deps the minimap doesn't
// need. If these drift badly, promote to a shared constants module.
const CATEGORY_PAD_COLOR: Record<Category, string> = {
  automation: '#3b4b5c',
  business: '#1e3a8a',
  compliance: '#4a4a4a',
  creative: '#ff77a8',
  'customer-success': '#14b8a6',
  data: '#4c1d95',
  development: '#22c55e',
  devops: '#ea580c',
  ecommerce: '#f59e0b',
  education: '#3b82f6',
  finance: '#ca8a04',
  freelance: '#84cc16',
  healthcare: '#ef4444',
  hr: '#06b6d4',
  legal: '#1f2937',
  marketing: '#ec4899',
  moltbook: '#7c3aed',
  ollama: '#fbbf24',
  personal: '#64748b',
  productivity: '#10b981',
  'real-estate': '#8b5cf6',
  saas: '#38bdf8',
  security: '#dc2626',
  'supply-chain': '#a16207',
  voice: '#f472b6',
};

interface Props {
  state: CharacterState;
  agents: CityAgent[];
  /** If walk mode is on, show the character dot. In survey mode the
   *  character isn't spawned so we hide it to avoid a confusing dot at
   *  origin. */
  showCharacter: boolean;
  /** Click-to-fast-travel handler — fires when the user clicks inside
   *  a district square on the minimap. */
  onTravel?: (category: Category) => void;
}

/**
 * 200×200 minimap in the top-right corner. Shows:
 *   - 25 district squares tinted by their category color
 *   - the character's position (if walk mode)
 *   - every agent as a small framework-colored dot
 *
 * No click-to-teleport yet; walk mode fast-travel pads ship next.
 */
export function Minimap({ state, agents, showCharacter, onTravel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dprRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio : 1);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      draw(canvasRef.current, state, agents, showCharacter, dprRef.current);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [state, agents, showCharacter]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onTravel) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const mz = e.clientY - rect.top;
    // Inverse of toMap — minimap px → world (x, z)
    const wx = (mx / MAP_PX) * WORLD_HALF * 2 - WORLD_HALF;
    const wz = (mz / MAP_PX) * WORLD_HALF * 2 - WORLD_HALF;
    // Find the nearest district
    const step = DISTRICT_STEP;
    const totalRows = DISTRICT_ROWS;
    let best: { cat: Category; d2: number } | null = null;
    CATEGORIES.forEach((cat, idx) => {
      const col = idx % DISTRICT_COLS;
      const row = Math.floor(idx / DISTRICT_COLS);
      const cx = (col - (DISTRICT_COLS - 1) / 2) * step;
      const cz = (row - (totalRows - 1) / 2) * step;
      const d2 = (wx - cx) ** 2 + (wz - cz) ** 2;
      if (!best || d2 < best.d2) best = { cat, d2 };
    });
    if (best && (best as { cat: Category; d2: number }).d2 < (DISTRICT_SIZE * 0.8) ** 2) {
      onTravel((best as { cat: Category; d2: number }).cat);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
        background: 'rgba(5,8,20,0.75)',
        border: '1px solid rgba(251,191,36,0.45)',
        borderRadius: 6,
        padding: 6,
      }}
    >
      <canvas
        ref={canvasRef}
        width={MAP_PX * dprRef.current}
        height={MAP_PX * dprRef.current}
        onClick={handleClick}
        style={{ width: MAP_PX, height: MAP_PX, display: 'block', cursor: onTravel ? 'crosshair' : 'default' }}
      />
      <div
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 8,
          color: '#fbbf24',
          letterSpacing: 1,
          marginTop: 4,
          textAlign: 'center',
        }}
      >
        CITY MAP — CLICK TO TRAVEL
      </div>
    </div>
  );
}

function draw(
  canvas: HTMLCanvasElement | null,
  state: CharacterState,
  agents: CityAgent[],
  showCharacter: boolean,
  dpr: number,
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = MAP_PX * dpr;

  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.scale(dpr, dpr);

  // Background — deep indigo that matches scene background
  ctx.fillStyle = '#070420';
  ctx.fillRect(0, 0, MAP_PX, MAP_PX);

  // Convert world (x, z) in [-WORLD_HALF, +WORLD_HALF] to minimap px
  const toMap = (x: number, z: number) => ({
    mx: ((x + WORLD_HALF) / (WORLD_HALF * 2)) * MAP_PX,
    mz: ((z + WORLD_HALF) / (WORLD_HALF * 2)) * MAP_PX,
  });

  // Street grid — faint cyan lines so the map visually matches the
  // ground grid in the scene.
  ctx.strokeStyle = 'rgba(80, 200, 255, 0.18)';
  ctx.lineWidth = 1;
  const step = DISTRICT_STEP;
  const totalRows = DISTRICT_ROWS;
  ctx.beginPath();
  for (let r = 0; r <= totalRows; r++) {
    const z = (r - totalRows / 2) * step - DISTRICT_GAP / 2;
    const { mz } = toMap(0, z);
    ctx.moveTo(0, mz);
    ctx.lineTo(MAP_PX, mz);
  }
  for (let c = 0; c <= DISTRICT_COLS; c++) {
    const x = (c - DISTRICT_COLS / 2) * step - DISTRICT_GAP / 2;
    const { mx } = toMap(x, 0);
    ctx.moveTo(mx, 0);
    ctx.lineTo(mx, MAP_PX);
  }
  ctx.stroke();

  // District squares
  const padPx = (DISTRICT_SIZE / (WORLD_HALF * 2)) * MAP_PX;
  CATEGORIES.forEach((cat, idx) => {
    const col = idx % DISTRICT_COLS;
    const row = Math.floor(idx / DISTRICT_COLS);
    const wx = (col - (DISTRICT_COLS - 1) / 2) * step;
    const wz = (row - (totalRows - 1) / 2) * step;
    const { mx, mz } = toMap(wx - DISTRICT_SIZE / 2, wz - DISTRICT_SIZE / 2);
    ctx.fillStyle = CATEGORY_PAD_COLOR[cat] + 'bb'; // 73% alpha
    ctx.fillRect(mx, mz, padPx, padPx);
  });

  // Agent dots — one per agent, tinted by framework. Skipping NPC
  // sampling — we want every agent visible on the map, not just the
  // 100 wandering ones.
  for (const a of agents) {
    const idx = CATEGORIES.indexOf(a.category);
    if (idx < 0) continue;
    const col = idx % DISTRICT_COLS;
    const row = Math.floor(idx / DISTRICT_COLS);
    const cx = (col - (DISTRICT_COLS - 1) / 2) * step;
    const cz = (row - (totalRows - 1) / 2) * step;
    // Cheap deterministic offset inside the district pad so dots
    // don't all stack in a line. Same formula flavor as Buildings.layout.
    const hx = hashStr(a.id + ':mx') - 0.5;
    const hz = hashStr(a.id + ':mz') - 0.5;
    const wx = cx + hx * (DISTRICT_SIZE - 6);
    const wz = cz + hz * (DISTRICT_SIZE - 6);
    const { mx, mz } = toMap(wx, wz);
    ctx.fillStyle = '#' + FRAMEWORK_COLORS[a.framework].toString(16).padStart(6, '0');
    ctx.fillRect(mx - 1, mz - 1, 2, 2);
  }

  // Character — pulsing gold dot with a heading wedge
  if (showCharacter) {
    const { mx, mz } = toMap(state.position.x, state.position.z);
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 250);

    // Heading wedge — cheap indicator of which way they're facing
    ctx.save();
    ctx.translate(mx, mz);
    ctx.rotate(state.cameraYaw);
    ctx.fillStyle = 'rgba(255, 215, 100, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-5, 12);
    ctx.lineTo(5, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dot
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(mx, mz, 3 + pulse * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Border
  ctx.strokeStyle = 'rgba(251,191,36,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, MAP_PX - 1, MAP_PX - 1);

  ctx.restore();
  void THREE; // keep import so bundler doesn't drop it if agents use it
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}
