'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { LiveBuildings } from '@/components/city/v3/LiveBuildings';
import { deriveHandoffBuildingVisual } from '@/components/city/v3/liveCityHandoff';
import type { LiveBuildingLayout } from '@/components/city/v3/liveLayout';
import type { StationId, StationLayout } from './layout';
import { ROOM_HALF, ROOM_HEIGHT, ROOM_SIZE } from './grid';

interface Props {
  layout: StationLayout;
  framework: string;
  status: string;
  tier?: string;
  messagesToday?: number;
  uptimeSec?: number;
  logLines?: string[];
  connectedIntegrations: Set<string>;
  hasMemory: boolean;
  nearest: StationId | null;
  canEdit: boolean;
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
const FLOOR_PLANK_A = new THREE.MeshStandardMaterial({
  color: 0x7c5736,
  roughness: 0.78,
});
const FLOOR_PLANK_B = new THREE.MeshStandardMaterial({
  color: 0x654329,
  roughness: 0.82,
});
const WALL = new THREE.MeshStandardMaterial({
  color: 0x5a4a3b,
  roughness: 0.86,
});
const WALL_TRIM = new THREE.MeshStandardMaterial({
  color: 0x3a281a,
  roughness: 0.75,
});
const CEILING = new THREE.MeshStandardMaterial({
  color: 0x2c2118,
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
  color: 0x7a7167,
  roughness: 0.48,
  metalness: 0.36,
});
const BLACK = new THREE.MeshStandardMaterial({
  color: 0x0a0f18,
  roughness: 0.62,
  metalness: 0.15,
});
const FABRIC = new THREE.MeshStandardMaterial({
  color: 0x5a4a40,
  roughness: 0.92,
});
const RUG = new THREE.MeshStandardMaterial({
  color: 0x6b3f2b,
  roughness: 0.84,
});

const INTEGRATION_CATALOG = {
  openclaw: [
    { id: 'telegram', label: 'Telegram', aliases: ['telegram'] },
    { id: 'discord', label: 'Discord', aliases: ['discord'] },
    { id: 'slack', label: 'Slack', aliases: ['slack'] },
    { id: 'whatsapp', label: 'WhatsApp', aliases: ['whatsapp'] },
    { id: 'twitter', label: 'X', aliases: ['twitter', 'x'] },
    { id: 'mail', label: 'Mail', aliases: ['mail', 'gmail', 'email'] },
    { id: 'brave', label: 'Brave', aliases: ['brave', 'web_search', 'search'] },
    { id: 'memory', label: 'Memory', aliases: ['memory'] },
  ],
  hermes: [
    { id: 'telegram', label: 'Telegram', aliases: ['telegram'] },
    { id: 'discord', label: 'Discord', aliases: ['discord'] },
    { id: 'slack', label: 'Slack', aliases: ['slack'] },
    { id: 'mail', label: 'Mail', aliases: ['mail', 'gmail', 'email'] },
    { id: 'brave', label: 'Brave', aliases: ['brave', 'web_search', 'search'] },
    { id: 'memory', label: 'Memory', aliases: ['memory'] },
  ],
} as const;

export function RoomOffice({
  layout,
  framework,
  status,
  tier,
  messagesToday,
  uptimeSec,
  logLines = [],
  connectedIntegrations,
  hasMemory,
  nearest,
  canEdit,
  onStationClick,
}: Props) {
  void tier;
  void messagesToday;
  void uptimeSec;
  const accent = framework === 'hermes' ? '#9fc1c7' : '#d6b177';
  const secondary = framework === 'hermes' ? '#9fc1c7' : '#c99a6b';

  return (
    <group>
      <OfficeShell
        accent={accent}
        secondary={secondary}
        layout={layout}
        nearest={nearest}
        onStationClick={onStationClick}
      />
      <CentralPedestal
        stationId="agentAvatar"
        layout={layout}
        accent={accent}
        isNear={nearest === 'agentAvatar'}
        onStationClick={onStationClick}
      />
      <TvStation
        stationId="statusConsole"
        layout={layout}
        accent={accent}
        status={status}
        logLines={logLines}
        isNear={nearest === 'statusConsole'}
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
        framework={framework}
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
      <RoomPlants />
    </group>
  );
}

function OfficeShell({
  accent,
  secondary,
  layout,
  nearest,
  onStationClick,
}: {
  accent: string;
  secondary: string;
  layout: StationLayout;
  nearest: StationId | null;
  onStationClick: (id: StationId) => void;
}) {
  return (
    <group>
      <mesh position={[0, -0.055, 0]} receiveShadow material={FLOOR}>
        <boxGeometry args={[ROOM_SIZE, 0.11, ROOM_SIZE]} />
      </mesh>
      <FloorPlanks />
      <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]} material={RUG}>
        <circleGeometry args={[2.55, 44]} />
      </mesh>
      <mesh position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
      <ExitDoor
        stationId="buildingExit"
        layout={layout}
        accent={accent}
        isNear={nearest === 'buildingExit'}
        onStationClick={onStationClick}
      />
      <SofaAndTable />
    </group>
  );
}

function FloorPlanks() {
  const plankW = 1.05;
  const rows = 14;
  const cols = 16;
  return (
    <group>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const x = -ROOM_HALF + plankW / 2 + col * plankW;
          const z = -ROOM_HALF + ROOM_SIZE / rows / 2 + row * (ROOM_SIZE / rows);
          const stagger = row % 2 === 0 ? 0 : plankW / 2;
          return (
            <mesh
              key={`${row}-${col}`}
              position={[x - stagger, 0.006, z]}
              receiveShadow
              material={(row + col) % 2 === 0 ? FLOOR_PLANK_A : FLOOR_PLANK_B}
            >
              <boxGeometry args={[plankW - 0.035, 0.018, ROOM_SIZE / rows - 0.035]} />
            </mesh>
          );
        }),
      )}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <mesh
          key={`seam-z-${i}`}
          position={[0, 0.018, -ROOM_HALF + i * (ROOM_SIZE / rows)]}
          receiveShadow
          material={FLOOR_DARK}
        >
          <boxGeometry args={[ROOM_SIZE, 0.01, 0.018]} />
        </mesh>
      ))}
    </group>
  );
}

function RoomWalls({ accent, secondary }: { accent: string; secondary: string }) {
  const winW = 5.9;
  const winH = 2.68;
  const sill = 0.26;
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
      <mesh position={[-ROOM_HALF + 0.08, sill - 0.035, 0]} material={WALL_TRIM}>
        <boxGeometry args={[0.08, 0.14, winW + 0.28]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[-ROOM_HALF + 0.08, sill + winH / 2, (side * winW) / 2]}
          material={WALL_TRIM}
        >
          <boxGeometry args={[0.08, winH + 0.28, 0.14]} />
        </mesh>
      ))}
      <mesh position={[-ROOM_HALF + 0.18, sill - 0.095, 0]} material={WOOD}>
        <boxGeometry args={[0.34, 0.08, winW + 0.42]} />
      </mesh>
      <mesh position={[-ROOM_HALF + 0.02, sill + winH / 2, 0]} material={WALL_TRIM}>
        <boxGeometry args={[0.045, winH, 0.045]} />
      </mesh>
      <mesh position={[-ROOM_HALF + 0.02, sill + winH / 2, 0]} material={WALL_TRIM}>
        <boxGeometry args={[0.045, 0.045, winW]} />
      </mesh>
      <pointLight
        position={[-ROOM_HALF + 0.5, 2.0, 0]}
        color={accent}
        intensity={0.3}
        distance={6}
      />
    </group>
  );
}

function WindowViewBackdrop({
  winW,
  winH,
  sill,
}: {
  winW: number;
  winH: number;
  sill: number;
}) {
  const timeMode: WindowTimeMode = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 21 ? 'day' : 'night';
  }, []);
  const buildings = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        z: -winW / 2 + 0.42 + i * 0.29,
        h: 0.24 + pseudoUnit(i + 401) * 0.52,
        w: 0.12 + pseudoUnit(i + 402) * 0.12,
        color: i % 4 === 0 ? '#64748b' : i % 3 === 0 ? '#c6ad80' : '#8ea2a8',
      })),
    [winW],
  );
  const skyColor = timeMode === 'day' ? '#dce8f0' : '#162038';
  const horizonColor = timeMode === 'day' ? '#b9d6db' : '#1e2d40';
  const groundColor = timeMode === 'day' ? '#7dbb72' : '#314a31';
  const groundAlt = timeMode === 'day' ? '#95ca86' : '#3f5d3c';
  const roadColor = timeMode === 'day' ? '#1a2130' : '#111827';
  const hillColor = timeMode === 'day' ? '#89a6a2' : '#1d3440';
  const farHillColor = timeMode === 'day' ? '#a8bec2' : '#22394a';

  return (
    <group>
      <mesh position={[-ROOM_HALF - 0.052, sill + winH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[winW, winH]} />
        <meshBasicMaterial
          color={skyColor}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-ROOM_HALF - 0.048, sill + 0.78, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[winW, 0.92]} />
        <meshBasicMaterial
          color={horizonColor}
          transparent
          opacity={0.82}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const z = -winW / 2 + 0.5 + i * (winW / 6);
        const h = 0.22 + pseudoUnit(i + 501) * 0.18;
        return (
          <mesh
            key={`window-hill-${i}`}
            position={[-ROOM_HALF - 0.046, sill + 1.02, z]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[0.58 + pseudoUnit(i + 502) * 0.34, h, 1]}
          >
            <circleGeometry args={[1, 24]} />
            <meshBasicMaterial
              color={i % 2 ? hillColor : farHillColor}
              toneMapped={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
      <mesh position={[-ROOM_HALF - 0.036, sill + 0.33, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[winW, 1.02]} />
        <meshBasicMaterial
          color={groundColor}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-ROOM_HALF - 0.034, sill + 0.44, -0.98]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[winW * 0.92, 0.13]} />
        <meshBasicMaterial
          color={roadColor}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-ROOM_HALF - 0.032, sill + 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[winW, 0.16]} />
        <meshBasicMaterial
          color={groundAlt}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-ROOM_HALF - 0.033, sill + 0.16, 1.0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[winW * 0.82, 0.32]} />
        <meshBasicMaterial
          color={groundAlt}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {buildings.map((building, i) => (
        <group key={`window-building-${i}`} position={[-ROOM_HALF - 0.03, sill + 0.5, building.z]}>
          <mesh position={[0, building.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[building.w, building.h]} />
            <meshBasicMaterial
              color={building.color}
              toneMapped={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
      {timeMode === 'day' && (
        <mesh position={[-ROOM_HALF - 0.028, sill + winH - 0.42, -1.72]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.18, 18]} />
          <meshBasicMaterial
            color="#fff1c0"
            toneMapped={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
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
  void accent;
  void secondary;
  const positions: Array<[number, number]> = [
    [-3.8, -3.8],
    [0, -3.8],
    [3.8, -3.8],
    [-3.8, 3.8],
    [0, 3.8],
    [3.8, 3.8],
  ];
  return (
    <group>
      {positions.map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, ROOM_HEIGHT - 0.035, z]}>
          <mesh>
            <boxGeometry args={[1.22, 0.045, 0.34]} />
            <meshLambertMaterial color="#f5d79e" emissive="#ffdca8" emissiveIntensity={0.55} />
          </mesh>
          <mesh position={[0, -0.03, 0]}>
            <boxGeometry args={[1.34, 0.012, 0.46]} />
            <meshBasicMaterial color="#ffe9bf" toneMapped={false} transparent opacity={0.72} />
          </mesh>
          <pointLight color="#ffd9a0" intensity={0.1} distance={4.4} />
        </group>
      ))}
    </group>
  );
}

function integrationCatalog(framework: string) {
  const key = framework.toLowerCase();
  return key === 'hermes' ? INTEGRATION_CATALOG.hermes : INTEGRATION_CATALOG.openclaw;
}

function wrapTextLine(value: string, maxChars: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['waiting for runtime output'];
}

function drawTvLogCanvas(
  canvas: HTMLCanvasElement,
  lines: string[],
  accent: string,
  elapsed: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, `${accent}20`);
  gradient.addColorStop(0.45, 'rgba(16, 185, 129, 0.04)');
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accent;
  ctx.font = '700 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('AGENT LOGS', 34, 46);

  ctx.strokeStyle = `${accent}70`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, 66);
  ctx.lineTo(w - 34, 66);
  ctx.stroke();

  const source =
    lines.length > 0
      ? lines
      : [
          'waiting for agent log tail',
          'runtime stream will appear here when the container emits logs',
          'use the room status console for manual start/stop actions',
        ];
  const wrapped = source
    .slice(-42)
    .flatMap((line) => wrapTextLine(line.replace(/\u001b\[[0-9;]*m/g, ''), 92));
  const visible = 14;
  const scrollRange = Math.max(0, wrapped.length - visible);
  const offset = scrollRange > 0 ? Math.floor(elapsed * 0.62) % (scrollRange + 1) : 0;
  const visibleLines = wrapped.slice(offset, offset + visible);

  ctx.font = '500 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  visibleLines.forEach((line, index) => {
    const y = 104 + index * 28;
    const level = line.match(/\b(ERROR|ERR|WARN|OK|INFO|DEBUG)\b/i)?.[1]?.toUpperCase();
    ctx.fillStyle =
      level === 'ERROR' || level === 'ERR'
        ? '#fb7185'
        : level === 'WARN'
          ? '#fbbf24'
          : level === 'OK'
            ? '#6ee7b7'
            : level === 'DEBUG'
              ? '#7dd3fc'
              : '#c7d2e0';
    ctx.fillText(line.slice(0, 96), 34, y);
  });

  const scanY = 82 + ((elapsed * 40) % 380);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, scanY, w, 3);
}

function TvLogScreen({
  lines,
  accent,
}: {
  lines: string[];
  accent: string;
}) {
  const canvas = useMemo(() => {
    const next = document.createElement('canvas');
    next.width = 1024;
    next.height = 512;
    return next;
  }, []);
  const texture = useMemo(() => {
    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.minFilter = THREE.LinearFilter;
    next.magFilter = THREE.LinearFilter;
    return next;
  }, [canvas]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    drawTvLogCanvas(canvas, lines, accent, clock.getElapsedTime());
    texture.needsUpdate = true;
  });

  return (
    <mesh position={[0, 0, 0.098]}>
      <planeGeometry args={[3.92, 1.72]} />
      <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function drawLaptopCanvas(canvas: HTMLCanvasElement, accent: string, elapsed: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#1c130c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(36, 23, 13, 0.96)';
  ctx.fillRect(0, 0, canvas.width, 42);

  ctx.fillStyle = '#ff5f57';
  ctx.beginPath();
  ctx.arc(24, 21, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#febc2e';
  ctx.beginPath();
  ctx.arc(45, 21, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#28c840';
  ctx.beginPath();
  ctx.arc(66, 21, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '700 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = accent;
  ctx.fillText('hatcher://agent/control', 96, 28);

  const tabs = ['Status', 'Config', 'Mail', 'Passport'];
  ctx.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
  tabs.forEach((tab, i) => {
    const x = 28 + i * 118;
    ctx.fillStyle = i === Math.floor(elapsed / 2) % tabs.length ? accent : '#bfa88b';
    ctx.fillText(tab, x, 74);
  });

  ctx.strokeStyle = `${accent}70`;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 92, 252, 112);
  ctx.strokeRect(302, 92, 254, 112);
  ctx.fillStyle = '#fff7e8';
  ctx.font = '700 18px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('ROOM CONTROLS', 48, 125);
  ctx.fillText('CONFIG EDITOR', 322, 125);
  ctx.fillStyle = '#d8c3a3';
  ctx.font = '500 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('runtime / inbox / passport', 48, 154);
  ctx.fillText('agent console online', 48, 178);
  ctx.fillText('identity / model / prompt', 322, 154);
  ctx.fillText('runtime settings save here', 322, 178);

  for (let i = 0; i < 28; i++) {
    const x = 36 + ((i * 43) % 500);
    const y = 228 + ((i * 29) % 70);
    ctx.fillStyle = i % 3 === 0 ? accent : 'rgba(191,168,139,0.5)';
    ctx.fillRect(x, y, 22 + (i % 4) * 8, 3);
  }
}

function LaptopScreen({ accent }: { accent: string }) {
  const canvas = useMemo(() => {
    const next = document.createElement('canvas');
    next.width = 640;
    next.height = 360;
    return next;
  }, []);
  const texture = useMemo(() => {
    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.minFilter = THREE.LinearFilter;
    next.magFilter = THREE.LinearFilter;
    return next;
  }, [canvas]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    drawLaptopCanvas(canvas, accent, clock.getElapsedTime());
    texture.needsUpdate = true;
  });

  return (
    <mesh renderOrder={6}>
      <planeGeometry args={[0.68, 0.38]} />
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function createFlatLabelTexture(text: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = '700 38px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 26);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function FlatBoardLabel({
  text,
  color,
  width = 0.52,
  height = 0.15,
}: {
  text: string;
  color: string;
  width?: number;
  height?: number;
}) {
  const texture = useMemo(() => createFlatLabelTexture(text, color), [color, text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh renderOrder={5}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

type WindowTimeMode = 'day' | 'night';

function windowTerrainNoise(x: number, z: number): number {
  return (
    Math.sin(x * 0.42) * Math.cos(z * 0.36) * 0.65 +
    Math.sin(x * 0.87 + 1.7) * Math.cos(z * 0.64 + 0.5) * 0.28 +
    Math.sin(x * 1.5 + 2.4) * Math.cos(z * 1.35 - 1.1) * 0.12
  );
}

function pseudoUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function createWindowTerrainGeometry(timeMode: WindowTimeMode): THREE.PlaneGeometry {
  const terrain = new THREE.PlaneGeometry(76, 54, 56, 40);
  terrain.rotateX(-Math.PI / 2);
  const positions = terrain.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const grass = new THREE.Color(timeMode === 'day' ? 0x7dbb72 : 0x245c37);
  const grass2 = new THREE.Color(timeMode === 'day' ? 0x95ca86 : 0x356f43);
  const farGrass = new THREE.Color(timeMode === 'day' ? 0xa7d29a : 0x274f37);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const edge = Math.max(0, Math.max(Math.abs(x + 7), Math.abs(z)) - 13) / 17;
    const height = windowTerrainNoise(x, z) * 0.24 * Math.min(1, edge);
    positions.setY(i, height);

    const color = grass
      .clone()
      .lerp(grass2, pseudoUnit(i) * 0.5)
      .lerp(farGrass, Math.min(1, edge * 0.7));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  return terrain;
}

function WindowTerrain({ timeMode }: { timeMode: WindowTimeMode }) {
  const geometry = useMemo(() => createWindowTerrainGeometry(timeMode), [timeMode]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[-36, -0.16, 0]} receiveShadow>
      <meshLambertMaterial vertexColors flatShading />
    </mesh>
  );
}

function WindowSkyDome({ timeMode }: { timeMode: WindowTimeMode }) {
  const uniforms = useMemo(
    () => ({
      uTop: {
        value: new THREE.Color(timeMode === 'day' ? 0x78a9df : 0x070d20),
      },
      uBottom: {
        value: new THREE.Color(timeMode === 'day' ? 0xe5edf4 : 0x1a2548),
      },
      uOffset: { value: timeMode === 'day' ? 0 : 0.05 },
      uExp: { value: timeMode === 'day' ? 0.72 : 0.5 },
    }),
    [timeMode],
  );

  return (
    <mesh>
      <sphereGeometry args={[90, 32, 18]} />
      <shaderMaterial
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vWorld;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `}
        fragmentShader={`
          uniform vec3 uTop;
          uniform vec3 uBottom;
          uniform float uOffset;
          uniform float uExp;
          varying vec3 vWorld;
          void main() {
            float h = normalize(vWorld).y;
            float t = pow(max(h + uOffset, 0.0), uExp);
            vec3 col = mix(uBottom, uTop, clamp(t, 0.0, 1.0));
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function WindowSkyline({ timeMode }: { timeMode: WindowTimeMode }) {
  const mountains = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: -38 - pseudoUnit(i + 4) * 6.5,
        z: -24 + i * 2.85 + pseudoUnit(i + 17) * 0.9,
        width: 3.7 + pseudoUnit(i + 28) * 4.1,
        height: 3.1 + pseudoUnit(i + 39) * 5.2,
        rotation: pseudoUnit(i + 51) * Math.PI,
      })),
    [],
  );
  const mountainColor = timeMode === 'day' ? '#8ea2c5' : '#202840';
  const farMountainColor = timeMode === 'day' ? '#6f8f96' : '#1b2a2f';

  return (
    <group>
      {mountains.map((mountain, index) => (
        <mesh
          key={index}
          position={[mountain.x, mountain.height / 2 - 0.6, mountain.z]}
          rotation={[0, mountain.rotation, 0]}
          receiveShadow
        >
          <coneGeometry args={[mountain.width, mountain.height, 4]} />
          <meshLambertMaterial
            color={index % 3 === 0 ? farMountainColor : mountainColor}
            flatShading
          />
        </mesh>
      ))}
      {timeMode === 'day' ? (
        <mesh position={[-33, 7.5, -12.8]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.55, 24]} />
          <meshBasicMaterial color="#fff1c0" toneMapped={false} depthWrite={false} />
        </mesh>
      ) : (
        <group>
          {Array.from({ length: 28 }, (_, i) => (
            <mesh
              key={i}
              position={[
                -31,
                3.5 + pseudoUnit(i + 102) * 5.2,
                -25 + pseudoUnit(i + 201) * 50,
              ]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <circleGeometry args={[0.025 + pseudoUnit(i + 301) * 0.025, 8]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.55}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

const WINDOW_BUILDING_SPECS = [
  { key: 'vista-free-01', tier: 0, x: -62, z: -25, rotation: 0.12 },
  { key: 'vista-free-02', tier: 0, x: -56, z: -18, rotation: -0.2 },
  { key: 'vista-free-03', tier: 0, x: -49, z: -24, rotation: 0.34 },
  { key: 'vista-free-04', tier: 0, x: -42, z: -17, rotation: -0.05 },
  { key: 'vista-free-05', tier: 0, x: -34, z: -22, rotation: 0.24 },
  { key: 'vista-free-06', tier: 0, x: -59, z: 24, rotation: -0.18 },
  { key: 'vista-free-07', tier: 0, x: -51, z: 17, rotation: 0.08 },
  { key: 'vista-free-08', tier: 0, x: -44, z: 26, rotation: 0.31 },
  { key: 'vista-free-09', tier: 0, x: -36, z: 18, rotation: -0.24 },
  { key: 'vista-free-10', tier: 0, x: -29, z: 25, rotation: 0.15 },
  { key: 'vista-starter-01', tier: 1, x: -47, z: -9, rotation: -0.16 },
  { key: 'vista-starter-02', tier: 1, x: -39, z: 8, rotation: 0.2 },
  { key: 'vista-starter-03', tier: 1, x: -31, z: -10, rotation: -0.31 },
  { key: 'vista-starter-04', tier: 1, x: -24, z: 9, rotation: 0.18 },
  { key: 'vista-pro-01', tier: 2, x: -34, z: -2, rotation: 0.08 },
  { key: 'vista-pro-02', tier: 2, x: -25, z: -5, rotation: -0.18 },
  { key: 'vista-pro-03', tier: 2, x: -21, z: 6, rotation: 0.22 },
  { key: 'vista-business-01', tier: 3, x: -17, z: -1, rotation: -0.08 },
  { key: 'vista-founding-01', tier: 4, x: -12, z: 2, rotation: 0.14 },
] as const;

function createWindowCityBuildings(): LiveBuildingLayout[] {
  return WINDOW_BUILDING_SPECS.map((spec, rank) => {
    const visual = deriveHandoffBuildingVisual(spec.key, spec.tier);
    return {
      agentId: spec.key,
      ownerKey: spec.key,
      ownerUsername: null,
      agentIds: [spec.key],
      activeAgentIds: rank % 4 === 0 ? [spec.key] : [],
      agentCount: 1,
      activeAgentCount: rank % 4 === 0 ? 1 : 0,
      blockId: `window-${rank}`,
      gridX: rank,
      gridZ: 0,
      x: spec.x,
      z: spec.z,
      height: visual.height,
      rotation: spec.rotation,
      framework: rank % 5 === 0 ? 'hermes' : 'openclaw',
      status: rank % 4 === 0 ? 'running' : 'sleeping',
      tier: spec.tier,
      tierKey: visual.tierKey,
      visual,
      mine: false,
      rank,
    };
  });
}

function WindowCity({ accent }: { accent: string }) {
  void accent;
  const timeMode = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 21 ? 'day' : 'night';
  }, []);
  const buildings = useMemo(() => createWindowCityBuildings(), []);
  const trees = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => {
        return {
          x: -6.5 - ((i * 17) % 26),
          z: -12 + ((i * 13) % 25),
          scale: 0.35 + ((i * 5) % 5) * 0.08,
        };
      }),
    [],
  );
  return (
    <group position={[-ROOM_HALF - 5.8, 0, 0]}>
      <WindowSkyDome timeMode={timeMode} />
      <WindowSkyline timeMode={timeMode} />
      <WindowTerrain timeMode={timeMode} />
      <group position={[-12, 0.02, 0]} scale={[0.19, 0.19, 0.19]}>
        <LiveBuildings buildings={buildings} timeMode={timeMode} />
      </group>
      {trees.map((tree, i) => (
        <Tree key={i} position={[tree.x, 0, tree.z]} scale={tree.scale} />
      ))}
    </group>
  );
}

function SofaAndTable() {
  return (
    <group>
      <group position={[-5.45, 0, -2.65]} rotation={[0, Math.PI / 7, 0]}>
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
      <group position={[-4.82, 0, -0.75]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow material={WOOD}>
          <boxGeometry args={[1.25, 0.07, 0.72]} />
        </mesh>
        {[-0.52, 0.52].flatMap((x) =>
          [-0.3, 0.3].map((z) => (
            <mesh
              key={`${x}-${z}`}
              position={[x, 0.22, z]}
              castShadow
              receiveShadow
              material={WOOD_DARK}
            >
              <boxGeometry args={[0.06, 0.42, 0.06]} />
            </mesh>
          )),
        )}
      </group>
      <mesh position={[-4.98, 0.47, -0.83]} castShadow receiveShadow>
        <boxGeometry args={[0.26, 0.035, 0.2]} />
        <meshLambertMaterial color="#e8c98a" />
      </mesh>
    </group>
  );
}

function CentralPedestal({ stationId, layout, accent, isNear, onStationClick }: StationProps) {
  void accent;
  void isNear;
  return (
    <group position={layout[stationId].position}>
      <ClickHotspot
        stationId={stationId}
        layout={layout}
        onStationClick={onStationClick}
        radius={1.2}
        height={2.5}
      />
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
  status,
  logLines,
  isNear,
  onStationClick,
}: StationProps & {
  status: string;
  logLines: string[];
}) {
  const indicatorColor =
    status === 'error' || status === 'crashed'
      ? '#fb7185'
      : ['active', 'running', 'restarting'].includes(status)
        ? '#68ff8a'
        : '#ffd166';
  return (
    <group position={[0, 0, 0]}>
      <group position={[0, 2.18, -ROOM_HALF + 0.15]}>
        <mesh castShadow receiveShadow material={BLACK}>
          <boxGeometry args={[4.35, 2.1, 0.12]} />
        </mesh>
        <mesh position={[0, 0, 0.065]}>
          <boxGeometry args={[4.08, 1.88, 0.04]} />
          <meshBasicMaterial color="#05070c" />
        </mesh>
        <TvLogScreen lines={logLines} accent={accent} />
      </group>
      <mesh position={[0, 0.29, -ROOM_HALF + 0.45]} castShadow receiveShadow material={WOOD}>
        <boxGeometry args={[4.8, 0.58, 0.68]} />
      </mesh>
      <group position={[0, 1.02, -ROOM_HALF + 0.14]}>
        <mesh>
          <sphereGeometry args={[0.12, 18, 12]} />
          <meshBasicMaterial color={indicatorColor} toneMapped={false} />
        </mesh>
        <pointLight color={indicatorColor} intensity={0.28} distance={2.1} />
      </group>
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot
        stationId={stationId}
        layout={layout}
        onStationClick={onStationClick}
        radius={1.55}
        height={2.6}
      />
    </group>
  );
}

function DeskStation({ stationId, layout, accent, isNear, onStationClick }: StationProps) {
  return (
    <group>
      <group position={[3.2, 0, ROOM_HALF - 0.82]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.84, 0]} castShadow receiveShadow material={WOOD}>
          <boxGeometry args={[2.65, 0.08, 1.12]} />
        </mesh>
        {[-1.18, 1.18].flatMap((x) =>
          [-0.46, 0.46].map((z) => (
            <mesh
              key={`${x}-${z}`}
              position={[x, 0.42, z]}
              castShadow
              receiveShadow
              material={WOOD_DARK}
            >
              <boxGeometry args={[0.07, 0.84, 0.07]} />
            </mesh>
          )),
        )}
        <group position={[0, 0.9, 0.03]}>
          <mesh material={METAL}>
            <boxGeometry args={[0.8, 0.035, 0.54]} />
          </mesh>
          <group position={[0, 0.24, -0.27]} rotation={[-0.34, 0, 0]}>
            <mesh material={METAL}>
              <boxGeometry args={[0.8, 0.48, 0.03]} />
            </mesh>
            <mesh position={[0, 0, 0.021]}>
              <planeGeometry args={[0.68, 0.38]} />
              <meshBasicMaterial color="#06111f" toneMapped={false} />
            </mesh>
          </group>
          <group position={[0, 0.24, -0.247]} rotation={[-0.34, 0, 0]}>
            <LaptopScreen accent={accent} />
          </group>
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
        <mesh position={[0, 0.88, -0.29]} castShadow receiveShadow material={FABRIC}>
          <boxGeometry args={[0.62, 0.72, 0.08]} />
        </mesh>
        <mesh position={[0, 0.26, 0]} castShadow receiveShadow material={METAL}>
          <cylinderGeometry args={[0.045, 0.045, 0.5, 10]} />
        </mesh>
      </group>
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot
        stationId={stationId}
        layout={layout}
        onStationClick={onStationClick}
        radius={1.45}
        height={2.2}
      />
    </group>
  );
}

function CorkboardStation({
  stationId,
  layout,
  framework,
  accent,
  connectedIntegrations,
  isNear,
  onStationClick,
}: StationProps & {
  framework: string;
  connectedIntegrations: Set<string>;
}) {
  const integrations = integrationCatalog(framework);
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
        {integrations.map((integration, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const connected = integration.aliases.some((alias) =>
            connectedIntegrations.has(alias.toLowerCase()),
          );
          const color = connected ? accent : '#6b5f46';
          return (
            <group
              key={integration.id}
              position={[-1.48 + col * 0.98, 0.62 - row * 0.72, 0.085]}
              rotation={[0, 0, (((i * 17) % 7) - 3) * 0.01]}
            >
              <mesh>
                <boxGeometry args={[0.82, 0.52, 0.035]} />
                <meshLambertMaterial
                  color={connected ? '#f1ead7' : '#6d6655'}
                  emissive={connected ? color : '#000'}
                  emissiveIntensity={connected ? 0.12 : 0}
                />
              </mesh>
              <mesh position={[-0.27, 0.08, 0.03]}>
                <circleGeometry args={[0.12, 18]} />
                <meshBasicMaterial color={color} toneMapped={false} />
              </mesh>
              <group position={[0.12, 0.08, 0.057]}>
                <FlatBoardLabel
                  text={integration.label}
                  color={connected ? '#111827' : '#c8bea4'}
                />
              </group>
            </group>
          );
        })}
      </group>
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot
        stationId={stationId}
        layout={layout}
        onStationClick={onStationClick}
        radius={1.65}
        height={2.5}
      />
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
  const memoryFiles = ['soul.md', 'memory.md', 'goals.md', 'style.md', 'tools.md', 'sessions.md'];
  return (
    <group>
      <group position={[ROOM_HALF - 0.3, 0, 0]}>
        <mesh position={[0.02, 1.9, 0]} material={WOOD}>
          <boxGeometry args={[0.42, 3.35, 7.45]} />
        </mesh>
        <mesh position={[-0.22, 0.22, 0]} material={WOOD}>
          <boxGeometry args={[0.74, 0.12, 7.64]} />
        </mesh>
        <mesh position={[-0.22, 3.64, 0]} material={WOOD}>
          <boxGeometry args={[0.74, 0.12, 7.64]} />
        </mesh>
        {[-3.86, 3.86].map((z) => (
          <mesh key={z} position={[-0.22, 1.92, z]} material={WOOD}>
            <boxGeometry args={[0.74, 3.42, 0.12]} />
          </mesh>
        ))}
        {[0.88, 1.58, 2.28, 2.98].map((y) => (
          <mesh key={y} position={[-0.22, y, 0]} material={WOOD}>
            <boxGeometry args={[0.72, 0.06, 7.35]} />
          </mesh>
        ))}
        {Array.from({ length: 96 }, (_, i) => {
          const row = Math.floor(i / 24);
          const col = i % 24;
          const z = -3.45 + col * 0.29;
          const baseY = 0.9 + row * 0.7;
          const h = 0.3 + ((i * 13) % 9) * 0.035;
          const width = 0.07 + (i % 4) * 0.018;
          const memory = canEdit && hasMemory && i % 7 === 0;
          return (
            <mesh
              key={i}
              position={[-0.58, baseY + h / 2, z]}
              rotation={[0, 0, ((i % 5) - 2) * 0.012]}
            >
              <boxGeometry args={[0.16, h, width]} />
              <meshLambertMaterial
                color={memory ? '#c89a55' : bookColors[i % bookColors.length]}
                emissive={memory ? accent : '#000'}
                emissiveIntensity={memory ? 0.22 : 0}
              />
            </mesh>
          );
        })}
        {canEdit &&
          hasMemory &&
          memoryFiles.map((name, i) => {
            const shelf = Math.floor(i / 3);
            const slot = i % 3;
            return (
              <group
                key={name}
                position={[-0.69, 1.16 + shelf * 0.72, -2.25 + slot * 2.25]}
                rotation={[0, -Math.PI / 2, 0]}
              >
                <mesh position={[0, -0.01, -0.006]}>
                  <planeGeometry args={[0.5, 0.14]} />
                  <meshBasicMaterial
                    color="#2b1b10"
                    transparent
                    opacity={0.72}
                    toneMapped={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <FlatBoardLabel text={name} color="#f8ead0" width={0.44} height={0.095} />
              </group>
            );
          })}
        <SmallShelfPlant position={[-0.58, 1.02, 3.23]} />
      </group>
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot
        stationId={stationId}
        layout={layout}
        onStationClick={onStationClick}
        radius={1.6}
        height={2.9}
      />
    </group>
  );
}

function ExitDoor({ stationId, layout, accent, isNear, onStationClick }: StationProps) {
  return (
    <group>
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
        <mesh position={[0, 2.42, -0.08]} material={WOOD_DARK}>
          <boxGeometry args={[0.86, 0.24, 0.035]} />
        </mesh>
        <group position={[0, 2.42, -0.105]}>
          <FlatBoardLabel text="BUILDING" color="#f6ead8" width={0.72} height={0.13} />
        </group>
      </group>
      <StationNearGlow position={layout[stationId].position} color={accent} active={isNear} />
      <ClickHotspot
        stationId={stationId}
        layout={layout}
        onStationClick={onStationClick}
        radius={1.2}
        height={2.4}
      />
    </group>
  );
}

function RoomPlants() {
  return (
    <group>
      <Plant position={[ROOM_HALF - 1.05, 0, -ROOM_HALF + 1.0]} scale={1.08} />
      <Plant position={[-ROOM_HALF + 0.92, 0, ROOM_HALF - 1.05]} scale={0.82} />
      <Plant position={[5.45, 0, -5.55]} scale={0.66} />
      <Plant position={[-5.9, 0, 1.45]} scale={0.52} />
      <FlowerPot position={[-6.15, 0, -4.7]} scale={0.56} color="#f59e0b" />
    </group>
  );
}

function SmallShelfPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={0.34}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.32, 12]} />
        <meshLambertMaterial color="#6b3f2b" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[0, 0.46, 0]}
            scale={[0.7, 1.4, 0.46]}
            rotation={[0.28, a, 0.48]}
          >
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshLambertMaterial color={i % 2 ? '#2f7d4a' : '#1f6b41'} />
          </mesh>
        );
      })}
    </group>
  );
}

function FlowerPot({
  position,
  scale = 1,
  color,
}: {
  position: [number, number, number];
  scale?: number;
  color: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.24, 0.36, 12]} />
        <meshLambertMaterial color="#6b3f2b" />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.16, 0.52, Math.sin(a) * 0.16]}>
            <mesh>
              <sphereGeometry args={[0.08, 8, 6]} />
              <meshLambertMaterial color={color} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.44, 0]}>
        <sphereGeometry args={[0.17, 8, 6]} />
        <meshLambertMaterial color="#1f6b41" />
      </mesh>
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.68, 8]} />
        <meshLambertMaterial color="#5b3a22" />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <coneGeometry args={[0.36, 0.78, 9]} />
        <meshLambertMaterial color="#1f6b41" />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[0.28, 0.62, 9]} />
        <meshLambertMaterial color="#2f7d4a" />
      </mesh>
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
    <Html position={position} rotation={rotation} transform distanceFactor={7} zIndexRange={[8, 0]}>
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
  void position;
  void color;
  void active;
  return null;
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
      <meshBasicMaterial
        transparent
        opacity={0}
        colorWrite={false}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
