'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CityAgent, Framework } from '@/components/city/types';
import { FRAMEWORK_COLORS } from '@/components/city/types';
import { CATEGORIES } from '@/components/city/types';
import { useQuality } from '../quality/QualityContext';

// Must match Buildings.layout / Streets / DistrictPads / Traffic
const DISTRICT_COLS = 5;
const DISTRICT_SIZE = 52;
const DISTRICT_GAP = 14;
const NPC_Y = 0.25;
const WANDER_RADIUS = 18; // how far a NPC roams from its district centre

interface Props {
  agents: CityAgent[];
  onNpcClick?: (agentId: string) => void;
}

interface NpcState {
  agentId: string;
  framework: Framework;
  cx: number; // district centre x
  cz: number; // district centre z
  phase: number; // offset so NPCs in the same district don't move in lockstep
  speed: number;
  radius: number;
  bob: number; // vertical bob amplitude
}

function districtPosition(idx: number): { x: number; z: number } {
  const col = idx % DISTRICT_COLS;
  const row = Math.floor(idx / DISTRICT_COLS);
  const totalRows = Math.ceil(CATEGORIES.length / DISTRICT_COLS);
  const step = DISTRICT_SIZE + DISTRICT_GAP;
  return {
    x: (col - (DISTRICT_COLS - 1) / 2) * step,
    z: (row - (totalRows - 1) / 2) * step,
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

/**
 * Wandering NPCs — small emissive capsules that imply activity in
 * each district. Sampled deterministically from the agent list
 * (stable across refreshes) and coloured by framework so district
 * ownership is legible at a glance.
 *
 * Movement is purely decorative (Lissajous oscillator around the
 * district centre); no physics, no collision. One InstancedMesh per
 * framework — 4 draw calls for up to 100 NPCs.
 */
export function NPCs({ agents, onNpcClick }: Props) {
  const quality = useQuality();
  const max = quality === 'high' ? 100 : 30;

  const states = useMemo<NpcState[]>(() => {
    if (!agents.length) return [];
    // Stable sample: sort by hash(id) then take top `max`. Changes only
    // when the agent set changes.
    const scored = agents.map((a) => ({ a, score: hashStr(a.id + ':npc') }));
    scored.sort((x, y) => x.score - y.score);
    const chosen = scored.slice(0, max).map((s) => s.a);

    return chosen
      .map((a) => {
        const idx = CATEGORIES.indexOf(a.category);
        if (idx < 0) return null;
        const pos = districtPosition(idx);
        return {
          agentId: a.id,
          framework: a.framework,
          cx: pos.x,
          cz: pos.z,
          phase: hashStr(a.id + ':phase') * Math.PI * 2,
          speed: 0.25 + hashStr(a.id + ':s') * 0.35,
          radius: 6 + hashStr(a.id + ':r') * (WANDER_RADIUS - 6),
          bob: 0.1 + hashStr(a.id + ':b') * 0.25,
        };
      })
      .filter((n): n is NpcState => n !== null);
  }, [agents, max]);

  // Bucket by framework so we can use 4 InstancedMeshes with
  // framework-colored emissive instead of one 100-count mesh + per-
  // instance colour (the meshStandardMaterial shader expense is higher
  // with instanceColor than with plain emissive).
  const buckets = useMemo(() => {
    const m: Record<Framework, NpcState[]> = {
      openclaw: [],
      hermes: [],
      elizaos: [],
      milady: [],
    };
    for (const s of states) m[s.framework].push(s);
    return m;
  }, [states]);

  return (
    <group>
      {(Object.keys(buckets) as Framework[]).map((fw) => (
        <NpcBucket
          key={fw}
          framework={fw}
          states={buckets[fw]}
          onNpcClick={onNpcClick}
        />
      ))}
    </group>
  );
}

function NpcBucket({
  framework,
  states,
  onNpcClick,
}: {
  framework: Framework;
  states: NpcState[];
  onNpcClick?: (agentId: string) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: FRAMEWORK_COLORS[framework],
        emissive: FRAMEWORK_COLORS[framework],
        emissiveIntensity: 1.4,
        roughness: 0.4,
        metalness: 0.3,
      }),
    [framework],
  );

  useFrame(({ clock }) => {
    if (!ref.current || states.length === 0) return;
    const t = clock.getElapsedTime();
    const obj = new THREE.Object3D();
    states.forEach((s, i) => {
      // Lissajous — two different frequencies on x and z give natural
      // non-repeating paths within the district.
      const a = s.phase + t * s.speed;
      const x = s.cx + Math.cos(a) * s.radius;
      const z = s.cz + Math.sin(a * 1.37) * s.radius;
      const y = NPC_Y + Math.sin(a * 3) * s.bob;
      obj.position.set(x, y, z);
      obj.rotation.set(0, a * 0.5, 0);
      obj.scale.set(1, 1, 1);
      obj.updateMatrix();
      ref.current!.setMatrixAt(i, obj.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  if (states.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, states.length]}
      onClick={(e) => {
        if (!onNpcClick) return;
        const id = e.instanceId;
        if (id == null) return;
        const s = states[id];
        if (!s) return;
        e.stopPropagation();
        onNpcClick(s.agentId);
      }}
    >
      <capsuleGeometry args={[0.35, 0.9, 4, 8]} />
      <primitive attach="material" object={material} />
    </instancedMesh>
  );
}
