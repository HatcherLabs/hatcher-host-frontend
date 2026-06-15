'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
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
  HOUSE_DOOR_PITCH,
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

const WALL = new THREE.MeshLambertMaterial({ color: 0x3f4945 });
const WALL_PANEL = new THREE.MeshLambertMaterial({ color: 0x38423e });
const WALL_TRIM = new THREE.MeshLambertMaterial({ color: 0x93866d });
const FLOOR = new THREE.MeshLambertMaterial({ color: 0xdfe4e1 });
const FLOOR_PLANK_A = new THREE.MeshLambertMaterial({ color: 0xe8eee9 });
const FLOOR_PLANK_B = new THREE.MeshLambertMaterial({ color: 0xe5ebe7 });
const FLOOR_SEAM = new THREE.MeshLambertMaterial({ color: 0xdce4de });
const CARPET = new THREE.MeshLambertMaterial({ color: 0x313b37 });
const DOOR = new THREE.MeshLambertMaterial({ color: 0x2a3237 });
const DOOR_DARK = new THREE.MeshLambertMaterial({ color: 0x20282a });
const CEILING = new THREE.MeshLambertMaterial({ color: 0xd9dfda });
const METAL = new THREE.MeshLambertMaterial({ color: 0x9ca4a6 });
const BRASS = new THREE.MeshLambertMaterial({ color: 0x9a8a68 });
const CERAMIC = new THREE.MeshLambertMaterial({ color: 0xf2f3ef });
const GRAPHITE_PANEL = new THREE.MeshLambertMaterial({ color: 0x2a3333 });

const DOOR_W = 1.4;
const DOOR_H = 2.4;

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
        <color attach="background" args={['#30433d']} />
        <fog
          attach="fog"
          args={['#31463f', 32, Math.max(60, layout.length + 34)]}
        />
        <ambientLight intensity={0.82} color="#fff4e2" />
        <hemisphereLight
          color="#fff7e6"
          groundColor="#566f61"
          intensity={0.96}
        />
        <directionalLight position={[7, 9, 7]} intensity={0.95} />
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
          <MouseLook
            state={charState}
            pitchMin={-0.42}
            pitchMax={0.54}
            sensitivity={0.0032}
          />
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
      <HouseFloorPlanks layout={layout} />
      <mesh position={[0, 0.012, 0]} receiveShadow material={CARPET}>
        <boxGeometry args={[2.3, 0.025, layout.length - 0.72]} />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <boxGeometry args={[2.52, 0.018, layout.length - 0.72]} />
        <meshLambertMaterial color="#2b3338" />
      </mesh>
      <HallwayDataSpine layout={layout} />

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
      <HallwayRails layout={layout} />
      <CeilingLights layout={layout} />
      <ReceptionWall
        layout={layout}
        displayName={displayName}
        tier={tier}
        agentCount={layout.doors.length}
      />
      <ExitDoor layout={layout} />
      {layout.doors.map((door) => (
        <AgentDoor key={door.agent.id} door={door} />
      ))}
      <Sconces layout={layout} />
      <LobbyPlants layout={layout} />
      <HallwayCapsules layout={layout} />
    </group>
  );
}

function HallwayRails({ layout }: { layout: HouseLayout }) {
  const halfW = layout.width / 2;
  const halfL = layout.length / 2;
  const ribCount = Math.max(3, Math.floor(layout.length / 3.2));
  const zPositions = Array.from(
    { length: ribCount },
    (_, i) =>
      -halfL + 1.6 + i * ((layout.length - 3.2) / Math.max(1, ribCount - 1)),
  );

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {[1.08, 2.64].map((y, index) => (
            <mesh key={`${side}-${y}`} position={[side * (halfW - 0.16), y, 0]}>
              <boxGeometry args={[0.045, 0.045, layout.length - 1.4]} />
              <meshBasicMaterial
                color={index ? '#b6c6bf' : '#a8b9ae'}
                transparent
                opacity={index ? 0.045 : 0.035}
                toneMapped={false}
              />
            </mesh>
          ))}
          {zPositions.map((z) => (
            <mesh
              key={`${side}-rib-${z}`}
              position={[side * (halfW - 0.14), layout.height / 2, z]}
              castShadow
              receiveShadow
              material={BRASS}
            >
              <boxGeometry args={[0.07, layout.height - 0.44, 0.075]} />
            </mesh>
          ))}
        </group>
      ))}
      {zPositions.slice(0, Math.ceil(zPositions.length / 2)).map((z) => (
        <mesh key={`floor-node-${z}`} position={[0, 0.055, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.78, 0.86, 48]} />
          <meshBasicMaterial
            color="#a8b9ae"
            transparent
            opacity={0.025}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function HallwayDataSpine({ layout }: { layout: HouseLayout }) {
  const packetRefs = useRef<(THREE.Mesh | null)[]>([]);
  const activeDoors = Math.max(
    1,
    layout.doors.filter(
      (door) =>
        door.agent.status === 'active' || door.agent.status === 'running',
    ).length,
  );
  const packetCount = Math.min(10, Math.max(4, activeDoors + 2));
  const travelLength = layout.length - 2.1;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    packetRefs.current.forEach((packet, index) => {
      if (!packet) return;
      const phase = (t * 0.12 + index / packetCount) % 1;
      packet.position.z = -travelLength / 2 + phase * travelLength;
      packet.position.y = 0.072 + Math.sin(t * 4.2 + index) * 0.006;
      const material = packet.material as THREE.MeshBasicMaterial;
      material.opacity = 0.06 + Math.sin(t * 3.4 + index) * 0.025;
    });
  });

  return (
    <group>
      <mesh position={[0, 0.052, 0]}>
        <boxGeometry args={[0.065, 0.012, travelLength]} />
        <meshBasicMaterial
          color="#b6c6bf"
          transparent
          opacity={0.03}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.22, 0.052, 0]}>
        <boxGeometry args={[0.028, 0.01, travelLength * 0.82]} />
        <meshBasicMaterial
          color="#a8b9ae"
          transparent
          opacity={0.025}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.22, 0.052, 0]}>
        <boxGeometry args={[0.028, 0.01, travelLength * 0.82]} />
        <meshBasicMaterial
          color="#d6b177"
          transparent
          opacity={0.025}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: packetCount }, (_, index) => (
        <mesh
          key={index}
          ref={(packet) => {
            packetRefs.current[index] = packet;
          }}
          position={[index % 2 ? -0.22 : 0.22, 0.075, -travelLength / 2]}
        >
          <boxGeometry args={[0.18, 0.018, 0.34]} />
          <meshBasicMaterial
            color={
              index % 3 === 0
                ? '#b6c6bf'
                : index % 3 === 1
                  ? '#ffd089'
                  : '#a8b9ae'
            }
            transparent
            opacity={0.045}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function HouseFloorPlanks({ layout }: { layout: HouseLayout }) {
  const plankW = 0.88;
  const rows = Math.max(10, Math.ceil(layout.length / 0.86));
  const cols = Math.max(8, Math.ceil(layout.width / plankW));
  const rowD = layout.length / rows;
  return (
    <group>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const x =
            -layout.width / 2 +
            plankW / 2 +
            col * plankW +
            (row % 2 ? plankW / 2 : 0);
          const z = -layout.length / 2 + rowD / 2 + row * rowD;
          if (x > layout.width / 2 + plankW / 2) return null;
          return (
            <mesh
              key={`${row}-${col}`}
              position={[x, 0.003, z]}
              receiveShadow
              material={(row + col) % 2 === 0 ? FLOOR_PLANK_A : FLOOR_PLANK_B}
            >
              <boxGeometry args={[plankW - 0.008, 0.012, rowD - 0.008]} />
            </mesh>
          );
        }),
      )}
      {Array.from({ length: rows + 1 }, (_, i) => {
        if (i % 4 !== 0) return null;
        return (
          <mesh
            key={`hall-seam-${i}`}
            position={[0, 0.014, -layout.length / 2 + i * rowD]}
            receiveShadow
            material={FLOOR_SEAM}
          >
            <boxGeometry args={[layout.width, 0.006, 0.01]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Wainscot({ layout }: { layout: HouseLayout }) {
  const halfW = layout.width / 2;
  const halfL = layout.length / 2;
  return (
    <group>
      {[
        { z: halfL - 0.14, exitWall: true },
        { z: -halfL + 0.14, exitWall: false },
      ].map(({ z, exitWall }) => (
        <group key={z}>
          <mesh position={[0, 0.42, z]} material={WALL_PANEL}>
            <boxGeometry args={[layout.width, 0.84, 0.06]} />
          </mesh>
          <mesh position={[0, 0.88, z]} material={WALL_TRIM}>
            <boxGeometry args={[layout.width, 0.06, 0.08]} />
          </mesh>
          {exitWall ? (
            <>
              <mesh
                position={[-(halfW + 1.16) / 2, 0.09, z]}
                material={BRASS}
              >
                <boxGeometry args={[halfW - 1.16, 0.18, 0.08]} />
              </mesh>
              <mesh
                position={[(halfW + 1.16) / 2, 0.09, z]}
                material={BRASS}
              >
                <boxGeometry args={[halfW - 1.16, 0.18, 0.08]} />
              </mesh>
            </>
          ) : (
            <mesh position={[0, 0.09, z]} material={BRASS}>
              <boxGeometry args={[layout.width, 0.18, 0.08]} />
            </mesh>
          )}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (halfW - 0.12), 0.08, 0]}
          material={BRASS}
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
        const z =
          -layout.length / 2 +
          1.45 +
          i * ((layout.length - 2.9) / Math.max(1, rows - 1));
        return (
          <group key={i} position={[0, layout.height - 0.01, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.8, 0.18]} />
              <meshBasicMaterial color="#fff4d9" transparent opacity={0.72} toneMapped={false} />
            </mesh>
            <pointLight color="#ffe6b4" intensity={0.14} distance={4.2} />
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
      <mesh
        position={[0, 0.52, z]}
        castShadow
        receiveShadow
        material={BRASS}
      >
        <boxGeometry args={[2.55, 1.04, 0.72]} />
      </mesh>
      <mesh position={[0, 1.06, z]} castShadow receiveShadow material={DOOR}>
        <boxGeometry args={[2.78, 0.08, 0.88]} />
      </mesh>
      <mesh position={[0, 2.1, -layout.length / 2 + 0.105]}>
        <boxGeometry args={[3.48, 1.02, 0.07]} />
        <meshLambertMaterial color="#081016" />
      </mesh>
      <ReceptionPlaque
        position={[0, 2.1, -layout.length / 2 + 0.145]}
        displayName={displayName}
        tier={tier}
        agentCount={agentCount}
      />
      <HousePlant position={[-1.14, 1.1, z]} scale={0.52} />
      <mesh position={[1.1, 1.1, z]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.08, 14]} />
        <meshLambertMaterial
          color="#e8c98a"
          emissive="#ffd089"
          emissiveIntensity={0.52}
        />
      </mesh>
      <pointLight
        position={[1.1, 1.35, z]}
        color="#ffd089"
        intensity={0.3}
        distance={4}
      />
    </group>
  );
}

function ExitDoor({ layout }: { layout: HouseLayout }) {
  const z = layout.length / 2 - 0.25;
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 1.3, 0.16]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.96, 2.56]} />
        <meshLambertMaterial color="#0a0a10" />
      </mesh>
      <mesh position={[0, 2.66, -0.04]} material={DOOR_DARK}>
        <boxGeometry args={[2.2, 0.12, 0.1]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 1.06, 1.3, -0.04]}
          material={DOOR_DARK}
        >
          <boxGeometry args={[0.12, 2.6, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, 1.25, -0.1]} material={DOOR}>
        <boxGeometry args={[1.9, 2.5, 0.05]} />
      </mesh>
      <mesh position={[0, 1.76, -0.135]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.52, 0.82]} />
        <meshLambertMaterial color="#111a20" />
      </mesh>
      <mesh position={[0, 0.68, -0.135]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.52, 0.58]} />
        <meshLambertMaterial color="#111a20" />
      </mesh>
      <mesh position={[0.66, 1.05, -0.17]} material={METAL}>
        <sphereGeometry args={[0.055, 12, 8]} />
      </mesh>
      <mesh position={[0, 2.95, -0.08]}>
        <boxGeometry args={[2.18, 0.58, 0.05]} />
        <meshLambertMaterial color="#081016" />
      </mesh>
      <ExitSign position={[0, 2.95, -0.115]} />
      <mesh position={[0, 0.006, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 0.06]} />
        <meshBasicMaterial
          color="#ffd089"
          transparent
          opacity={0.58}
          toneMapped={false}
        />
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
  const trimT = 0.06;
  const trimW = 0.1;
  const panelX = facing * 0.04;

  return (
    <group position={[door.x, 0, door.z]}>
      <mesh position={[facing * 0.001, DOOR_H / 2, 0]} rotation={[0, rotY, 0]}>
        <planeGeometry args={[DOOR_W - 0.04, DOOR_H - 0.04]} />
        <meshLambertMaterial color="#0a0a10" />
      </mesh>
      <mesh
        position={[facing * (trimT / 2), DOOR_H + trimW / 2, 0]}
        material={BRASS}
      >
        <boxGeometry args={[trimT, trimW, DOOR_W + trimW * 2]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            facing * (trimT / 2),
            DOOR_H / 2,
            side * (DOOR_W / 2 + trimW / 2),
          ]}
          material={BRASS}
        >
          <boxGeometry args={[trimT, DOOR_H, trimW]} />
        </mesh>
      ))}
      <mesh position={[panelX, DOOR_H / 2, 0]} material={DOOR}>
        <boxGeometry args={[0.04, DOOR_H - 0.04, DOOR_W - 0.04]} />
      </mesh>
      <mesh
        position={[panelX + facing * 0.022, DOOR_H * 0.22, 0]}
        rotation={[0, rotY, 0]}
      >
        <planeGeometry args={[DOOR_W - 0.32, DOOR_H * 0.3]} />
        <meshLambertMaterial color="#111a20" />
      </mesh>
      <mesh position={[panelX + facing * 0.05, 1.05, DOOR_W / 2 - 0.18]}>
        <sphereGeometry args={[0.055, 12, 8]} />
        <primitive object={METAL} attach="material" />
      </mesh>
      <mesh
        position={[panelX + facing * 0.025, 1.05, DOOR_W / 2 - 0.18]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.025, 0.03, 0.04, 10]} />
        <primitive object={METAL} attach="material" />
      </mesh>
      <DoorNumberPlate
        position={[facing * (trimT + 0.012), DOOR_H + trimW + 0.18, 0]}
        rotation={[0, rotY, 0]}
        number={door.index + 1}
      />
      <AgentDoorPlaque
        position={[panelX + facing * 0.028, 1.62, 0]}
        rotation={[0, rotY, 0]}
        agentName={door.agent.name}
        framework={door.agent.framework}
        statusLabel={label}
        number={door.index + 1}
        frameworkColor={color}
        statusColor={sColor}
      />
      <DoorAccessPad facing={facing} statusColor={sColor} frameworkColor={color} />
      {['active', 'running', 'restarting'].includes(door.agent.status) && (
        <mesh
          position={[facing * 0.5, 0.012, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        >
          <planeGeometry args={[1.6, 0.05]} />
          <meshBasicMaterial
            color={sColor}
            transparent
            opacity={0.28}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

function DoorAccessPad({
  facing,
  statusColor,
  frameworkColor,
}: {
  facing: number;
  statusColor: string;
  frameworkColor: string;
}) {
  return (
    <group position={[facing * 0.08, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[0.28, 0.36, 36]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <ringGeometry args={[0.42, 0.45, 42]} />
        <meshBasicMaterial
          color={frameworkColor}
          transparent
          opacity={0.2}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Sconces({ layout }: { layout: HouseLayout }) {
  const perSide = Math.max(1, Math.ceil(layout.doors.length / 2));
  const startZ = -((perSide - 1) * HOUSE_DOOR_PITCH) / 2;
  return (
    <group>
      {Array.from(
        { length: perSide + 1 },
        (_, i) => startZ - HOUSE_DOOR_PITCH / 2 + i * HOUSE_DOOR_PITCH,
      ).map((z) => (
        <group key={z}>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * (layout.width / 2 - 0.18), 1.78, z]}
            >
              <mesh material={BRASS}>
                <boxGeometry args={[0.06, 0.32, 0.12]} />
              </mesh>
              <mesh
                position={[-side * 0.15, 0, 0]}
                rotation={[0, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2]}
              >
                <coneGeometry args={[0.14, 0.22, 12, 1, true]} />
                <meshLambertMaterial
                  color="#e8c98a"
                  emissive="#ffd089"
                  emissiveIntensity={0.55}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <pointLight
                position={[-side * 0.16, 0, 0]}
                color="#ffd089"
                intensity={0.18}
                distance={2.8}
              />
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
      <HousePlant
        position={[-layout.width / 2 + 0.58, 0, -layout.length / 2 + 0.62]}
        scale={0.9}
      />
      <HousePlant
        position={[layout.width / 2 - 0.58, 0, -layout.length / 2 + 0.62]}
        scale={0.9}
      />
    </group>
  );
}

function HallwayCapsules({ layout }: { layout: HouseLayout }) {
  const halfW = layout.width / 2;
  const halfL = layout.length / 2;
  const count = Math.max(2, Math.min(6, Math.ceil(layout.length / 5)));
  const zPositions = Array.from(
    { length: count },
    (_, i) => -halfL + 2.8 + i * ((layout.length - 5.6) / Math.max(1, count - 1)),
  );

  return (
    <group>
      {zPositions.map((z, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        return (
          <group
            key={z}
            position={[side * (halfW - 0.72), 0, z]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            scale={0.72}
          >
            <mesh position={[0, 0.1, 0]} castShadow receiveShadow material={GRAPHITE_PANEL}>
              <cylinderGeometry args={[0.42, 0.52, 0.2, 24]} />
            </mesh>
            <mesh position={[0, 0.46, 0]} scale={[0.72, 0.62, 0.58]} castShadow receiveShadow material={CERAMIC}>
              <sphereGeometry args={[0.54, 24, 12]} />
            </mesh>
            <mesh position={[0, 0.66, 0.13]} scale={[0.44, 0.16, 0.08]}>
              <sphereGeometry args={[0.5, 16, 8]} />
              <meshBasicMaterial color="#b7c8c0" transparent opacity={0.32} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.4, 0.47, 42]} />
              <meshBasicMaterial
                color={index % 3 === 0 ? '#d6b177' : '#a8b9ae'}
                transparent
                opacity={0.18}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
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
        <meshLambertMaterial color="#2e3437" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(a) * 0.12,
              0.58 + (i % 2) * 0.08,
              Math.sin(a) * 0.12,
            ]}
            scale={[0.7, 1.35, 0.55]}
            rotation={[0.2, a, 0.35]}
            castShadow
          >
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshLambertMaterial color={i % 2 ? '#6f9189' : '#4f7470'} />
          </mesh>
        );
      })}
    </group>
  );
}

function ReceptionPlaque({
  position,
  displayName,
  tier,
  agentCount,
}: {
  position: [number, number, number];
  displayName: string;
  tier: string;
  agentCount: number;
}) {
  const texture = useMemo(
    () =>
      createCanvasTexture(1024, 256, (ctx) => {
        ctx.fillStyle = '#101827';
        ctx.fillRect(0, 0, 1024, 256);
        ctx.fillStyle = '#20314a';
        ctx.fillRect(0, 0, 1024, 8);
        drawFittedText(
          ctx,
          `@${displayName}`,
          44,
          92,
          936,
          56,
          34,
          '#7fd9ff',
          'bold',
        );
        drawFittedText(
          ctx,
          `${tier.toUpperCase()} · ${agentCount} agent${agentCount === 1 ? '' : 's'}`,
          44,
          170,
          936,
          42,
          26,
          '#e8eef9',
          '600',
        );
        ctx.fillStyle = '#7b879f';
        ctx.font = '24px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('HATCHER BUILDING', 44, 220);
      }),
    [agentCount, displayName, tier],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position}>
      <planeGeometry args={[3.2, 0.8]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function ExitSign({ position }: { position: [number, number, number] }) {
  const texture = useMemo(
    () =>
      createCanvasTexture(512, 128, (ctx) => {
        ctx.fillStyle = '#101827';
        ctx.fillRect(0, 0, 512, 128);
        ctx.fillStyle = '#b7c8c0';
        ctx.font = 'bold 52px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('← CITY', 256, 82);
      }),
    [],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[2, 0.5]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function DoorNumberPlate({
  position,
  rotation,
  number,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  number: number;
}) {
  const texture = useMemo(
    () =>
      createCanvasTexture(256, 128, (ctx) => {
        ctx.fillStyle = '#101827';
        ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = '#7fd9ff';
        ctx.font = 'bold 72px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(number).padStart(2, '0'), 128, 88);
      }),
    [number],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[0.42, 0.22]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function AgentDoorPlaque({
  position,
  rotation,
  agentName,
  framework,
  statusLabel,
  number,
  frameworkColor,
  statusColor,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  agentName: string;
  framework: string | undefined;
  statusLabel: string;
  number: number;
  frameworkColor: string;
  statusColor: string;
}) {
  const texture = useMemo(
    () =>
      createCanvasTexture(768, 384, (ctx) => {
        ctx.fillStyle = '#0d1424';
        ctx.fillRect(0, 0, 768, 384);
        ctx.fillStyle = frameworkColor;
        ctx.fillRect(0, 0, 768, 12);
        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(70, 110, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.42;
        ctx.beginPath();
        ctx.arc(70, 110, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        drawFittedText(
          ctx,
          agentName,
          130,
          138,
          520,
          80,
          36,
          '#e8eef9',
          'bold',
        );
        drawFittedText(
          ctx,
          framework || 'agent',
          130,
          200,
          520,
          42,
          24,
          frameworkColor,
          '600',
        );
        ctx.fillStyle = '#8b97b3';
        ctx.font = '32px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('STATUS', 40, 280);
        drawFittedText(
          ctx,
          statusLabel.toUpperCase(),
          40,
          326,
          330,
          38,
          24,
          statusColor,
          'bold',
        );
        ctx.fillStyle = '#5b6886';
        ctx.font = 'bold 56px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`#${String(number).padStart(2, '0')}`, 728, 88);
        ctx.textAlign = 'start';
        ctx.strokeStyle = '#232c44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, 244);
        ctx.lineTo(728, 244);
        ctx.stroke();
      }),
    [agentName, framework, frameworkColor, number, statusColor, statusLabel],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[0.92, 0.46]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create building label canvas.');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  color: string,
  weight: string,
) {
  let size = maxSize;
  do {
    ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  } while (size > minSize);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
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
