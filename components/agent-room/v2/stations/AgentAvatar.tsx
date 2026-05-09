'use client';
import { Suspense } from 'react';
import type { Station } from '../world/layout';
import { paletteFor as legacyPaletteFor } from '../three-palette';
import { AgentBody, type RoomEmoteId } from './AgentBody';

interface Props {
  station: Station;
  framework: string;
  onClick: () => void;
  isNear?: boolean;
  hideLabel?: boolean;
  isStreaming?: boolean;
  agentId?: string;
  status?: string;
  avatarVariant?: string | null;
  activeEmote?: RoomEmoteId | null;
  emoteNonce?: number;
}

export function AgentAvatar({
  station,
  framework,
  onClick,
  isNear,
  hideLabel,
  isStreaming,
  agentId,
  status,
  avatarVariant,
  activeEmote,
  emoteNonce,
}: Props) {
  void isNear;
  void hideLabel;
  const legacyBase = legacyPaletteFor(framework);
  const legacyPalette =
    framework === 'openclaw'
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
      <Suspense fallback={null}>
        <AgentBody
          framework={framework}
          agentId={agentId}
          palette={legacyPalette}
          isStreaming={!!isStreaming}
          status={status}
          avatarVariant={avatarVariant}
          activeEmote={activeEmote}
          emoteNonce={emoteNonce}
        />
      </Suspense>
      <mesh position={[0, 1.0, 0]} onClick={onClick}>
        <cylinderGeometry args={[0.9, 0.9, 2.1, 12]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          colorWrite={false}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}
