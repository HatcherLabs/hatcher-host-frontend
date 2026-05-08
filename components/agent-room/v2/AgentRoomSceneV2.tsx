'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, N8AO } from '@react-three/postprocessing';
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
  connectedIntegrations: Set<string>;
  pluginsInstalled: number;
  nearest: StationId | null;
  canEdit: boolean;
  hasMemory: boolean;
  quality: Quality;
  agentName?: string;
  isChatStreaming?: boolean;
  passportStatus?: 'registered' | 'wallet-ready' | 'planned' | 'unavailable' | 'server-unconfigured';
  onStationClick: (id: StationId) => void;
  onPassportClick: () => void;
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
  connectedIntegrations,
  pluginsInstalled,
  nearest,
  canEdit,
  hasMemory,
  quality,
  agentName,
  isChatStreaming,
  passportStatus,
  onStationClick,
  onPassportClick,
}: Props) {
  const charState = useMemo<CharacterState>(() => ({
    position: new THREE.Vector3(0, 0, 6.15),
    heading: Math.PI,
    cameraYaw: 0,
    cameraPitch: -0.02,
  }), []);

  const analogRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const layout: StationLayout = useMemo(() => getStationLayout(framework), [framework]);
  const solids = useMemo(
    () => [...collidersFromLayout(layout), ...wallColliders()],
    [layout],
  );

  return (
    <>
      <Canvas
        shadows={quality === 'high'}
        camera={{ position: [0, 1.48, 6.15], fov: 72 }}
        dpr={quality === 'low' ? [1, 1.5] : [1, 2]}
      >
        <color attach="background" args={['#121826']} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.64} color="#fff1dc" />
          <hemisphereLight color="#dbeafe" groundColor="#2a1f18" intensity={0.78} />
          <directionalLight
            position={[-9, 10, 6]}
            intensity={1.05}
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
            connectedIntegrations={connectedIntegrations}
            pluginsInstalled={pluginsInstalled}
            nearest={nearest}
            canEdit={canEdit}
            hasMemory={hasMemory}
            agentName={agentName}
            onStationClick={onStationClick}
          />

          <AgentAvatar
            station={layout.agentAvatar}
            framework={framework}
            agentId={agentId}
            status={status}
            onClick={() => onStationClick('agentAvatar')}
            isNear={nearest === 'agentAvatar'}
            agentName={agentName}
            isStreaming={isChatStreaming}
            passportStatus={passportStatus}
            onPassportClick={onPassportClick}
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
          {quality === 'high' ? (
            <EffectComposer multisampling={0} enableNormalPass={false}>
              <N8AO
                aoRadius={2.2}
                distanceFalloff={1.8}
                intensity={1.15}
                quality="medium"
              />
              <Bloom
                intensity={0.45}
                luminanceThreshold={0.95}
                luminanceSmoothing={0.25}
                mipmapBlur
              />
            </EffectComposer>
          ) : quality === 'medium' ? (
            <EffectComposer multisampling={0} enableNormalPass={false}>
              <N8AO
                aoRadius={2.2}
                distanceFalloff={1.8}
                intensity={0.75}
                quality="performance"
                halfRes
              />
              <Bloom
                intensity={0.35}
                luminanceThreshold={0.95}
                luminanceSmoothing={0.25}
                mipmapBlur
              />
            </EffectComposer>
          ) : null}
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
