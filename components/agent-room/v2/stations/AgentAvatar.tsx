'use client';
import { useFrame } from '@react-three/fiber';
import { Suspense, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Station } from '../world/layout';
import { paletteFor as legacyPaletteFor } from '../three-palette';
import { AgentBody, type RoomEmoteId } from './AgentBody';

export const AGENT_AVATAR_PLATFORM_Y = 0.34;

// Gentle idle breathing on the avatar so it never reads as a frozen statue.
// Dampens to near-zero while an emote plays so it doesn't fight the animation.
function BreathingWrap({ suppressed, children }: { suppressed: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const levelRef = useRef(1);
  useFrame(({ clock }, delta) => {
    const target = suppressed ? 0.15 : 1;
    levelRef.current += (target - levelRef.current) * Math.min(1, delta * 3);
    const lvl = levelRef.current;
    const t = clock.elapsedTime * 1.4;
    if (ref.current) {
      ref.current.position.y = Math.sin(t) * 0.012 * lvl;
      const s = 1 + Math.sin(t) * 0.006 * lvl;
      ref.current.scale.set(s, s, s);
    }
  });
  return <group ref={ref}>{children}</group>;
}

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
  avatarTraits?: unknown;
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
  avatarTraits,
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
          primary: 0xd6b177,
          dim: 0x8a6d45,
          bright: 0xffe4ad,
          primaryHex: '#D6B177',
          dimHex: '#8A6D45',
          brightHex: '#FFE4AD',
        }
      : legacyBase;
  const raisedPosition: [number, number, number] = [
    station.position[0],
    station.position[1] + AGENT_AVATAR_PLATFORM_Y,
    station.position[2],
  ];

  return (
    <group position={raisedPosition} rotation={[0, station.rotationY, 0]}>
      <Suspense fallback={null}>
        <BreathingWrap suppressed={!!activeEmote}>
          <AgentBody
            framework={framework}
            agentId={agentId}
            palette={legacyPalette}
            isStreaming={!!isStreaming}
            status={status}
            avatarVariant={avatarVariant}
            avatarTraits={avatarTraits}
            activeEmote={activeEmote}
            emoteNonce={emoteNonce}
          />
        </BreathingWrap>
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
