'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  CharacterController,
  MouseLook,
  FirstPersonCamera,
  MobileJoystick,
  type CharacterState,
} from './character';
import { getStationLayout, type StationId, type StationLayout } from './world/layout';
import { collidersFromLayout, wallColliders } from './world/colliders';
import { AgentAvatar } from './stations/AgentAvatar';
import type { RoomEmoteId } from './stations/AgentBody';
import { RoomOffice } from './world/RoomOffice';
import type { Quality } from './quality';

interface Props {
  agentId: string;
  framework: string;
  posRef: React.MutableRefObject<THREE.Vector3>;
  status: string;
  tier?: string;
  messagesToday?: number;
  uptimeSec?: number;
  logLines?: string[];
  eyesSnapshotDataUrl?: string;
  connectedIntegrations: Set<string>;
  nearest: StationId | null;
  canEdit: boolean;
  hasMemory: boolean;
  quality: Quality;
  isChatStreaming?: boolean;
  avatarVariant?: string | null;
  avatarTraits?: unknown;
  activeEmote?: RoomEmoteId | null;
  emoteNonce?: number;
  onStationClick: (id: StationId) => void;
}

function SyncPos({
  state,
  target,
}: {
  state: CharacterState;
  target: React.MutableRefObject<THREE.Vector3>;
}) {
  useFrame(() => {
    target.current.copy(state.position);
  });
  return null;
}

export function AgentRoomSceneV2({
  agentId,
  framework,
  posRef,
  status,
  tier,
  messagesToday,
  uptimeSec,
  logLines = [],
  eyesSnapshotDataUrl,
  connectedIntegrations,
  nearest,
  canEdit,
  hasMemory,
  quality,
  isChatStreaming,
  avatarVariant,
  avatarTraits,
  activeEmote,
  emoteNonce,
  onStationClick,
}: Props) {
  const charState = useMemo<CharacterState>(
    () => ({
      position: new THREE.Vector3(0, 0, 6.15),
      heading: Math.PI,
      cameraYaw: 0,
      cameraPitch: -0.02,
    }),
    [],
  );

  const analogRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const layout: StationLayout = useMemo(() => getStationLayout(framework), [framework]);
  const solids = useMemo(() => [...collidersFromLayout(layout), ...wallColliders()], [layout]);

  return (
    <>
      <Canvas
        shadows={quality === 'high'}
        camera={{ position: [0, 1.48, 6.15], fov: 72 }}
        dpr={quality === 'low' ? [1, 1.5] : [1, 2]}
      >
        <color attach="background" args={['#182235']} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.82} color="#fff1dc" />
          <hemisphereLight color="#fff7e6" groundColor="#4a321f" intensity={0.96} />
          <directionalLight
            position={[-9, 10, 6]}
            intensity={1.18}
            color="#ffd9a0"
            castShadow={quality === 'high'}
          />
          <RoomOffice
            layout={layout}
            framework={framework}
            status={status}
            tier={tier}
            messagesToday={messagesToday}
            uptimeSec={uptimeSec}
            logLines={logLines}
            eyesSnapshotDataUrl={eyesSnapshotDataUrl}
            connectedIntegrations={connectedIntegrations}
            nearest={nearest}
            canEdit={canEdit}
            hasMemory={hasMemory}
            onStationClick={onStationClick}
          />

          <AgentAvatar
            station={layout.agentAvatar}
            framework={framework}
            agentId={agentId}
            status={status}
            onClick={() => onStationClick('agentAvatar')}
            isNear={nearest === 'agentAvatar'}
            isStreaming={isChatStreaming}
            avatarVariant={avatarVariant}
            avatarTraits={avatarTraits}
            activeEmote={activeEmote}
            emoteNonce={emoteNonce}
          />
          <CharacterController
            state={charState}
            analog={analogRef.current}
            solids={solids}
            speed={6}
            characterRadius={0.6}
          />
          <FirstPersonCamera state={charState} />
          <MouseLook state={charState} />
          <SyncPos state={charState} target={posRef} />
        </Suspense>
      </Canvas>
      <MobileJoystick
        onVector={(x, y) => {
          analogRef.current.x = x;
          analogRef.current.y = y;
        }}
      />
    </>
  );
}
