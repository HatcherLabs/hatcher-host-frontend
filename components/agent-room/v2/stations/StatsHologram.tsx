'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';

interface Props {
  station: Station;
  framework: string;
  tier?: string;
  messagesToday?: number;
  uptimeSec?: number;
  status?: string;
  xp?: number;
  xpMax?: number;
}

export function StatsHologram({
  station,
  framework,
  tier,
  messagesToday,
  uptimeSec,
  status,
  xp = 0,
  xpMax = 100,
}: Props) {
  const palette = paletteFor(framework);
  const xpPct = Math.min(1, xp / Math.max(1, xpMax));
  const mins = uptimeSec ? Math.floor(uptimeSec / 60) : 0;

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]}>
      {/* Pedestal */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.65, 0.5, 16]} />
        <meshStandardMaterial color={0x22222a} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Glowing ring */}
      <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.62, 32]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} side={2} />
      </mesh>
      {/* Beam to hologram */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.35, 0.2, 1.4, 16, 1, true]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} transparent opacity={0.1} side={2} depthWrite={false} />
      </mesh>
      {/* Hologram HTML */}
      <Html position={[0, 1.85, 0]} center distanceFactor={6}>
        <div
          className="pointer-events-none w-60 rounded-lg border p-3 text-center font-mono text-[10px]"
          style={{
            borderColor: palette.primary,
            background: `linear-gradient(180deg, ${palette.primary}22 0%, transparent 100%)`,
            color: palette.accent,
            boxShadow: `0 0 20px ${palette.primary}66`,
          }}
        >
          <div className="mb-1 text-[9px] uppercase tracking-widest" style={{ color: palette.primary }}>Agent Stats</div>
          <div className="mt-1.5 flex justify-between"><span>Status</span><span className="truncate">{status ?? '—'}</span></div>
          <div className="mt-0.5 flex justify-between"><span>Tier</span><span>{tier ?? '—'}</span></div>
          <div className="mt-0.5 flex justify-between"><span>Msgs today</span><span>{messagesToday ?? '—'}</span></div>
          <div className="mt-0.5 flex justify-between"><span>Uptime</span><span>{uptimeSec ? `${mins}m` : '—'}</span></div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded bg-black/40">
            <div className="h-full" style={{ width: `${xpPct * 100}%`, background: palette.primary }} />
          </div>
          <div className="mt-0.5 text-[8px] opacity-70">XP {xp} / {xpMax}</div>
        </div>
      </Html>
    </group>
  );
}
