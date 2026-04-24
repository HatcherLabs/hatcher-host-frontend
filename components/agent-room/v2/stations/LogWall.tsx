'use client';
import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { api } from '@/lib/api';

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
      {/* Wall plane */}
      <mesh position={[0, 2.2, 0]}>
        <planeGeometry args={[3.6, 2.6]} />
        <meshBasicMaterial color={0x000000} />
      </mesh>
      {/* Neon frame */}
      <mesh position={[0, 2.2, -0.01]}>
        <planeGeometry args={[3.7, 2.7]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} />
      </mesh>
      <Html position={[0, 2.2, 0.02]} transform distanceFactor={4} zIndexRange={[10, 0]} style={{ width: 340, height: 240 }}>
        <div
          className="pointer-events-none h-full w-full overflow-hidden rounded bg-black p-2 font-mono text-[9px] leading-snug"
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
