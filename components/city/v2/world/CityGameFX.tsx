'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CityAgent } from '@/components/city/types';
import { CATEGORIES, FRAMEWORK_COLORS } from '@/components/city/types';
import { useQuality } from '../quality/QualityContext';
import { WORLD_HALF, districtPosition } from './grid';

interface Props {
  agents: CityAgent[];
}

export function CityGameFX({ agents }: Props) {
  const quality = useQuality();
  const districts = useMemo(() => buildDistricts(agents), [agents]);
  const skyLaneCount = quality === 'high' ? 18 : 0;

  return (
    <group>
      {districts.map((district) => (
        <DistrictBeacon key={district.category} {...district} />
      ))}
      {skyLaneCount > 0 && <SkyLanes count={skyLaneCount} />}
      {quality === 'high' && <CityScan color={0x7dd3fc} />}
    </group>
  );
}

function buildDistricts(agents: CityAgent[]) {
  const counts = new Map<(typeof CATEGORIES)[number], CityAgent[]>();
  agents.forEach((agent) => {
    const list = counts.get(agent.category) ?? [];
    list.push(agent);
    counts.set(agent.category, list);
  });

  return CATEGORIES.map((category, idx) => {
    const pos = districtPosition(idx);
    const list = counts.get(category) ?? [];
    const frameworkCounts = new Map<CityAgent['framework'], number>();
    list.forEach((agent) => {
      frameworkCounts.set(agent.framework, (frameworkCounts.get(agent.framework) ?? 0) + 1);
    });
    let dominant: CityAgent['framework'] | null = null;
    let dominantCount = 0;
    frameworkCounts.forEach((count, framework) => {
      if (count > dominantCount) {
        dominant = framework;
        dominantCount = count;
      }
    });

    return {
      category,
      x: pos.x,
      z: pos.z,
      count: list.length,
      running: list.filter((agent) => agent.status === 'running').length,
      color: dominant ? FRAMEWORK_COLORS[dominant] : 0x38bdf8,
    };
  });
}

function DistrictBeacon({
  x,
  z,
  count,
  running,
  color,
}: {
  x: number;
  z: number;
  count: number;
  running: number;
  color: number;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const orb = useRef<THREE.Mesh>(null);
  const intensity = Math.min(1, count / 24);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring.current) {
      const s = 1 + intensity * 0.28 + Math.sin(t * 2.2 + x * 0.02) * 0.04;
      ring.current.scale.set(s, s, 1);
      ring.current.rotation.z = t * (0.2 + intensity * 0.35);
    }
    if (beam.current) {
      const active = running > 0 ? 1 : 0.45;
      beam.current.opacity = (0.045 + intensity * 0.13) * active;
    }
    if (orb.current) {
      orb.current.position.y = 10 + intensity * 8 + Math.sin(t * 1.4 + z * 0.01) * 0.5;
    }
  });

  if (count === 0) return null;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 7 + intensity * 5, 0]}>
        <cylinderGeometry args={[1.2 + intensity * 1.8, 2.8 + intensity * 2.4, 14 + intensity * 10, 32, 1, true]} />
        <meshBasicMaterial
          ref={beam}
          color={color}
          transparent
          opacity={0.08}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.32, 0]}>
        <ringGeometry args={[8.4, 8.8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={orb} position={[0, 11, 0]}>
        <sphereGeometry args={[0.55 + intensity * 0.5, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.82} />
      </mesh>
    </group>
  );
}

function SkyLanes({ count }: { count: number }) {
  const packets = useRef<(THREE.Mesh | null)[]>([]);
  const lanes = useMemo(() => {
    const colors = [0x7dd3fc, 0xd855ff, 0xfacc15, 0x34d399];
    return Array.from({ length: count }, (_, i) => ({
      rx: WORLD_HALF * (0.32 + (i % 4) * 0.1),
      rz: WORLD_HALF * (0.24 + (i % 5) * 0.075),
      y: 28 + (i % 6) * 4,
      phase: (i / count) * Math.PI * 2,
      speed: 0.08 + (i % 5) * 0.018,
      color: colors[i % colors.length]!,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    lanes.forEach((lane, i) => {
      const packet = packets.current[i];
      if (!packet) return;
      const a = lane.phase + t * lane.speed;
      packet.position.set(Math.cos(a) * lane.rx, lane.y + Math.sin(a * 2.1) * 0.7, Math.sin(a) * lane.rz);
      packet.rotation.y = -a;
    });
  });

  return (
    <group>
      {lanes.map((lane, i) => (
        <group key={i}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, lane.y, 0]} scale={[1, lane.rz / lane.rx, 1]}>
            <torusGeometry args={[lane.rx, 0.025, 8, 144]} />
            <meshBasicMaterial color={lane.color} toneMapped={false} transparent opacity={0.1} depthWrite={false} />
          </mesh>
          <mesh
            ref={(mesh) => {
              packets.current[i] = mesh;
            }}
            position={[lane.rx, lane.y, 0]}
          >
            <boxGeometry args={[1.8, 0.16, 0.16]} />
            <meshBasicMaterial color={lane.color} toneMapped={false} transparent opacity={0.78} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CityScan({ color }: { color: number }) {
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = (clock.getElapsedTime() * 0.08) % 1;
    const s = 0.22 + t * 1.35;
    ring.current.scale.set(s, s, 1);
    const mat = ring.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.24 * (1 - t));
  });

  return (
    <mesh ref={ring} position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[WORLD_HALF * 0.42, WORLD_HALF * 0.43, 160]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.14} depthWrite={false} />
    </mesh>
  );
}
