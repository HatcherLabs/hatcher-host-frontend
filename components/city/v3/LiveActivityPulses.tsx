'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FRAMEWORK_COLORS } from '@/components/city/types';
import type { LiveBuildingLayout } from './liveLayout';

interface Props {
  buildings: LiveBuildingLayout[];
  pulseAts: Map<string, number>;
}

export function LiveActivityPulses({ buildings, pulseAts }: Props) {
  const byId = useMemo(
    () => new Map(buildings.map((building) => [building.agentId, building])),
    [buildings],
  );
  const pulses = useMemo(
    () =>
      [...pulseAts.entries()].flatMap(([agentId, bornAt]) => {
        const building = byId.get(agentId);
        if (!building) return [];
        return [{ agentId, bornAt, building }];
      }),
    [pulseAts, byId],
  );

  return (
    <group>
      {pulses.map((pulse) => (
        <LiveActivityPulse key={`${pulse.agentId}-${pulse.bornAt}`} {...pulse} />
      ))}
    </group>
  );
}

function LiveActivityPulse({
  bornAt,
  building,
}: {
  bornAt: number;
  building: LiveBuildingLayout;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const color = building.mine ? 0xffd24a : FRAMEWORK_COLORS[building.framework];

  useFrame(() => {
    if (!ref.current) return;
    const age = Math.min(1, (performance.now() - bornAt) / 1800);
    const scale = 1 + age * 8;
    ref.current.scale.set(scale, scale, scale);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.74 * (1 - age));
  });

  useEffect(() => {
    return () => {
      const mat = ref.current?.material;
      if (mat && !Array.isArray(mat)) mat.dispose();
    };
  }, []);

  return (
    <mesh ref={ref} position={[building.x, 0.12, building.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.1, 1.35, 48]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.74}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
