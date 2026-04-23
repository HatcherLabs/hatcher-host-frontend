'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CityAgent } from '@/components/city/types';
import { FRAMEWORK_COLORS } from '@/components/city/types';
import { layoutBuildingsV2 } from './Buildings.layout';

interface Props {
  agents: CityAgent[];
  /** performance.now() timestamp for the agents that ticked up their
   *  messageCount since the last poll. Shared from CityClient. */
  pulseAts: Map<string, number>;
}

interface Pulse {
  x: number;
  z: number;
  color: THREE.Color;
  born: number; // performance.now()
}

// Ring lifetime (ms). After this long the ring has grown + faded and
// is culled from the pool.
const LIFETIME = 1800;
const MAX_RINGS = 40;

/**
 * Expanding ring when an agent's messageCount ticks up. Hooks into
 * CityClient's pulseAts map. Each ring grows from 1u → 8u over 1.8s
 * while its alpha fades to 0, then gets recycled.
 */
export function ActivityPulses({ agents, pulseAts }: Props) {
  // Snapshot the (x,z) of every agent so the pulse knows where its
  // building is without re-running the layout per frame. Rebuild
  // only when the agent list actually changes.
  const positions = useMemo(() => {
    const m = new Map<string, { x: number; z: number; framework: CityAgent['framework'] }>();
    const layouts = layoutBuildingsV2(agents);
    for (const l of layouts) {
      m.set(l.agentId, { x: l.x, z: l.z, framework: l.framework });
    }
    return m;
  }, [agents]);

  const pool = useRef<Pulse[]>([]);

  // Pull any new pulses out of the shared map each render. Pulses are
  // keyed by agentId + born timestamp; duplicate timestamps are
  // ignored (we already spawned that ring).
  const seen = useRef(new Map<string, number>());
  useMemo(() => {
    pulseAts.forEach((t, id) => {
      if (seen.current.get(id) === t) return;
      seen.current.set(id, t);
      const pos = positions.get(id);
      if (!pos) return;
      if (pool.current.length >= MAX_RINGS) pool.current.shift();
      pool.current.push({
        x: pos.x,
        z: pos.z,
        color: new THREE.Color(FRAMEWORK_COLORS[pos.framework]),
        born: t,
      });
    });
  }, [pulseAts, positions]);

  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const now = performance.now();
    pool.current = pool.current.filter((p) => now - p.born < LIFETIME);
    for (let i = 0; i < MAX_RINGS; i++) {
      const p = pool.current[i];
      const mesh = refs.current[i];
      if (!mesh) continue;
      if (!p) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const age = (now - p.born) / LIFETIME; // 0..1
      const scale = 1 + age * 14;
      mesh.position.set(p.x, 0.15, p.z);
      mesh.scale.set(scale, scale, 1);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(p.color);
      mat.opacity = Math.max(0, 0.75 * (1 - age));
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_RINGS }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.9, 1.1, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
