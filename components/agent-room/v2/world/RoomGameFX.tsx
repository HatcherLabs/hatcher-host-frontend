'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { paletteFor } from '../colors';
import type { Quality } from '../quality';
import { ROOM_HALF, ROOM_HEIGHT } from './grid';
import { STATION_IDS, type Station, type StationId, type StationLayout } from './layout';

interface Props {
  framework: string;
  layout: StationLayout;
  nearest: StationId | null;
  quality: Quality;
}

export function RoomGameFX({ framework, layout, nearest, quality }: Props) {
  const palette = paletteFor(framework);
  const coreColor = framework === 'openclaw' ? '#39ff88' : palette.primary;
  const coreAccent = framework === 'openclaw' ? '#38bdf8' : palette.accent;
  const stations = useMemo(
    () => STATION_IDS.filter((id) => id !== 'agentAvatar').map((id) => layout[id]),
    [layout],
  );
  const stationColors = useMemo(() => {
    const cockpit = [coreColor, '#38bdf8', '#facc15', '#22d3ee', coreAccent];
    return new Map(STATION_IDS.map((id, index) => [id, cockpit[index % cockpit.length]!] as const));
  }, [coreAccent, coreColor]);
  const focus = nearest ? layout[nearest] : null;

  return (
    <group>
      <CockpitDeck color={coreColor} accent={coreAccent} />
      {STATION_IDS.map((id) => (
        <StationPlatform
          key={`platform-${id}`}
          station={layout[id]}
          color={stationColors.get(id) ?? palette.primary}
          central={id === 'agentAvatar'}
          active={id === nearest}
        />
      ))}
      {stations.map((station, i) => (
        <StationHologram
          key={`holo-${station.id}`}
          station={station}
          color={stationColors.get(station.id) ?? palette.primary}
          glyph={i}
          active={station.id === nearest}
        />
      ))}
      {stations.map((station, i) => (
        <FloorConduit
          key={station.id}
          from={layout.agentAvatar}
          to={station}
          color={stationColors.get(station.id) ?? palette.primary}
          phase={i / Math.max(1, stations.length)}
          moving={quality !== 'low'}
        />
      ))}
      {STATION_IDS.map((id) => (
        <StationPadTick
          key={id}
          station={layout[id]}
          color={coreColor}
          active={id === nearest}
        />
      ))}
      {focus && <StationFocus station={focus} color={coreAccent} />}
      {quality === 'high' && <AmbientRoomSweep color={coreColor} />}
    </group>
  );
}

function CockpitDeck({ color, accent }: { color: string; accent: string }) {
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ring.current) return;
    ring.current.rotation.z = clock.getElapsedTime() * 0.08;
  });

  return (
    <group>
      <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.2, 8]} />
        <meshStandardMaterial
          color={0x10141c}
          metalness={0.86}
          roughness={0.28}
          emissive={color}
          emissiveIntensity={0.055}
        />
      </mesh>
      <mesh ref={ring} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.38, 2.5, 72]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 2.85, 0.145, Math.sin(a) * 2.85]}
            rotation={[0, -a, 0]}
          >
            <boxGeometry args={[0.52, 0.045, 0.055]} />
            <meshBasicMaterial color={i % 2 ? accent : color} toneMapped={false} transparent opacity={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

function StationPlatform({
  station,
  color,
  central,
  active,
}: {
  station: Station;
  color: string;
  central: boolean;
  active: boolean;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.MeshBasicMaterial>(null);
  const radius = central ? 2.1 : 1.45;
  const height = central ? 0.22 : 0.18;
  const lowerRadius = radius * (central ? 1.24 : 1.18);
  const upperRadius = radius * (central ? 0.92 : 0.84);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring.current) ring.current.rotation.z = t * (active ? 0.5 : 0.12);
    if (pulse.current) pulse.current.opacity = active ? 0.62 + Math.sin(t * 4.8) * 0.18 : 0.28;
  });

  return (
    <group position={[station.position[0], 0, station.position[2]]}>
      <mesh position={[0, 0.055, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[lowerRadius, lowerRadius * 1.06, 0.11, 8]} />
        <meshStandardMaterial
          color={0x070a0f}
          metalness={0.9}
          roughness={0.34}
          emissive={color}
          emissiveIntensity={active ? 0.08 : 0.025}
        />
      </mesh>
      <mesh position={[0, height * 0.58 + 0.06, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[radius, radius * 1.08, height, 8]} />
        <meshStandardMaterial
          color={0x10141d}
          metalness={0.86}
          roughness={0.36}
          emissive={color}
          emissiveIntensity={active ? 0.12 : 0.045}
        />
      </mesh>
      <mesh position={[0, height + 0.17, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[upperRadius, upperRadius * 1.04, 0.1, 8]} />
        <meshStandardMaterial
          color={0x151a23}
          metalness={0.78}
          roughness={0.42}
          emissive={color}
          emissiveIntensity={active ? 0.1 : 0.034}
        />
      </mesh>
      <mesh ref={ring} position={[0, height + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.78, radius * 0.92, 8]} />
        <meshBasicMaterial
          ref={pulse}
          color={color}
          toneMapped={false}
          transparent
          opacity={active ? 0.6 : 0.28}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, height + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 1.02, radius * 1.08, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.44} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = lowerRadius * 0.96;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, height + 0.1, Math.sin(a) * r]}
            rotation={[0, -a, 0]}
          >
            <boxGeometry args={[central ? 0.52 : 0.38, 0.045, 0.055]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? '#facc15' : color}
              toneMapped={false}
              transparent
              opacity={active ? 0.72 : 0.46}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function makeRoundedPanelGeometry(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return new THREE.ShapeGeometry(shape, 32);
}

function Link2D({
  a,
  b,
  color,
}: {
  a: [number, number];
  b: [number, number];
  color: string;
}) {
  const meta = useMemo(() => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return {
      x: (a[0] + b[0]) / 2,
      y: (a[1] + b[1]) / 2,
      length: Math.sqrt(dx * dx + dy * dy),
      rotation: Math.atan2(dy, dx),
    };
  }, [a, b]);

  return (
    <mesh position={[meta.x, meta.y, 0.025]} rotation={[0, 0, meta.rotation]}>
      <boxGeometry args={[meta.length, 0.018, 0.018]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.58} depthWrite={false} />
    </mesh>
  );
}

function GlyphBars({ color }: { color: string }) {
  return (
    <group>
      {[-0.42, -0.18, 0.06, 0.3, 0.54].map((x, i) => (
        <mesh key={x} position={[x, -0.04 + i * 0.035, 0.03]}>
          <boxGeometry args={[0.11, 0.28 + i * 0.12, 0.018]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.66} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function GlyphNetwork({ color }: { color: string }) {
  const points: Array<[number, number]> = [
    [-0.44, -0.18],
    [-0.2, 0.18],
    [0.1, -0.02],
    [0.34, 0.28],
    [0.52, -0.16],
  ];
  return (
    <group>
      {points.slice(0, -1).map((point, i) => (
        <Link2D key={i} a={point} b={points[i + 1]!} color={color} />
      ))}
      <Link2D a={points[0]!} b={points[2]!} color={color} />
      {points.map((point) => (
        <mesh key={`${point[0]}-${point[1]}`} position={[point[0], point[1], 0.04]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.82} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function GlyphHexes({ color }: { color: string }) {
  return (
    <group>
      {[
        [-0.32, 0.18],
        [0.02, 0.24],
        [0.34, 0.1],
        [-0.12, -0.18],
        [0.24, -0.24],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.03]} rotation={[0, 0, i * 0.18]}>
          <circleGeometry args={[0.15, 6]} />
          <meshBasicMaterial
            color={color}
            wireframe
            toneMapped={false}
            transparent
            opacity={0.82}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function GlyphRadar({ color }: { color: string }) {
  const sweep = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (sweep.current) sweep.current.rotation.z = clock.getElapsedTime() * 1.6;
  });

  return (
    <group>
      {[0.22, 0.38, 0.54].map((radius) => (
        <mesh key={radius} position={[0, 0, 0.03]}>
          <ringGeometry args={[radius - 0.008, radius + 0.008, 48]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.48} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={sweep} position={[0, 0, 0.04]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.54, 0.018, 0.018]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GlyphWave({ color }: { color: string }) {
  return (
    <group>
      {[-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42].map((x, i) => (
        <mesh key={x} position={[x, Math.sin(i * 0.85) * 0.16, 0.03]} rotation={[0, 0, Math.sin(i) * 0.32]}>
          <boxGeometry args={[0.16, 0.025, 0.018]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.7} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function HoloGlyph({ glyph, color }: { glyph: number; color: string }) {
  const kind = glyph % 5;
  if (kind === 0) return <GlyphNetwork color={color} />;
  if (kind === 1) return <GlyphHexes color={color} />;
  if (kind === 2) return <GlyphRadar color={color} />;
  if (kind === 3) return <GlyphBars color={color} />;
  return <GlyphWave color={color} />;
}

function StationHologram({
  station,
  color,
  glyph,
  active,
}: {
  station: Station;
  color: string;
  glyph: number;
  active: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const glass = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useMemo(() => makeRoundedPanelGeometry(1.3, 0.96, 0.14), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.position.y = 1.16 + Math.sin(t * 1.4 + glyph) * 0.028;
      group.current.rotation.y = Math.sin(t * 0.65 + glyph) * 0.035;
    }
    if (glass.current) glass.current.opacity = active ? 0.2 + Math.sin(t * 4) * 0.025 : 0.12;
  });

  return (
    <group position={[station.position[0], 0, station.position[2]]} rotation={[0, station.rotationY, 0]}>
      <group ref={group} position={[0, 1.16, 0.92]}>
        <mesh geometry={geometry}>
          <meshBasicMaterial
            ref={glass}
            color={color}
            transparent
            opacity={active ? 0.2 : 0.12}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
        <lineSegments geometry={edges} position={[0, 0, 0.015]}>
          <lineBasicMaterial color={color} transparent opacity={0.76} toneMapped={false} />
        </lineSegments>
        <group position={[0, -0.02, 0.02]} scale={0.82}>
          <HoloGlyph glyph={glyph} color={color} />
        </group>
        {[-0.68, 0.68].map((x) => (
          <mesh key={x} position={[x * 0.72, -0.58, 0.035]}>
            <boxGeometry args={[0.24, 0.03, 0.03]} />
            <meshBasicMaterial color={color} transparent opacity={0.62} toneMapped={false} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function FloorConduit({
  from,
  to,
  color,
  phase,
  moving,
}: {
  from: Station;
  to: Station;
  color: string;
  phase: number;
  moving: boolean;
}) {
  const packetRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const meta = useMemo(() => {
    const ax = from.position[0];
    const az = from.position[2];
    const bx = to.position[0];
    const bz = to.position[2];
    const dx = bx - ax;
    const dz = bz - az;
    return {
      ax,
      az,
      bx,
      bz,
      length: Math.sqrt(dx * dx + dz * dz),
      mid: [(ax + bx) / 2, (az + bz) / 2] as const,
      rotationY: Math.atan2(dx, dz),
    };
  }, [from, to]);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = moving ? 0.16 + Math.sin(clock.getElapsedTime() * 1.8 + phase * 6) * 0.04 : 0.1;
    }
    if (!moving || !packetRef.current) return;
    const t = (clock.getElapsedTime() * 0.24 + phase) % 1;
    const x = THREE.MathUtils.lerp(meta.ax, meta.bx, t);
    const z = THREE.MathUtils.lerp(meta.az, meta.bz, t);
    packetRef.current.position.set(x, 0.17 + Math.sin(t * Math.PI) * 0.05, z);
  });

  return (
    <group>
      <mesh position={[meta.mid[0], 0.072, meta.mid[1]]} rotation={[0, meta.rotationY, 0]}>
        <boxGeometry args={[0.42, 0.055, meta.length]} />
        <meshStandardMaterial
          color={0x0b1017}
          metalness={0.82}
          roughness={0.34}
          emissive={color}
          emissiveIntensity={0.028}
        />
      </mesh>
      <mesh position={[meta.mid[0], 0.055, meta.mid[1]]} rotation={[0, meta.rotationY, 0]}>
        <boxGeometry args={[0.07, 0.018, meta.length]} />
        <meshBasicMaterial
          ref={matRef}
          color={color}
          transparent
          opacity={0.16}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[meta.mid[0] + side * Math.cos(meta.rotationY) * 0.19, 0.108, meta.mid[1] - side * Math.sin(meta.rotationY) * 0.19]} rotation={[0, meta.rotationY, 0]}>
          <boxGeometry args={[0.035, 0.025, meta.length * 0.92]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
      {moving && (
        <mesh ref={packetRef} position={[meta.ax, 0.18, meta.az]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.82} />
        </mesh>
      )}
    </group>
  );
}

function StationPadTick({ station, color, active }: { station: Station; color: string; active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = station.rotationY + t * (active ? 1.4 : 0.18);
    if (mat.current) {
      const target = active ? 0.72 + Math.sin(t * 5) * 0.16 : 0.22;
      mat.current.opacity += (target - mat.current.opacity) * 0.12;
    }
  });

  return (
    <group ref={group} position={[station.position[0], 0.11, station.position[2]]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0, 0.72 + i * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5 - i * 0.08, 0.055]} />
          <meshBasicMaterial
            ref={i === 0 ? mat : undefined}
            color={color}
            transparent
            opacity={active ? 0.65 : 0.2}
            toneMapped={false}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function StationFocus({ station, color }: { station: Station; color: string }) {
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beam.current) beam.current.opacity = 0.12 + Math.sin(t * 4.2) * 0.045;
    if (ring.current) {
      const s = 1 + (Math.sin(t * 4) + 1) * 0.08;
      ring.current.scale.set(s, 1, s);
      ring.current.rotation.y = t * 0.9;
    }
  });

  return (
    <group position={[station.position[0], 0, station.position[2]]}>
      <mesh position={[0, ROOM_HEIGHT * 0.36, 0]}>
        <cylinderGeometry args={[0.2, 1.1, ROOM_HEIGHT * 0.72, 32, 1, true]} />
        <meshBasicMaterial
          ref={beam}
          color={color}
          transparent
          opacity={0.13}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring} position={[0, 2.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.02, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.72} toneMapped={false} />
      </mesh>
    </group>
  );
}

function AmbientRoomSweep({ color }: { color: string }) {
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (left.current) {
      left.current.position.x = Math.sin(t * 0.55) * ROOM_HALF * 0.72;
      left.current.rotation.y = Math.PI / 2 + Math.sin(t * 0.3) * 0.12;
    }
    if (right.current) {
      right.current.position.z = Math.cos(t * 0.48) * ROOM_HALF * 0.72;
      right.current.rotation.y = Math.sin(t * 0.26) * 0.12;
    }
  });

  return (
    <group>
      <mesh ref={left} position={[0, 0.09, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.035, 0.012, ROOM_HALF * 1.65]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh ref={right} position={[0, 0.1, 0]}>
        <boxGeometry args={[0.035, 0.012, ROOM_HALF * 1.65]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}
