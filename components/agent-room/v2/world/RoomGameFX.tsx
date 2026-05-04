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
  const stations = useMemo(
    () => STATION_IDS.filter((id) => id !== 'agentAvatar').map((id) => layout[id]),
    [layout],
  );
  const focus = nearest ? layout[nearest] : null;

  return (
    <group>
      {stations.map((station, i) => (
        <FloorConduit
          key={station.id}
          from={layout.agentAvatar}
          to={station}
          color={palette.primary}
          phase={i / Math.max(1, stations.length)}
          moving={quality !== 'low'}
        />
      ))}
      {STATION_IDS.map((id) => (
        <StationPadTick
          key={id}
          station={layout[id]}
          color={palette.primary}
          active={id === nearest}
        />
      ))}
      {focus && <StationFocus station={focus} color={palette.accent} />}
      {quality === 'high' && <AmbientRoomSweep color={palette.primary} />}
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
      <mesh position={[meta.mid[0], 0.055, meta.mid[1]]} rotation={[0, meta.rotationY, 0]}>
        <boxGeometry args={[0.055, 0.018, meta.length]} />
        <meshBasicMaterial
          ref={matRef}
          color={color}
          transparent
          opacity={0.12}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
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
