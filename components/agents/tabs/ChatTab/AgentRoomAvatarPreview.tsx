'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AgentBody, normalizeAvatarVariant, type RoomEmoteId } from '@/components/agent-room/v2/stations/AgentBody';
import { paletteFor, type FrameworkPalette } from '@/components/agent-room/v2/three-palette';

interface AgentRoomAvatarPreviewProps {
  agentId: string;
  framework: string;
  status: string;
  avatarVariant?: unknown;
  avatarTraits?: unknown;
  activeEmote?: RoomEmoteId | null;
  emoteNonce?: number;
  isStreaming?: boolean;
}

function roomPaletteFor(framework: string): FrameworkPalette {
  const base = paletteFor(framework);
  if (framework !== 'openclaw') return base;
  return {
    ...base,
    primary: 0x39ff88,
    dim: 0x16a34a,
    bright: 0xb9ffd4,
    primaryHex: '#39ff88',
    dimHex: '#16a34a',
    brightHex: '#b9ffd4',
  };
}

function CameraTarget() {
  const target = useMemo(() => new THREE.Vector3(0, 0.92, 0), []);
  useFrame(({ camera }) => {
    camera.lookAt(target);
  });
  return null;
}

function AvatarRig({
  agentId,
  framework,
  status,
  avatarVariant,
  avatarTraits,
  activeEmote,
  emoteNonce,
  isStreaming,
}: AgentRoomAvatarPreviewProps) {
  const root = useRef<THREE.Group>(null);
  const palette = useMemo(() => roomPaletteFor(framework), [framework]);
  const normalizedVariant = useMemo(() => normalizeAvatarVariant(avatarVariant), [avatarVariant]);

  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.rotation.y = Math.PI + Math.sin(clock.elapsedTime * 0.42) * 0.08;
  });

  return (
    <group ref={root} position={[0, -0.12, 0]} scale={1}>
      <AgentBody
        framework={framework}
        agentId={agentId}
        palette={palette}
        status={status}
        avatarVariant={normalizedVariant}
        avatarTraits={avatarTraits}
        activeEmote={activeEmote}
        emoteNonce={emoteNonce}
        isStreaming={isStreaming}
        showStatusAura={false}
      />
    </group>
  );
}

export function AgentRoomAvatarPreview(props: AgentRoomAvatarPreviewProps) {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 1.12, 5.05], fov: 32, near: 0.1, far: 100 }}
      dpr={[1, 1.8]}
    >
      <CameraTarget />
      <ambientLight intensity={0.95} color="#fff1dc" />
      <hemisphereLight color="#fff7e6" groundColor="#263247" intensity={1.1} />
      <directionalLight position={[-3.2, 4.5, 4.2]} intensity={1.4} color="#ffd9a0" />
      <directionalLight position={[3.4, 2.8, 2.6]} intensity={0.56} color="#87dfff" />
      <Suspense fallback={null}>
        <AvatarRig {...props} />
      </Suspense>
    </Canvas>
  );
}
