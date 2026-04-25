'use client';
import { Suspense } from 'react';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { paletteFor as legacyPaletteFor } from '../three-palette';
import { V2Robot } from './V2Robot';
import { ProximityHalo } from './ProximityHalo';

interface Props {
  station: Station;
  framework: string;
  onClick: () => void;
  isNear?: boolean;
  hideLabel?: boolean;
  agentName?: string;
  isStreaming?: boolean;
}

export function AgentAvatar({ station, framework, onClick, isNear, hideLabel, agentName, isStreaming }: Props) {
  const palette = paletteFor(framework);
  const legacyPalette = legacyPaletteFor(framework);

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]}>
      <ProximityHalo color={palette.primary} active={!!isNear} radius={1.8} />
      {/* V2Robot internally scales to 0.5 (≈2m tall) — smaller than the
          legacy GlbRobot's 0.55 + dropped the framework accessories.
          Accessories spin around the head and read as "extra floating
          hands" in a first-person view. */}
      <Suspense fallback={null}>
        <V2Robot palette={legacyPalette} isStreaming={!!isStreaming} />
      </Suspense>
      {/* Floating name tag above the robot */}
      {agentName && (
        <Html position={[0, 3.4, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
          <div
            className="pointer-events-none whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium backdrop-blur"
            style={{
              borderColor: palette.primary,
              background: 'rgba(0,0,0,0.5)',
              color: palette.accent,
              boxShadow: `0 0 14px ${palette.primary}66`,
            }}
          >
            {agentName}
          </div>
        </Html>
      )}
      <mesh position={[0, 1.0, 0]} onClick={onClick}>
        <cylinderGeometry args={[0.9, 0.9, 2.1, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {!hideLabel && (
        <Html position={[0, 2.8, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="pointer-events-auto whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium backdrop-blur transition"
            style={{
              borderColor: palette.primary,
              background: isNear ? palette.primary : 'rgba(0,0,0,0.55)',
              color: isNear ? '#000' : '#fff',
              boxShadow: isNear ? `0 0 18px ${palette.primary}` : 'none',
            }}
          >
            💬 Talk
          </button>
        </Html>
      )}
    </group>
  );
}
