'use client';
import { Suspense } from 'react';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { paletteFor as legacyPaletteFor } from '../three-palette';
import { AgentBody } from './AgentBody';
import { ProximityHalo } from './ProximityHalo';

interface Props {
  station: Station;
  framework: string;
  onClick: () => void;
  isNear?: boolean;
  hideLabel?: boolean;
  agentName?: string;
  isStreaming?: boolean;
  agentId?: string;
  status?: string;
}

export function AgentAvatar({
  station,
  framework,
  onClick,
  isNear,
  hideLabel,
  agentName,
  isStreaming,
  agentId,
  status,
}: Props) {
  const palette = paletteFor(framework);
  const roomPrimary = framework === 'openclaw' ? '#39ff88' : palette.primary;
  const roomAccent = framework === 'openclaw' ? '#facc15' : palette.accent;
  const legacyBase = legacyPaletteFor(framework);
  const legacyPalette = framework === 'openclaw'
    ? {
      ...legacyBase,
      primary: 0x39ff88,
      dim: 0x16a34a,
      bright: 0xb9ffd4,
      primaryHex: '#39ff88',
      dimHex: '#16a34a',
      brightHex: '#b9ffd4',
    }
    : legacyBase;

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]}>
      <ProximityHalo color={roomPrimary} active={!!isNear} radius={1.8} />
      <Suspense fallback={null}>
        <AgentBody
          framework={framework}
          agentId={agentId}
          palette={legacyPalette}
          isStreaming={!!isStreaming}
          status={status}
        />
      </Suspense>
      {/* Floating name tag above the robot */}
      {agentName && (
        <Html position={[0, 3.4, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
          <div
            className="pointer-events-none whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium backdrop-blur"
            style={{
              borderColor: roomPrimary,
              background: 'rgba(0,0,0,0.5)',
              color: roomAccent,
              boxShadow: `0 0 14px ${roomPrimary}66`,
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
      {!hideLabel && isNear && (
        <Html position={[0, 2.8, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="pointer-events-auto whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium backdrop-blur transition"
            style={{
              borderColor: roomPrimary,
              background: isNear ? roomPrimary : 'rgba(0,0,0,0.55)',
              color: isNear ? '#000' : '#fff',
              boxShadow: isNear ? `0 0 18px ${roomPrimary}` : 'none',
            }}
          >
            💬 Talk
          </button>
        </Html>
      )}
    </group>
  );
}
