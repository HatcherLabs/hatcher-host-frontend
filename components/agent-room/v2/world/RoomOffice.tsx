'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { frameworkColor, labelAgentStatus, statusColor } from '@/components/house/houseLayout';
import type { StationId, StationLayout } from './layout';
import { ROOM_HALF, ROOM_HEIGHT, ROOM_SIZE } from './grid';

interface Props {
  layout: StationLayout;
  framework: string;
  status: string;
  tier?: string;
  messagesToday?: number;
  uptimeSec?: number;
  connectedIntegrations: Set<string>;
  pluginsInstalled: number;
  hasMemory: boolean;
  nearest: StationId | null;
  canEdit: boolean;
  agentName?: string;
  onStationClick: (id: StationId) => void;
}

const FLOOR = new THREE.MeshStandardMaterial({
  color: 0x705235,
  roughness: 0.82,
  metalness: 0.02,
});
const FLOOR_DARK = new THREE.MeshStandardMaterial({
  color: 0x442b1a,
  roughness: 0.88,
});
const WALL = new THREE.MeshStandardMaterial({
  color: 0x2e3850,
  roughness: 0.86,
});
const WALL_TRIM = new THREE.MeshStandardMaterial({
  color: 0x182238,
  roughness: 0.75,
});
const CEILING = new THREE.MeshStandardMaterial({
  color: 0x111827,
  roughness: 0.9,
});
const WOOD = new THREE.MeshStandardMaterial({
  color: 0x8a5a2e,
  roughness: 0.74,
});
const WOOD_DARK = new THREE.MeshStandardMaterial({
  color: 0x4a2e18,
  roughness: 0.78,
});
const METAL = new THREE.MeshStandardMaterial({
  color: 0x737987,
  roughness: 0.48,
  metalness: 0.36,
});
const BLACK = new THREE.MeshStandardMaterial({
  color: 0x0a0f18,
  roughness: 0.62,
  metalness: 0.15,
});
const FABRIC = new THREE.MeshStandardMaterial({
  color: 0x65435a,
  roughness: 0.92,
});
const RUG = new THREE.MeshStandardMaterial({
  color: 0x8a3145,
  roughness: 0.84,
});

const INTEGRATION_KEYS = [
  'github',
  'slack',
  'discord',
  'telegram',
  'twitter',
  'gmail',
  'mail',
  'brave',
] as const;

export function RoomOffice({
  layout,
  framework,
  status,
  tier,
  messagesToday,
  uptimeSec,
  connectedIntegrations,
  pluginsInstalled,
  hasMemory,
  nearest,
  canEdit,
  agentName,
  onStationClick,
}: Props) {
  const accent = frameworkColor(framework);
  const secondary = framework === 'hermes' ? '#38bdf8' : '#7dd3fc';

  return (
    <group>
      <OfficeShell accent={accent} secondary={secondary} />
      <CentralPedestal
        stationId="agentAvatar"
        layout={layout}
        accent={accent}
        status={status}
        agentName={agentName}
        isNear={nearest === 'agentAvatar'}
        onStationClick={onStationClick}
      />
      <TvStation
        stationId="statusConsole"
        layout={layout}
        accent={accent}
        secondary={secondary}
        status={status}
        tier={tier}
        messagesToday={messagesToday}
        uptimeSec={uptimeSec}
        isNear={nearest === 'statusConsole'}
        onStationClick={onStationClick}
      />
      <LogsStation
        stationId="logWall"
        layout={layout}
        accent={secondary}
        isNear={nearest === 'logWall'}
        onStationClick={onStationClick}
      />
      <DeskStation
        stationId="configTerminal"
        layout={layout}
        accent={accent}
        isNear={nearest === 'configTerminal'}
        onStationClick={onStationClick}
      />
      <CorkboardStation
        stationId="integrationsRack"
        layout={layout}
        accent={accent}
        connectedIntegrations={connectedIntegrations}
        isNear={nearest === 'integrationsRack'}
        onStationClick={onStationClick}
      />
      <BookshelfStation
        stationId="memoryShelves"
        layout={layout}
        accent={accent}
        hasMemory={hasMemory}
        canEdit={canEdit}
        isNear={nearest === 'memoryShelves'}
        onStationClick={onStationClick}
      />
      <WorkbenchStation
        stationId="skillWorkbench"
        layout={layout}
        accent={secondary}
        isNear={nearest === 'skillWorkbench'}
        onStationClick={onStationClick}
      />
      <PluginsStation
        stationId="pluginsCabinet"
        layout={layout}
        accent={accent}
        pluginsInstalled={pluginsInstalled}
        isNear={nearest === 'pluginsCabinet'}
        onStationClick={onStationClick}
      />
      <MailStation
        stationId="mailInbox"
        layout={layout}
        accent="#6ee7b7"
        isNear={nearest === 'mailInbox'}
        onStationClick={onStationClick}
      />
      <StatsFloorGlow
        layout={layout}
        accent={accent}
        status={status}
        messagesToday={messagesToday}
      />
      <RoomPlants />
    </group>
  );
}

function OfficeShell({
  accent,
  secondary,
}: {
  accent: string;
  secondary: string;
}) {
  return (
    <group>
      <mesh position={[0, -0.055, 0]} receiveShadow material={FLOOR}>
        <boxGeometry args={[ROOM_SIZE, 0.11, ROOM_SIZE]} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          position={[0, -0.041, -ROOM_HALF + (i + 1) * (ROOM_SIZE / 10)]}
          receiveShadow
          material={FLOOR_DARK}
        >
          <boxGeometry args={[ROOM_SIZE, 0.012, 0.04]} />
        </mesh>
      ))}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={RUG}>
        <circleGeometry args={[2.55, 44]} />
      </mesh>
      <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.74, 1.86, 48]} />
        <meshBasicMaterial color="#e7c981" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT + 0.04, 0]} material={CEILING}>
        <boxGeometry args={[ROOM_SIZE, 0.1, ROOM_SIZE]} />
      </mesh>
      <RoomWalls accent={accent} secondary={secondary} />
      <Baseboard />
      <CeilingLights accent={accent} secondary={secondary} />
      <WindowCity accent={secondary} />
      <ExitDoor />
      <SofaAndTable />
    </group>
  );
}

function RoomWalls({ accent, secondary }: { accent: string; secondary: string }) {
  const winW = 5.2;
  const winH = 2.34;
  const sill = 0.86;
  const sideZ = (ROOM_SIZE - winW) / 2;
  return (
    <group>
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_HALF]} material={WALL}>
        <boxGeometry args={[ROOM_SIZE, ROOM_HEIGHT, 0.22]} />
      </mesh>
      <mesh position={[ROOM_HALF, ROOM_HEIGHT / 2, 0]} material={WALL}>
        <boxGeometry args={[0.22, ROOM_HEIGHT, ROOM_SIZE]} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, ROOM_HALF]} material={WALL}>
        <boxGeometry args={[ROOM_SIZE, ROOM_HEIGHT, 0.22]} />
      </mesh>

      <mesh
        position={[-ROOM_HALF, sill + winH + (ROOM_HEIGHT - sill - winH) / 2, 0]}
        material={WALL}
      >
        <boxGeometry args={[0.22, ROOM_HEIGHT - sill - winH, ROOM_SIZE]} />
      </mesh>
      <mesh position={[-ROOM_HALF, sill / 2, 0]} material={WALL}>
        <boxGeometry args={[0.22, sill, ROOM_SIZE]} />
      </mesh>
      <mesh position={[-ROOM_HALF, sill + winH / 2, -ROOM_HALF + sideZ / 2]} material={WALL}>
        <boxGeometry args={[0.22, winH, sideZ]} />
      </mesh>
      <mesh position={[-ROOM_HALF, sill + winH / 2, ROOM_HALF - sideZ / 2]} material={WALL}>
        <boxGeometry args={[0.22, winH, sideZ]} />
      </mesh>

      <WindowFrame winW={winW} winH={winH} sill={sill} accent={accent} secondary={secondary} />
    </group>
  );
}

function WindowFrame({
  winW,
  winH,
  sill,
  accent,
  secondary,
}: {
  winW: number;
  winH: number;
  sill: number;
  accent: string;
  secondary: string;
}) {
  return (
    <group>
      <mesh position={[-ROOM_HALF + 0.08, sill + winH + 0.05, 0]} material={WALL_TRIM}>
        <boxGeometry args={[0.08, 0.14, winW + 0.28]} />
      </mesh>
      <mesh position={[-ROOM_HALF + 0.08, sill - 0.04, 0]} material={WALL_TRIM}>
        <boxGeometry args={[0.08, 0.14, winW + 0.28]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[-ROOM_HALF + 0.08, sill + winH / 2, side * winW / 2]} material={WALL_TRIM}>
          <boxGeometry args={[0.08, winH + 0.28, 0.14]} />
        </mesh>
      ))}
      <mesh position={[-ROOM_HALF + 0.2, sill - 0.08, 0]} material={WOOD}>
        <boxGeometry args={[0.42, 0.1, winW + 0.42]} />
      </mesh>
      <mesh position={[-ROOM_HALF + 0.015, sill + winH / 2, 0]}>
        <boxGeometry args={[0.025, winH, winW]} />
        <meshStandardMaterial
          color="#8cc7ff"
          emissive={secondary}
          emissiveIntensity={0.08}
          transparent
          opacity={0.22}
        />
      </mesh>
      <mesh position={[-ROOM_HALF + 0.02, sill + winH / 2, 0]} material={WALL_TRIM}>
        <boxGeometry args={[0.045, winH, 0.045]} />
      </mesh>
      <mesh position={[-ROOM_HALF + 0.02, sill + winH / 2, 0]} material={WALL_TRIM}>
        <boxGeometry args={[0.045, 0.045, winW]} />
      </mesh>
      <pointLight position={[-ROOM_HALF + 0.5, 2.0, 0]} color={accent} intensity={0.3} distance={6} />
    </group>
  );
}

function Baseboard() {
  return (
    <group>
      <mesh position={[0, 0.1, -ROOM_HALF + 0.14]} material={WALL_TRIM}>
        <boxGeometry args={[ROOM_SIZE, 0.2, 0.07]} />
      </mesh>
      <mesh position={[0, 0.1, ROOM_HALF - 0.14]} material={WALL_TRIM}>
        <boxGeometry args={[ROOM_SIZE, 0.2, 0.07]} />
      </mesh>
      <mesh position={[ROOM_HALF - 0.14, 0.1, 0]} material={WALL_TRIM}>
        <boxGeometry args={[0.07, 0.2, ROOM_SIZE]} />
      </mesh>
    </group>
  );
}

function CeilingLights({ accent, secondary }: { accent: string; secondary: string }) {
  const positions = [-3.2, 0, 3.2];
  return (
    <group>
      {positions.flatMap((x) =>
        positions.map((z, index) => (
          <group key={`${x}-${z}`} position={[x, ROOM_HEIGHT - 0.015, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.18, 18]} />
              <meshBasicMaterial color={index % 2 ? secondary : accent} toneMapped={false} />
            </mesh>
            <pointLight color={index % 2 ? secondary : accent} intensity={0.14} distance={4} />
          </group>
        )),
      )}
    </group>
  );
}

function WindowCity({ accent }: { accent: string }) {
  const buildings = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const h = 1.2 + ((i * 17) % 9) * 0.38;
        return {
          x: -14 - ((i * 13) % 16),
          z: -7 + ((i * 19) % 15),
          w: 0.55 + ((i * 7) % 4) * 0.18,
          d: 0.7 + ((i * 5) % 4) * 0.16,
          h,
        };
      }),
    [],
  );
  return (
    <group position={[-ROOM_HALF - 5.8, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7, -0.08, 0]}>
        <planeGeometry args={[48, 32]} />
        <meshLambertMaterial color="#17243b" />
      </mesh>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshLambertMaterial color={i % 3 ? '#1e2942' : '#273653'} />
          </mesh>
          {i % 2 === 0 && (
            <mesh position={[0.01, b.h * 0.52, 0]}>
              <boxGeometry args={[b.w * 1.01, b.h * 0.5, b.d * 1.01]} />
              <meshLambertMaterial color="#0b1220" emissive={accent} emissiveIntensity={0.32} />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[-18, 7.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[36, 16]} />
        <meshBasicMaterial color="#334b72" transparent opacity={0.32} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SofaAndTable() {
  return (
    <group>
      <group position={[-3.1, 0, -2.55]} rotation={[0, Math.PI / 6, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow material={FABRIC}>
          <boxGeometry args={[2.35, 0.42, 0.9]} />
        </mesh>
        <mesh position={[0, 0.72, -0.35]} castShadow receiveShadow material={FABRIC}>
          <boxGeometry args={[2.35, 0.64, 0.2]} />
        </mesh>
        {[-1.12, 1.12].map((x) => (
          <mesh key={x} position={[x, 0.55, 0]} castShadow receiveShadow material={FABRIC}>
            <boxGeometry args={[0.22, 0.56, 0.92]} />
          </mesh>
        ))}
      </group>
      <group position={[-2.1, 0, -0.28]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow material={WOOD}>
          <boxGeometry args={[1.25, 0.07, 0.72]} />
        </mesh>
        {[-0.52, 0.52].flatMap((x) =>
          [-0.3, 0.3].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.22, z]} castShadow receiveShadow material={WOOD_DARK}>
              <boxGeometry args={[0.06, 0.42, 0.06]} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}

function CentralPedestal({
  stationId,
  layout,
  accent,
  status,
  agentName,
  isNear,
  onStationClick,
}: StationProps & {
  status: string;
  agentName?: string;
}) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) {
      ring.current.rotation.z = clock.elapsedTime * 0.45;
      ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.4) * 0.035);
    }
  });
  return (
    <group position={layout[stationId].position}>
      <mesh position={[0, 0.11, 0]} castShadow receiveShadow material={METAL}>
        <cylinderGeometry args={[0.92, 1.02, 0.22, 32]} />
      </mesh>
      <mesh ref={ring} position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.16, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={isNear ? 0.72 : 0.42} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <SceneLabel position={[0, 2.72, -0.16]} fontSize={0.13} color={accent} anchorX="center">
        {agentName || 'Agent'}
      </SceneLabel>
      <SceneLabel position={[0, 2.51, -0.16]} fontSize={0.075} color={statusColor(status)} anchorX="center">
        {labelAgentStatus(status)}
      </SceneLabel>
      <ClickHotspot stationId={stationId} layout={layout} onStationClick={onStationClick} radius={1.2} height={2.5} />
    </group>
  );
}

interface StationProps {
  stationId: StationId;
  layout: StationLayout;
  accent: string;
  isNear: boolean;
  onStationClick: (id: StationId) => void;
}

function TvStation({
  stationId,
  layout,
  accent,
  secondary,
  status,
  tier,
  messagesToday,
  uptimeSec,
  isNear,
  onStationClick,
}: StationProps & {
  secondary: string;
  status: string;
  tier?: string;
  messagesToday?: number;
  uptimeSec?: number;
}) {
  const uptime = typeof uptimeSec === 'number' ? `${Math.floor(uptimeSec / 3600)}h` : 'live';
  return (
    <group position={[0, 0, 0]}>
      <group position={[1.7, 2.18, -ROOM_HALF + 0.15]}>
        <mesh castShadow receiveShadow material={BLACK}>
          <boxGeometry args={[3.7, 2, 0.12]} />
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <boxGeometry args={[3.45, 1.78, 0.04]} />
          <meshBasicMaterial color="#05070c" />
        </mesh>
        <SceneLabel position={[0, 0.56, 0.1]} fontSize={0.14} color={accent} anchorX="center">
          Status Console
        </SceneLabel>
        <SceneLabel position={[0, 0.24, 0.1]} fontSize={0.13} color={statusColor(status)} anchorX="center">
          {labelAgentStatus(status)}
        </SceneLabel>
        <SceneLabel position={[0, -0.12, 0.1]} fontSize={0.075} color="#cbd5e1" anchorX="center">
          {`${tier || 'tier'} · ${messagesToday ?? 0} msgs · ${uptime}`}
        </SceneLabel>
        <mesh position={[-1.28, -0.55, 0.11]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.32, 24]} />
          <meshBasicMaterial color={secondary} transparent opacity={0.82} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[1.7, 0.29, -ROOM_HALF + 0.45]} castShadow receiveShadow material={WOOD}>
        <boxGeometry args={[4.2, 0.58, 0.68]} />
      </mesh>
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot stationId={stationId} layout={layout} onStationClick={onStationClick} radius={1.55} height={2.6} />
    </group>
  );
}

function LogsStation({
  stationId,
  layout,
  accent,
  isNear,
  onStationClick,
}: StationProps) {
  return (
    <group>
      <group position={[-4.25, 1.92, -ROOM_HALF + 0.16]}>
        <mesh castShadow receiveShadow material={BLACK}>
          <boxGeometry args={[2.0, 1.75, 0.1]} />
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <boxGeometry args={[1.82, 1.56, 0.035]} />
          <meshBasicMaterial color="#02040a" />
        </mesh>
        {Array.from({ length: 11 }, (_, i) => (
          <SceneLabel
            key={i}
            position={[-0.78, 0.62 - i * 0.115, 0.095]}
            fontSize={0.045}
            color={i % 3 === 0 ? accent : '#a78bfa'}
            anchorX="left"
            anchorY="middle"
          >
            {i % 4 === 0 ? 'INFO agent.tick' : i % 4 === 1 ? 'OK tool.call' : i % 4 === 2 ? 'MEM write' : 'MAIL scan'}
          </SceneLabel>
        ))}
      </group>
      <PanelTag position={[-4.25, 2.92, -ROOM_HALF + 0.24]} label="Logs" color={accent} />
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot stationId={stationId} layout={layout} onStationClick={onStationClick} radius={1.45} height={2.4} />
    </group>
  );
}

function DeskStation({
  stationId,
  layout,
  accent,
  isNear,
  onStationClick,
}: StationProps) {
  return (
    <group>
      <group position={[3.2, 0, ROOM_HALF - 0.82]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.84, 0]} castShadow receiveShadow material={WOOD}>
          <boxGeometry args={[2.65, 0.08, 1.12]} />
        </mesh>
        {[-1.18, 1.18].flatMap((x) =>
          [-0.46, 0.46].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.42, z]} castShadow receiveShadow material={WOOD_DARK}>
              <boxGeometry args={[0.07, 0.84, 0.07]} />
            </mesh>
          )),
        )}
        <group position={[0, 0.9, 0.03]}>
          <mesh material={METAL}>
            <boxGeometry args={[0.8, 0.035, 0.54]} />
          </mesh>
          <mesh position={[0, 0.24, -0.27]} rotation={[-0.34, 0, 0]} material={METAL}>
            <boxGeometry args={[0.8, 0.48, 0.03]} />
          </mesh>
          <mesh position={[0, 0.24, -0.29]} rotation={[-0.34, 0, 0]}>
            <planeGeometry args={[0.68, 0.38]} />
            <meshBasicMaterial color="#06111f" />
          </mesh>
          <SceneLabel position={[0, 0.28, -0.31]} rotation={[-0.34, Math.PI, 0]} fontSize={0.045} color={accent} anchorX="center">
            CONFIG
          </SceneLabel>
        </group>
        <mesh position={[-0.62, 0.94, 0.18]} castShadow receiveShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.15, 14]} />
          <meshLambertMaterial color="#e8eef9" />
        </mesh>
      </group>
      <group position={[3.2, 0, ROOM_HALF - 1.86]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={FABRIC}>
          <boxGeometry args={[0.62, 0.1, 0.62]} />
        </mesh>
        <mesh position={[0, 0.88, 0.29]} castShadow receiveShadow material={FABRIC}>
          <boxGeometry args={[0.62, 0.72, 0.08]} />
        </mesh>
        <mesh position={[0, 0.26, 0]} castShadow receiveShadow material={METAL}>
          <cylinderGeometry args={[0.045, 0.045, 0.5, 10]} />
        </mesh>
      </group>
      <PanelTag position={[3.2, 2.42, ROOM_HALF - 0.16]} label="Config" color={accent} rotationY={Math.PI} />
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot stationId={stationId} layout={layout} onStationClick={onStationClick} radius={1.45} height={2.2} />
    </group>
  );
}

function CorkboardStation({
  stationId,
  layout,
  accent,
  connectedIntegrations,
  isNear,
  onStationClick,
}: StationProps & {
  connectedIntegrations: Set<string>;
}) {
  return (
    <group>
      <group position={[-3.65, 1.92, ROOM_HALF - 0.14]} rotation={[0, Math.PI, 0]}>
        <mesh material={WOOD_DARK}>
          <boxGeometry args={[4.35, 2.52, 0.06]} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[4.05, 2.25, 0.05]} />
          <meshStandardMaterial color="#a67a4a" roughness={0.9} />
        </mesh>
        {INTEGRATION_KEYS.map((key, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const connected = connectedIntegrations.has(key) || (key === 'mail' && connectedIntegrations.has('gmail'));
          const color = connected ? accent : '#6b5f46';
          return (
            <group
              key={key}
              position={[-1.48 + col * 0.98, 0.62 - row * 0.72, 0.085]}
              rotation={[0, 0, ((i * 17) % 7 - 3) * 0.01]}
            >
              <mesh>
                <boxGeometry args={[0.82, 0.52, 0.035]} />
                <meshLambertMaterial color={connected ? '#f1ead7' : '#6d6655'} emissive={connected ? color : '#000'} emissiveIntensity={connected ? 0.12 : 0} />
              </mesh>
              <mesh position={[-0.27, 0.08, 0.03]}>
                <circleGeometry args={[0.12, 18]} />
                <meshBasicMaterial color={color} toneMapped={false} />
              </mesh>
              <SceneLabel position={[0.08, 0.08, 0.04]} fontSize={0.07} color={connected ? '#111827' : '#aaa38f'} anchorX="center">
                {key}
              </SceneLabel>
            </group>
          );
        })}
      </group>
      <PanelTag position={[-3.65, 3.36, ROOM_HALF - 0.18]} label="Integrations" color={accent} rotationY={Math.PI} />
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot stationId={stationId} layout={layout} onStationClick={onStationClick} radius={1.65} height={2.5} />
    </group>
  );
}

function BookshelfStation({
  stationId,
  layout,
  accent,
  hasMemory,
  canEdit,
  isNear,
  onStationClick,
}: StationProps & {
  hasMemory: boolean;
  canEdit: boolean;
}) {
  const bookColors = ['#8a3a4a', '#4a6a8a', '#6b8a4a', '#8a6e3a', '#6b4a6e', '#3a6b6e'];
  return (
    <group>
      <group position={[ROOM_HALF - 0.28, 0, -1.1]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 1.92, 0]} castShadow receiveShadow material={WOOD_DARK}>
          <boxGeometry args={[0.44, 3.35, 6.65]} />
        </mesh>
        {[0.32, 1.05, 1.78, 2.51, 3.24].map((y) => (
          <mesh key={y} position={[-0.08, y, 0]} castShadow receiveShadow material={WOOD}>
            <boxGeometry args={[0.55, 0.06, 6.8]} />
          </mesh>
        ))}
        {Array.from({ length: 56 }, (_, i) => {
          const row = Math.floor(i / 14);
          const col = i % 14;
          const z = -3 + col * 0.44;
          const h = 0.36 + ((i * 13) % 8) * 0.035;
          const memory = canEdit && hasMemory && i % 7 === 0;
          return (
            <mesh
              key={i}
              position={[-0.36, 0.53 + row * 0.73 + h / 2, z]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.22, h, 0.09 + (i % 3) * 0.018]} />
              <meshLambertMaterial
                color={memory ? '#c89a55' : bookColors[i % bookColors.length]}
                emissive={memory ? accent : '#000'}
                emissiveIntensity={memory ? 0.22 : 0}
              />
            </mesh>
          );
        })}
      </group>
      <PanelTag position={[ROOM_HALF - 0.22, 3.48, -1.1]} label="Memory" color={accent} rotationY={-Math.PI / 2} />
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot stationId={stationId} layout={layout} onStationClick={onStationClick} radius={1.6} height={2.9} />
    </group>
  );
}

function WorkbenchStation({
  stationId,
  layout,
  accent,
  isNear,
  onStationClick,
}: StationProps) {
  return (
    <group>
      <group position={[-ROOM_HALF + 0.55, 0, -2.2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow material={WOOD}>
          <boxGeometry args={[2.55, 0.08, 0.9]} />
        </mesh>
        {[-1.08, 1.08].flatMap((x) =>
          [-0.35, 0.35].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.37, z]} castShadow receiveShadow material={WOOD_DARK}>
              <boxGeometry args={[0.07, 0.74, 0.07]} />
            </mesh>
          )),
        )}
        {[-0.75, 0, 0.75].map((x, i) => (
          <group key={x} position={[x, 0.9, 0]}>
            <mesh castShadow receiveShadow material={METAL}>
              <boxGeometry args={[0.42, 0.26, 0.34]} />
            </mesh>
            <mesh position={[0, 0.23, 0]}>
              <octahedronGeometry args={[0.16, 0]} />
              <meshLambertMaterial color={i % 2 ? '#7dd3fc' : accent} emissive={i % 2 ? '#7dd3fc' : accent} emissiveIntensity={0.35} />
            </mesh>
          </group>
        ))}
      </group>
      <PanelTag position={[-ROOM_HALF + 0.17, 2.0, -2.2]} label="Skills" color={accent} rotationY={Math.PI / 2} />
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot stationId={stationId} layout={layout} onStationClick={onStationClick} radius={1.45} height={2.0} />
    </group>
  );
}

function PluginsStation({
  stationId,
  layout,
  accent,
  pluginsInstalled,
  isNear,
  onStationClick,
}: StationProps & {
  pluginsInstalled: number;
}) {
  return (
    <group>
      <group position={[-ROOM_HALF + 0.42, 0, 3.7]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow material={WOOD_DARK}>
          <boxGeometry args={[1.55, 1.45, 1.15]} />
        </mesh>
        {[0.24, 0.72, 1.18].map((y) => (
          <mesh key={y} position={[0, y, -0.6]} material={WOOD}>
            <boxGeometry args={[1.35, 0.05, 0.06]} />
          </mesh>
        ))}
        {Array.from({ length: Math.min(6, Math.max(pluginsInstalled, 2)) }, (_, i) => (
          <mesh key={i} position={[-0.5 + (i % 3) * 0.5, 0.38 + Math.floor(i / 3) * 0.52, -0.65]}>
            <boxGeometry args={[0.24, 0.28, 0.08]} />
            <meshLambertMaterial color={i < pluginsInstalled ? accent : '#475569'} emissive={i < pluginsInstalled ? accent : '#000'} emissiveIntensity={i < pluginsInstalled ? 0.25 : 0} />
          </mesh>
        ))}
      </group>
      <PanelTag position={[-ROOM_HALF + 0.18, 1.82, 3.7]} label={`Plugins · ${pluginsInstalled}`} color={accent} rotationY={Math.PI / 2} />
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot stationId={stationId} layout={layout} onStationClick={onStationClick} radius={1.35} height={1.8} />
    </group>
  );
}

function MailStation({
  stationId,
  layout,
  accent,
  isNear,
  onStationClick,
}: StationProps) {
  return (
    <group>
      <group position={[6.2, 0.86, 5.2]} rotation={[0, -0.55, 0]}>
        <mesh castShadow receiveShadow material={WOOD}>
          <boxGeometry args={[0.82, 0.58, 0.5]} />
        </mesh>
        <mesh position={[0, 0.33, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.72, 0.05, 0.42]} />
          <meshLambertMaterial color={accent} emissive={accent} emissiveIntensity={0.32} />
        </mesh>
        <SceneLabel position={[0, 0.05, -0.27]} fontSize={0.09} color="#0f172a" anchorX="center">
          MAIL
        </SceneLabel>
      </group>
      <PanelTag position={[6.2, 1.62, 5.2]} label="Mail" color={accent} rotationY={-0.55} />
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot stationId={stationId} layout={layout} onStationClick={onStationClick} radius={1.2} height={1.6} />
    </group>
  );
}

function StatsFloorGlow({
  layout,
  accent,
  status,
  messagesToday,
}: {
  layout: StationLayout;
  accent: string;
  status: string;
  messagesToday?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = -clock.elapsedTime * 0.24;
  });
  const station = layout.statsHologram;
  return (
    <group position={station.position}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.15, 1.2, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.22} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <SceneLabel position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.18} color={accent} anchorX="center">
        {`${labelAgentStatus(status)} · ${messagesToday ?? 0}`}
      </SceneLabel>
    </group>
  );
}

function ExitDoor() {
  return (
    <group position={[ROOM_HALF - 2, 0, ROOM_HALF - 0.13]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 1.08, 0]} castShadow receiveShadow material={WOOD_DARK}>
        <boxGeometry args={[1.12, 2.16, 0.07]} />
      </mesh>
      <mesh position={[0, 1.18, -0.03]} material={WALL_TRIM}>
        <boxGeometry args={[1.3, 2.38, 0.08]} />
      </mesh>
      <mesh position={[0.4, 1.05, 0.05]} material={METAL}>
        <sphereGeometry args={[0.05, 12, 8]} />
      </mesh>
      <mesh position={[0, 0.02, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 0.05]} />
        <meshBasicMaterial color="#ffd089" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <SceneLabel position={[0, 2.45, -0.08]} fontSize={0.1} color="#65e7ff" anchorX="center">
        HOUSE
      </SceneLabel>
    </group>
  );
}

function RoomPlants() {
  return (
    <group>
      <Plant position={[ROOM_HALF - 1.05, 0, -ROOM_HALF + 1.0]} scale={0.95} />
      <Plant position={[-ROOM_HALF + 1.05, 0, ROOM_HALF - 1.05]} scale={0.82} />
      <Plant position={[5.5, 0, -5.5]} scale={0.66} />
    </group>
  );
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.28, 0.46, 14]} />
        <meshLambertMaterial color="#6b3f2b" />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.16, 0.62 + (i % 3) * 0.08, Math.sin(a) * 0.16]}
            scale={[0.72, 1.45, 0.55]}
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

function PanelTag({
  position,
  label,
  color,
  rotationY = 0,
}: {
  position: [number, number, number];
  label: string;
  color: string;
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[1.12, 0.28, 0.04]} />
        <meshBasicMaterial color="#050814" transparent opacity={0.88} />
      </mesh>
      <SceneLabel position={[0, 0.01, 0.035]} fontSize={0.075} color={color} anchorX="center" anchorY="middle">
        {label}
      </SceneLabel>
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
      distanceFactor={7}
      zIndexRange={[8, 0]}
    >
      <div
        style={{
          color,
          fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, monospace',
          fontSize: `${Math.max(7, fontSize * 82)}px`,
          fontWeight: 700,
          lineHeight: 1.05,
          maxWidth: maxWidth ? `${maxWidth * 82}px` : undefined,
          overflow: 'hidden',
          textAlign: 'center',
          textOverflow: 'ellipsis',
          textShadow: '0 1px 8px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
    </Html>
  );
}

function StationNearGlow({
  position,
  color,
  active,
}: {
  position: [number, number, number];
  color: string;
  active: boolean;
}) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <ringGeometry args={[active ? 0.82 : 0.58, active ? 0.9 : 0.62, 40]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.55 : 0.13} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {active && <pointLight color={color} intensity={0.55} distance={3.2} position={[0, 1.2, 0]} />}
    </group>
  );
}

function ClickHotspot({
  stationId,
  layout,
  onStationClick,
  radius,
  height,
}: {
  stationId: StationId;
  layout: StationLayout;
  onStationClick: (id: StationId) => void;
  radius: number;
  height: number;
}) {
  const station = layout[stationId];
  return (
    <mesh
      position={[station.position[0], height / 2, station.position[2]]}
      onClick={(event) => {
        event.stopPropagation();
        onStationClick(stationId);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <cylinderGeometry args={[radius, radius, height, 16]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
