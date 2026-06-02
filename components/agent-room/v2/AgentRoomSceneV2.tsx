'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  CharacterController,
  MouseLook,
  FirstPersonCamera,
  MobileJoystick,
  type CharacterState,
} from './character';
import { ThirdPersonCamera } from './character/ThirdPersonCamera';
import { PlayerAvatar } from './PlayerAvatar';
import { RoomAudio } from './RoomAudio';
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
  eyesLive?: boolean;
  cameraMode?: 'first' | 'third';
  audioMuted?: boolean;
  chatMessageCount?: number;
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
  eyesLive,
  cameraMode = 'first',
  audioMuted,
  chatMessageCount,
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
            isChatStreaming={isChatStreaming}
            eyesLive={eyesLive}
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
          <WorkMotes
            active={!!isChatStreaming || !!eyesLive}
            framework={framework}
            position={layout.agentAvatar.position}
          />
          <RoomAudio
            agentPosition={layout.agentAvatar.position}
            muted={!!audioMuted}
            messageCount={chatMessageCount ?? 0}
          />
          <CharacterController
            state={charState}
            analog={analogRef.current}
            solids={solids}
            speed={6}
            characterRadius={0.6}
          />
          {cameraMode === 'third' ? (
            <ThirdPersonCamera state={charState} />
          ) : (
            <FirstPersonCamera state={charState} />
          )}
          <PlayerAvatar state={charState} framework={framework} visible={cameraMode === 'third'} />
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

function moteColor(framework: string): string {
  switch (framework) {
    case 'openclaw':
      return '#ffc21f';
    case 'hermes':
      return '#b88bff';
    default:
      return '#9fd9c4';
  }
}

function makeSoftCircleTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const MOTE_COUNT = 26;

// Glowing motes that spiral up around the agent while it's actively working
// (streaming a reply or eyes-live). Eases in/out so it's calm at rest. Cheap:
// one additive Points cloud, no per-mote draw calls.
function WorkMotes({
  active,
  framework,
  position,
}: {
  active: boolean;
  framework: string;
  position: [number, number, number];
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const levelRef = useRef(0);
  const motes = useMemo(
    () =>
      Array.from({ length: MOTE_COUNT }, (_, i) => ({
        angle: (i / MOTE_COUNT) * Math.PI * 2,
        radius: 0.42 + (i % 5) * 0.11,
        speed: 0.5 + (i % 7) * 0.13,
        offset: (i * 0.137) % 1,
      })),
    [],
  );
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTE_COUNT * 3), 3));
    return g;
  }, []);
  const texture = useMemo(() => makeSoftCircleTexture(), []);
  const color = useMemo(() => moteColor(framework), [framework]);

  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
    },
    [geometry, texture],
  );

  useFrame(({ clock }, delta) => {
    levelRef.current += ((active ? 1 : 0) - levelRef.current) * Math.min(1, delta * 2.5);
    const lvl = levelRef.current;
    if (pointsRef.current) pointsRef.current.visible = lvl > 0.02;
    if (lvl <= 0.02) return;
    const t = clock.elapsedTime;
    const attr = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < MOTE_COUNT; i++) {
      const m = motes[i]!;
      const cycle = (t * m.speed * 0.24 + m.offset) % 1; // 0..1 rising
      const y = 0.45 + cycle * 1.95;
      const a = m.angle + t * 0.35;
      const r = m.radius * (1 - cycle * 0.25);
      attr.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
    }
    attr.needsUpdate = true;
    if (matRef.current) matRef.current.opacity = 0.62 * lvl;
  });

  return (
    <points ref={pointsRef} position={position} visible={false}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        ref={matRef}
        color={color}
        map={texture}
        size={0.13}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}
