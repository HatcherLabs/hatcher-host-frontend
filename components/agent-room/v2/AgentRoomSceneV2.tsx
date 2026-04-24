'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { paletteFor } from './colors';
import {
  CharacterController,
  MouseLook,
  FirstPersonCamera,
  MobileJoystick,
  type CharacterState,
} from './character';
import { RoomShell } from './world/RoomShell';
import { Skybox } from './world/Skybox';
import { Lighting } from './world/Lighting';
import { Atmosphere } from './world/Atmosphere';
import { FrameworkDecor } from './world/FrameworkDecor';
import { getStationLayout, type StationId, type StationLayout } from './world/layout';
import { collidersFromLayout, wallColliders } from './world/colliders';
import { AgentAvatar } from './stations/AgentAvatar';
import { SkillWorkbench } from './stations/SkillWorkbench';
import { IntegrationsRack } from './stations/IntegrationsRack';
import { StatusConsole } from './stations/StatusConsole';
import { LogWall } from './stations/LogWall';
import { StatsHologram } from './stations/StatsHologram';
import { MemoryShelves } from './stations/MemoryShelves';
import { ConfigTerminal } from './stations/ConfigTerminal';
import { PluginsCabinet } from './stations/PluginsCabinet';
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
  onStationClick: (id: StationId) => void;
  onStatusChange: () => void;
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
  onStationClick,
  onStatusChange,
}: Props) {
  const palette = paletteFor(framework);

  const charState = useMemo<CharacterState>(() => ({
    position: new THREE.Vector3(0, 0, 10),
    heading: Math.PI,
    cameraYaw: 0,
    cameraPitch: 0.0,
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
        camera={{ position: [0, 1.55, 10], fov: 72 }}
        dpr={quality === 'low' ? [1, 1.5] : [1, 2]}
      >
        <color attach="background" args={[palette.background]} />
        <Suspense fallback={null}>
          <Skybox framework={framework} />
          <Lighting framework={framework} />
          {quality !== 'low' && <Atmosphere framework={framework} count={quality === 'high' ? 180 : 120} />}
          <RoomShell framework={framework} />
          <FrameworkDecor framework={framework} />

          <AgentAvatar
            station={layout.agentAvatar}
            framework={framework}
            onClick={() => onStationClick('agentAvatar')}
            isNear={nearest === 'agentAvatar'}
          />
          <SkillWorkbench
            station={layout.skillWorkbench}
            framework={framework}
            onClick={() => onStationClick('skillWorkbench')}
            isNear={nearest === 'skillWorkbench'}
          />
          <IntegrationsRack
            station={layout.integrationsRack}
            framework={framework}
            connected={connectedIntegrations}
            onClick={() => onStationClick('integrationsRack')}
            isNear={nearest === 'integrationsRack'}
          />
          <StatusConsole
            station={layout.statusConsole}
            framework={framework}
            agentId={agentId}
            status={status}
            onStatusChange={onStatusChange}
            onOpenPanel={() => onStationClick('statusConsole')}
            isNear={nearest === 'statusConsole'}
          />
          <LogWall
            station={layout.logWall}
            framework={framework}
            agentId={agentId}
            onClick={() => onStationClick('logWall')}
            isNear={nearest === 'logWall'}
          />
          <StatsHologram
            station={layout.statsHologram}
            framework={framework}
            tier={tier}
            messagesToday={messagesToday}
            uptimeSec={uptimeSec}
            status={status}
          />
          {canEdit && (
            <MemoryShelves
              station={layout.memoryShelves}
              framework={framework}
              hasMemory={hasMemory}
              onClick={() => onStationClick('memoryShelves')}
              isNear={nearest === 'memoryShelves'}
            />
          )}
          <ConfigTerminal
            station={layout.configTerminal}
            framework={framework}
            onClick={() => onStationClick('configTerminal')}
            isNear={nearest === 'configTerminal'}
          />
          <PluginsCabinet
            station={layout.pluginsCabinet}
            framework={framework}
            installedCount={pluginsInstalled}
            onClick={() => onStationClick('pluginsCabinet')}
            isNear={nearest === 'pluginsCabinet'}
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
          {quality !== 'low' && (
            <EffectComposer multisampling={0} enableNormalPass={false}>
              <Bloom
                intensity={quality === 'high' ? 0.45 : 0.35}
                luminanceThreshold={0.95}
                luminanceSmoothing={0.25}
                mipmapBlur
              />
            </EffectComposer>
          )}
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
