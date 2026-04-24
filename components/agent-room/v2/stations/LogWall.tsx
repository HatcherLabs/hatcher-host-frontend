'use client';
import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { api } from '@/lib/api';
import { ProximityHalo } from './ProximityHalo';

interface Props {
  station: Station;
  framework: string;
  agentId: string;
  onClick: () => void;
  isNear?: boolean;
}

export function LogWall({ station, framework, agentId, onClick, isNear }: Props) {
  const palette = paletteFor(framework);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await api.getAgentLogs(agentId);
        const raw = (res as { data?: { logs?: unknown } }).data?.logs ?? (res as { logs?: unknown }).logs;
        let arr: string[] = [];
        if (Array.isArray(raw)) {
          arr = raw.map(l => (typeof l === 'string' ? l : JSON.stringify(l)));
        } else if (typeof raw === 'string') {
          arr = raw.split('\n');
        }
        if (alive) setLines(arr.slice(-20));
      } catch {
        // agent stopped or forbidden — leave prior lines
      } finally {
        if (alive) t = setTimeout(tick, 5_000);
      }
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [agentId]);

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={palette.primary} active={!!isNear} />
      {/* Neon frame — behind everything */}
      <mesh position={[0, 2.2, -0.02]}>
        <planeGeometry args={[3.1, 2.1]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} />
      </mesh>
      {/* Wall plane — opaque black, in front of the frame */}
      <mesh position={[0, 2.2, 0]}>
        <planeGeometry args={[3.0, 2.0]} />
        <meshBasicMaterial color={0x000000} />
      </mesh>
      <Html
        position={[0, 2.2, 0.05]}
        transform
        occlude="blending"
        distanceFactor={4}
        zIndexRange={[10, 0]}
        style={{ width: 280, height: 180, pointerEvents: 'none' }}
      >
        <div
          className="h-full w-full overflow-hidden bg-black p-2 font-mono text-[8px] leading-tight"
          style={{ color: palette.primary }}
        >
          {lines.length === 0 ? (
            <div className="opacity-50">— no recent logs —</div>
          ) : (
            lines.map((line, i) => (
              <div key={i} className="truncate" style={{ opacity: 0.35 + (i / Math.max(1, lines.length - 1)) * 0.65 }}>
                {line}
              </div>
            ))
          )}
        </div>
      </Html>
      <Html position={[0, 3.7, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
          style={{
            borderColor: palette.primary,
            background: isNear ? `${palette.primary}cc` : 'rgba(0,0,0,0.55)',
            color: isNear ? '#000' : '#fff',
          }}
        >
          📜 Logs
        </div>
      </Html>
    </group>
  );
}
