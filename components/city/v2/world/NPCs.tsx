'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CityAgent, Framework } from '@/components/city/types';
import { FRAMEWORK_COLORS } from '@/components/city/types';
import { CATEGORIES } from '@/components/city/types';
import { useQuality } from '../quality/QualityContext';
import { DISTRICT_SIZE, districtPosition } from './grid';

const NPC_Y = 0.5;
// Wander radius scales with district size — keep NPCs within the
// inner 80% of the pad so they don't walk through street gaps.
const WANDER_RADIUS = DISTRICT_SIZE * 0.38;

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

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

/**
 * Wandering NPCs — small robot drones that imply activity in each
 * district. Sampled deterministically from the agent list (stable
 * across refreshes) and coloured by framework so district ownership
 * is legible at a glance.
 *
 * Movement is purely decorative (Lissajous oscillator around the
 * district centre); no physics, no collision. Parts are instanced per
 * framework so the robot silhouettes stay cheap to animate.
 */
export function NPCs({ agents, onNpcClick }: Props) {
  const quality = useQuality();
  const max = quality === 'high' ? 90 : 28;

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

  // Bucket by framework so each robot part can share one framework-
  // colored material instead of carrying per-instance colour through
  // the material shader.
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
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const eyeRef = useRef<THREE.InstancedMesh>(null);
  const armRef = useRef<THREE.InstancedMesh>(null);
  const hoverRef = useRef<THREE.InstancedMesh>(null);
  const click = (e: { instanceId?: number; stopPropagation: () => void }) => {
    if (!onNpcClick) return;
    const id = e.instanceId;
    if (id == null) return;
    const s = states[id];
    if (!s) return;
    e.stopPropagation();
    onNpcClick(s.agentId);
  };
  const { bodyMat, headMat, eyeMat, hoverMat } = useMemo(() => {
    const color = FRAMEWORK_COLORS[framework];
    const bright = framework === 'openclaw'
      ? 0xb9ffd4
      : framework === 'hermes'
        ? 0xcff8ff
        : 0xffffff;
    return {
      bodyMat: new THREE.MeshStandardMaterial({
        color: 0x111923,
        emissive: color,
        emissiveIntensity: 0.34,
        roughness: 0.34,
        metalness: 0.82,
        envMapIntensity: 0.18,
      }),
      headMat: new THREE.MeshStandardMaterial({
        color: 0x172433,
        emissive: color,
        emissiveIntensity: 0.5,
        roughness: 0.28,
        metalness: 0.72,
        envMapIntensity: 0.2,
      }),
      eyeMat: new THREE.MeshBasicMaterial({
        color: bright,
        toneMapped: false,
        transparent: true,
        opacity: 0.9,
      }),
      hoverMat: new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
      }),
    };
  }, [framework]);

  useFrame(({ clock }) => {
    if (!bodyRef.current || !headRef.current || !eyeRef.current || !armRef.current || !hoverRef.current || states.length === 0) return;
    const t = clock.getElapsedTime();
    const obj = new THREE.Object3D();
    const quat = new THREE.Quaternion();
    const base = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const setPart = (
      mesh: THREE.InstancedMesh,
      index: number,
      localOffset: [number, number, number],
      scale: [number, number, number],
      rotationY = 0,
    ) => {
      offset.set(localOffset[0], localOffset[1], localOffset[2]).applyQuaternion(quat);
      obj.position.copy(base).add(offset);
      obj.quaternion.copy(quat);
      if (rotationY) obj.rotateY(rotationY);
      obj.scale.set(scale[0], scale[1], scale[2]);
      obj.updateMatrix();
      mesh.setMatrixAt(index, obj.matrix);
    };

    states.forEach((s, i) => {
      // Lissajous — two different frequencies on x and z give natural
      // non-repeating paths within the district.
      const a = s.phase + t * s.speed;
      const x = s.cx + Math.cos(a) * s.radius;
      const z = s.cz + Math.sin(a * 1.37) * s.radius;
      const y = NPC_Y + Math.sin(a * 3) * s.bob;
      const scale = 0.82 + hashStr(s.agentId + ':robot-size') * 0.42;
      const sway = Math.sin(t * 3.8 + s.phase) * 0.08;
      base.set(x, y, z);
      quat.setFromEuler(new THREE.Euler(0, a * 0.5 + sway, 0));

      setPart(bodyRef.current!, i, [0, 0.34 * scale, 0], [0.72 * scale, 0.92 * scale, 0.55 * scale]);
      setPart(headRef.current!, i, [0, 1.0 * scale, 0.05 * scale], [0.52 * scale, 0.46 * scale, 0.52 * scale]);
      setPart(eyeRef.current!, i, [0, 1.01 * scale, 0.34 * scale], [0.42 * scale, 0.08 * scale, 0.04 * scale]);
      setPart(armRef.current!, i, [0, 0.58 * scale, 0], [1.18 * scale, 0.11 * scale, 0.11 * scale]);
      setPart(hoverRef.current!, i, [0, -0.24 * scale, 0], [0.72 * scale, 0.72 * scale, 0.72 * scale], Math.PI / 2);
    });
    bodyRef.current.instanceMatrix.needsUpdate = true;
    headRef.current.instanceMatrix.needsUpdate = true;
    eyeRef.current.instanceMatrix.needsUpdate = true;
    armRef.current.instanceMatrix.needsUpdate = true;
    hoverRef.current.instanceMatrix.needsUpdate = true;
  });

  if (states.length === 0) return null;
  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, states.length]} onClick={click}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={bodyMat} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, states.length]} onClick={click}>
        <sphereGeometry args={[0.5, 12, 10]} />
        <primitive attach="material" object={headMat} />
      </instancedMesh>
      <instancedMesh ref={eyeRef} args={[undefined, undefined, states.length]} onClick={click}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={eyeMat} />
      </instancedMesh>
      <instancedMesh ref={armRef} args={[undefined, undefined, states.length]} onClick={click}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={bodyMat} />
      </instancedMesh>
      <instancedMesh ref={hoverRef} args={[undefined, undefined, states.length]} onClick={click}>
        <ringGeometry args={[0.52, 0.62, 22]} />
        <primitive attach="material" object={hoverMat} />
      </instancedMesh>
    </group>
  );
}
