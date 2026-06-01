'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
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
        onCreated={({ gl }) => {
          // Match the House scene's grade (was unset/default) so the room reads
          // as a lit set and plays well with bloom.
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <color attach="background" args={['#182235']} />
        <Suspense fallback={null}>
          {/* Phase 1 polish: procedural IBL via Lightformers (no external HDRI —
              CSP-safe) gives the PBR robots/metals something to reflect, so they
              stop reading as matte plastic. Baked once (frames={1}). */}
          <Environment frames={1} resolution={256}>
            <Lightformer intensity={1.3} position={[0, 5, -3]} scale={[10, 5, 1]} color="#fff1dc" />
            <Lightformer intensity={0.7} position={[-7, 3, 5]} scale={[5, 4, 1]} color="#8fb4ff" />
            <Lightformer intensity={0.6} position={[7, 3, 5]} scale={[5, 4, 1]} color="#ffc6e0" />
            <Lightformer intensity={0.5} position={[0, -3, 2]} scale={[8, 3, 1]} color="#2a3550" />
          </Environment>
          <ambientLight intensity={0.82} color="#fff1dc" />
          <hemisphereLight color="#fff7e6" groundColor="#4a321f" intensity={0.96} />
          <directionalLight
            position={[-9, 10, 6]}
            intensity={1.18}
            color="#ffd9a0"
            castShadow={quality === 'high'}
          />
          {/* Grounded soft shadow under the agent so it doesn't float. */}
          <ContactShadows position={[0, 0.02, 0]} opacity={0.45} scale={22} blur={2.6} far={6} resolution={quality === 'low' ? 256 : 512} color="#0a0e16" />
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
        {/* Softer bloom than the city — lets the status aura, accent emissives
            and the eyes screen glow without washing out the interior. */}
        {quality !== 'low' ? (
          <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
            <Bloom mipmapBlur luminanceThreshold={0.78} luminanceSmoothing={0.2} intensity={0.6} radius={0.5} />
          </EffectComposer>
        ) : null}
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
