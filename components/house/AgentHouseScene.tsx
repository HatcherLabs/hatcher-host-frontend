'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import type { Agent } from '@/lib/api';
import type { SolidDisc } from '@/components/city/v2/world/colliders';
import {
  CharacterController,
  FirstPersonCamera,
  MobileJoystick,
  MouseLook,
  type CharacterState,
} from '@/components/agent-room/v2/character';
import {
  buildHouseLayout,
  frameworkColor,
  HOUSE_EYE_HEIGHT,
  labelAgentStatus,
  statusColor,
  type HouseDoorLayout,
  type HouseLayout,
} from './houseLayout';

interface ViewerProfile {
  username?: string | null;
  tier?: string | null;
}

interface Props {
  agents: Agent[];
  profile: ViewerProfile | null;
  nearestDoor: HouseDoorLayout | 'exit' | null;
  onNearestDoorChange: (door: HouseDoorLayout | 'exit' | null) => void;
  onDoorEnter: (agent: Agent) => void;
  onExit: () => void;
}

const WALL = new THREE.MeshLambertMaterial({ color: 0xc8b693 });
const WALL_PANEL = new THREE.MeshLambertMaterial({ color: 0xd7c6a6 });
const WALL_TRIM = new THREE.MeshLambertMaterial({ color: 0x6d583b });
const FLOOR = new THREE.MeshLambertMaterial({ color: 0x6b472b });
const FLOOR_DARK = new THREE.MeshLambertMaterial({ color: 0x3b2516 });
const CARPET = new THREE.MeshLambertMaterial({ color: 0x6d1828 });
const DOOR = new THREE.MeshLambertMaterial({ color: 0x805432 });
const DOOR_DARK = new THREE.MeshLambertMaterial({ color: 0x442b18 });
const CEILING = new THREE.MeshLambertMaterial({ color: 0x0d1420 });
const METAL = new THREE.MeshLambertMaterial({ color: 0x707786 });
const SCREEN = new THREE.MeshLambertMaterial({
  color: 0x09111f,
  emissive: 0x10263d,
  emissiveIntensity: 0.24,
});

export function AgentHouseScene({
  agents,
  profile,
  nearestDoor,
  onNearestDoorChange,
  onDoorEnter,
  onExit,
}: Props) {
  const layout = useMemo(() => buildHouseLayout(agents), [agents]);
  const charState = useMemo<CharacterState>(
    () => ({
      position: new THREE.Vector3(0, 0, layout.length / 2 - 1.65),
      heading: Math.PI,
      cameraYaw: 0,
      cameraPitch: -0.02,
    }),
    [layout.length],
  );
  const analogRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const solids = useMemo(() => houseColliders(layout), [layout]);

  useEffect(() => {
    charState.position.set(0, 0, layout.length / 2 - 1.65);
    charState.cameraYaw = 0;
    charState.cameraPitch = -0.02;
  }, [charState, layout.length]);

  return (
    <>
      <Canvas
        shadows
        camera={{
          position: [0, HOUSE_EYE_HEIGHT, layout.length / 2 - 1.65],
          fov: 72,
          near: 0.05,
          far: 260,
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.02;
        }}
      >
        <color attach="background" args={['#070b12']} />
        <fog attach="fog" args={['#0b1222', 16, Math.max(32, layout.length + 18)]} />
        <ambientLight intensity={0.34} color="#ffe8c6" />
        <hemisphereLight color="#fff1d6" groundColor="#24170f" intensity={0.54} />
        <directionalLight position={[7, 9, 7]} intensity={0.58} />
        <Suspense fallback={null}>
          <HouseHall layout={layout} profile={profile} />
          <HouseInteraction
            state={charState}
            layout={layout}
            nearestDoor={nearestDoor}
            onNearestDoorChange={onNearestDoorChange}
            onDoorEnter={onDoorEnter}
            onExit={onExit}
          />
          <CharacterController
            state={charState}
            analog={analogRef.current}
            solids={solids}
            speed={4.3}
            characterRadius={0.42}
          />
          <FirstPersonCamera state={charState} />
          <MouseLook state={charState} pitchMin={-0.42} pitchMax={0.54} sensitivity={0.0032} />
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

function HouseHall({
  layout,
  profile,
}: {
  layout: HouseLayout;
  profile: ViewerProfile | null;
}) {
  const displayName = profile?.username?.trim() || 'Builder';
  const tier = profile?.tier?.trim() || 'free';
  const halfW = layout.width / 2;
  const halfL = layout.length / 2;

  return (
    <group>
      <mesh position={[0, -0.055, 0]} receiveShadow material={FLOOR}>
        <boxGeometry args={[layout.width, 0.11, layout.length]} />
      </mesh>
      <mesh position={[0, -0.043, 0]} receiveShadow material={FLOOR_DARK}>
        <boxGeometry args={[layout.width, 0.012, layout.length]} />
      </mesh>
      <mesh position={[0, 0.012, 0]} receiveShadow material={CARPET}>
        <boxGeometry args={[2.3, 0.025, layout.length - 0.72]} />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <boxGeometry args={[2.52, 0.018, layout.length - 0.72]} />
        <meshLambertMaterial color="#49131c" />
      </mesh>

      <mesh position={[0, layout.height + 0.04, 0]} material={CEILING}>
        <boxGeometry args={[layout.width, 0.1, layout.length]} />
      </mesh>
      <mesh position={[0, layout.height / 2, -halfL]} material={WALL}>
        <boxGeometry args={[layout.width, layout.height, 0.2]} />
      </mesh>
      <mesh position={[0, layout.height / 2, halfL]} material={WALL}>
        <boxGeometry args={[layout.width, layout.height, 0.2]} />
      </mesh>
      <mesh position={[-halfW, layout.height / 2, 0]} material={WALL}>
        <boxGeometry args={[0.2, layout.height, layout.length]} />
      </mesh>
      <mesh position={[halfW, layout.height / 2, 0]} material={WALL}>
        <boxGeometry args={[0.2, layout.height, layout.length]} />
      </mesh>

      <Wainscot layout={layout} />
      <CeilingLights layout={layout} />
      <ReceptionWall layout={layout} displayName={displayName} tier={tier} agentCount={layout.doors.length} />
      <ExitDoor layout={layout} />
      {layout.doors.map((door) => (
        <AgentDoor key={door.agent.id} door={door} />
      ))}
      <Sconces layout={layout} />
      <LobbyPlants layout={layout} />
    </group>
  );
}

function Wainscot({ layout }: { layout: HouseLayout }) {
  const halfW = layout.width / 2;
  const halfL = layout.length / 2;
  return (
    <group>
      {[halfL - 0.14, -halfL + 0.14].map((z) => (
        <group key={z}>
          <mesh position={[0, 0.42, z]} material={WALL_PANEL}>
            <boxGeometry args={[layout.width, 0.84, 0.06]} />
          </mesh>
          <mesh position={[0, 0.88, z]} material={WALL_TRIM}>
            <boxGeometry args={[layout.width, 0.06, 0.08]} />
          </mesh>
          <mesh position={[0, 0.09, z]} material={DOOR_DARK}>
            <boxGeometry args={[layout.width, 0.18, 0.08]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (halfW - 0.12), 0.08, 0]}
          material={DOOR_DARK}
        >
          <boxGeometry args={[0.05, 0.16, layout.length]} />
        </mesh>
      ))}
    </group>
  );
}

function CeilingLights({ layout }: { layout: HouseLayout }) {
  const rows = Math.max(4, Math.floor(layout.length / 2.5));
  return (
    <group>
      {Array.from({ length: rows }, (_, i) => {
        const z = -layout.length / 2 + 1.45 + i * ((layout.length - 2.9) / Math.max(1, rows - 1));
        return (
          <group key={i} position={[0, layout.height - 0.01, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.68, 0.2]} />
              <meshBasicMaterial color="#ffe9bf" toneMapped={false} />
            </mesh>
            <pointLight color="#ffd9a0" intensity={0.16} distance={4.2} />
          </group>
        );
      })}
    </group>
  );
}

function ReceptionWall({
  layout,
  displayName,
  tier,
  agentCount,
}: {
  layout: HouseLayout;
  displayName: string;
  tier: string;
  agentCount: number;
}) {
  const z = -layout.length / 2 + 0.95;
  return (
    <group>
      <mesh position={[0, 0.52, z]} castShadow receiveShadow material={DOOR_DARK}>
        <boxGeometry args={[2.55, 1.04, 0.72]} />
      </mesh>
      <mesh position={[0, 1.06, z]} castShadow receiveShadow material={DOOR}>
        <boxGeometry args={[2.78, 0.08, 0.88]} />
      </mesh>
      <mesh position={[0, 2.1, -layout.length / 2 + 0.12]}>
        <boxGeometry args={[3.5, 0.92, 0.06]} />
        <meshLambertMaterial color="#111827" emissive="#101b2f" emissiveIntensity={0.28} />
      </mesh>
      <SceneLabel
        position={[0, 2.23, -layout.length / 2 + 0.165]}
        fontSize={0.18}
        maxWidth={3.1}
        color="#59f0d1"
        anchorX="center"
        anchorY="middle"
      >
        @{displayName}
      </SceneLabel>
      <SceneLabel
        position={[0, 2.02, -layout.length / 2 + 0.165]}
        fontSize={0.12}
        maxWidth={3.1}
        color="#e5eefb"
        anchorX="center"
        anchorY="middle"
      >
        {`${tier.toUpperCase()} · ${agentCount} agent${agentCount === 1 ? '' : 's'}`}
      </SceneLabel>
      <HousePlant position={[-1.14, 1.1, z]} scale={0.52} />
      <mesh position={[1.1, 1.1, z]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.08, 14]} />
        <meshLambertMaterial color="#e8c98a" emissive="#ffd089" emissiveIntensity={0.52} />
      </mesh>
      <pointLight position={[1.1, 1.35, z]} color="#ffd089" intensity={0.3} distance={4} />
    </group>
  );
}

function ExitDoor({ layout }: { layout: HouseLayout }) {
  const z = layout.length / 2 - 0.1;
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 1.24, -0.03]} material={DOOR_DARK}>
        <boxGeometry args={[2.16, 2.55, 0.08]} />
      </mesh>
      <mesh position={[0, 1.23, -0.08]} material={DOOR}>
        <boxGeometry args={[1.84, 2.36, 0.07]} />
      </mesh>
      <mesh position={[0, 2.62, -0.11]} material={WALL_TRIM}>
        <boxGeometry args={[2.18, 0.12, 0.12]} />
      </mesh>
      <SceneLabel position={[0, 2.88, -0.16]} fontSize={0.16} color="#65e7ff" anchorX="center">
        CITY
      </SceneLabel>
      <mesh position={[0, 0.025, -0.36]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.08]} />
        <meshBasicMaterial color="#65e7ff" transparent opacity={0.68} toneMapped={false} />
      </mesh>
    </group>
  );
}

function AgentDoor({ door }: { door: HouseDoorLayout }) {
  const facing = door.facing;
  const color = frameworkColor(door.agent.framework);
  const sColor = statusColor(door.agent.status);
  const label = labelAgentStatus(door.agent.status);
  const rotY = facing > 0 ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[door.x, 0, door.z]}>
      <mesh position={[facing * 0.04, 1.22, 0]} rotation={[0, rotY, 0]} material={DOOR_DARK}>
        <boxGeometry args={[0.08, 2.56, 1.62]} />
      </mesh>
      <mesh position={[facing * 0.095, 1.2, 0]} rotation={[0, rotY, 0]} material={DOOR}>
        <boxGeometry args={[0.07, 2.36, 1.34]} />
      </mesh>
      <mesh position={[facing * 0.16, 1.02, -0.45]}>
        <sphereGeometry args={[0.055, 12, 8]} />
        <primitive object={METAL} attach="material" />
      </mesh>
      <mesh position={[facing * 0.17, 2.63, 0]} rotation={[0, rotY, 0]}>
        <boxGeometry args={[0.08, 0.22, 0.62]} />
        <meshLambertMaterial color="#0d1b2e" emissive={color} emissiveIntensity={0.18} />
      </mesh>
      <SceneLabel
        position={[facing * 0.225, 2.63, 0]}
        rotation={[0, rotY, 0]}
        fontSize={0.11}
        color="#d8f7ff"
        anchorX="center"
        anchorY="middle"
      >
        {String(door.index + 1).padStart(2, '0')}
      </SceneLabel>
      <mesh position={[facing * 0.2, 1.65, facing > 0 ? -0.96 : 0.96]} rotation={[0, rotY, 0]} material={SCREEN}>
        <boxGeometry args={[0.06, 0.86, 1.34]} />
      </mesh>
      <SceneLabel
        position={[facing * 0.245, 1.8, facing > 0 ? -0.96 : 0.96]}
        rotation={[0, rotY, 0]}
        fontSize={0.105}
        maxWidth={1.12}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
      >
        {door.agent.name}
      </SceneLabel>
      <SceneLabel
        position={[facing * 0.247, 1.58, facing > 0 ? -0.96 : 0.96]}
        rotation={[0, rotY, 0]}
        fontSize={0.07}
        maxWidth={1.04}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {door.agent.framework}
      </SceneLabel>
      <SceneLabel
        position={[facing * 0.247, 1.37, facing > 0 ? -0.96 : 0.96]}
        rotation={[0, rotY, 0]}
        fontSize={0.065}
        maxWidth={1.04}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </SceneLabel>
      <mesh position={[facing * 0.22, 1.92, facing > 0 ? -0.36 : 0.36]}>
        <sphereGeometry args={[0.09, 14, 10]} />
        <meshBasicMaterial color={sColor} toneMapped={false} />
      </mesh>
      <pointLight
        position={[facing * 0.25, 1.82, facing > 0 ? -0.36 : 0.36]}
        color={sColor}
        intensity={0.28}
        distance={2.2}
      />
    </group>
  );
}

function Sconces({ layout }: { layout: HouseLayout }) {
  const perSide = Math.max(1, Math.ceil(layout.doors.length / 2));
  const startZ = -((perSide - 1) * 2.8) / 2;
  return (
    <group>
      {Array.from({ length: perSide + 1 }, (_, i) => startZ - 1.4 + i * 2.8).map((z) => (
        <group key={z}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * (layout.width / 2 - 0.18), 1.78, z]}>
              <mesh material={DOOR_DARK}>
                <boxGeometry args={[0.06, 0.32, 0.12]} />
              </mesh>
              <mesh position={[-side * 0.15, 0, 0]} rotation={[0, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2]}>
                <coneGeometry args={[0.14, 0.22, 12, 1, true]} />
                <meshLambertMaterial color="#e8c98a" emissive="#ffd089" emissiveIntensity={0.55} side={THREE.DoubleSide} />
              </mesh>
              <pointLight position={[-side * 0.16, 0, 0]} color="#ffd089" intensity={0.18} distance={2.8} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function LobbyPlants({ layout }: { layout: HouseLayout }) {
  return (
    <group>
      <HousePlant position={[-layout.width / 2 + 0.58, 0, -layout.length / 2 + 0.62]} scale={0.9} />
      <HousePlant position={[layout.width / 2 - 0.58, 0, -layout.length / 2 + 0.62]} scale={0.9} />
    </group>
  );
}

function HousePlant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.24, 0.44, 12]} />
        <meshLambertMaterial color="#6b3f2b" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.12, 0.58 + (i % 2) * 0.08, Math.sin(a) * 0.12]}
            scale={[0.7, 1.35, 0.55]}
            rotation={[0.2, a, 0.35]}
            castShadow
          >
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshLambertMaterial color={i % 2 ? '#2f7d4a' : '#1f6b41'} />
          </mesh>
        );
      })}
    </group>
  );
}

function SceneLabel({
  position,
  rotation = [0, 0, 0],
  fontSize,
  color,
  maxWidth,
  children,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  fontSize: number;
  color: string;
  maxWidth?: number;
  anchorX?: string;
  anchorY?: string;
  children: ReactNode;
}) {
  return (
    <Html
      position={position}
      rotation={rotation}
      transform
      distanceFactor={7.5}
      zIndexRange={[8, 0]}
    >
      <div
        style={{
          color,
          fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, monospace',
          fontSize: `${Math.max(8, fontSize * 82)}px`,
          fontWeight: 700,
          lineHeight: 1.05,
          maxWidth: maxWidth ? `${maxWidth * 82}px` : undefined,
          overflow: 'hidden',
          textAlign: 'center',
          textOverflow: 'ellipsis',
          textShadow: '0 1px 8px rgba(0,0,0,0.75)',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
    </Html>
  );
}

function HouseInteraction({
  state,
  layout,
  nearestDoor,
  onNearestDoorChange,
  onDoorEnter,
  onExit,
}: {
  state: CharacterState;
  layout: HouseLayout;
  nearestDoor: HouseDoorLayout | 'exit' | null;
  onNearestDoorChange: (door: HouseDoorLayout | 'exit' | null) => void;
  onDoorEnter: (agent: Agent) => void;
  onExit: () => void;
}) {
  const nearestRef = useRef<HouseDoorLayout | 'exit' | null>(nearestDoor);

  useEffect(() => {
    nearestRef.current = nearestDoor;
  }, [nearestDoor]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e') return;
      const nearest = nearestRef.current;
      if (!nearest) return;
      event.preventDefault();
      if (nearest === 'exit') onExit();
      else onDoorEnter(nearest.agent);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDoorEnter, onExit]);

  useFrame(() => {
    const next = nearestDoorForPosition(state.position, layout);
    if (next === nearestRef.current) return;
    nearestRef.current = next;
    onNearestDoorChange(next);
  });

  return null;
}

function nearestDoorForPosition(
  position: THREE.Vector3,
  layout: HouseLayout,
): HouseDoorLayout | 'exit' | null {
  if (
    Math.abs(position.z - (layout.length / 2 - 0.75)) < 1.05 &&
    Math.abs(position.x) < 1.2
  ) {
    return 'exit';
  }

  let best: { door: HouseDoorLayout; d: number } | null = null;
  for (const door of layout.doors) {
    const dx = door.x - position.x;
    const dz = door.z - position.z;
    const d = Math.hypot(dx, dz);
    if (d < 2.05 && (!best || d < best.d)) best = { door, d };
  }
  return best?.door ?? null;
}

function houseColliders(layout: HouseLayout): SolidDisc[] {
  const halfW = layout.width / 2;
  const halfL = layout.length / 2;
  const big = Math.max(layout.width, layout.length) * 8;
  return [
    { x: 0, z: -halfL - big, r: big },
    { x: 0, z: halfL + big, r: big },
    { x: -halfW - big, z: 0, r: big },
    { x: halfW + big, z: 0, r: big },
    { x: 0, z: -halfL + 0.95, r: 1.45 },
    { x: -halfW + 0.58, z: -halfL + 0.62, r: 0.5 },
    { x: halfW - 0.58, z: -halfL + 0.62, r: 0.5 },
  ];
}
