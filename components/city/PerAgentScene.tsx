'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { CityAgent, Framework } from './types';
import { FRAMEWORK_COLORS, FRAMEWORK_EMISSIVE, TIER_HEIGHT } from './types';

interface Props {
  agent: CityAgent;
}

function OrbitCamera({ target, radius, height }: { target: THREE.Vector3; radius: number; height: number }) {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.set(
      target.x + Math.cos(t * 0.35) * radius,
      target.y + height,
      target.z + Math.sin(t * 0.35) * radius,
    );
    state.camera.lookAt(target);
  });
  return null;
}

function BuildingSolo({ agent }: { agent: CityAgent }) {
  const bodyMat = useMemo(() => {
    const base = FRAMEWORK_COLORS[agent.framework];
    const glow = FRAMEWORK_EMISSIVE[agent.framework];
    const running = agent.status === 'running';
    return new THREE.MeshStandardMaterial({
      color: agent.status === 'crashed' ? 0x7f1d1d : agent.status === 'paused' ? 0x334155 : base,
      emissive: running ? glow : 0x000000,
      emissiveIntensity: running ? 0.35 : 0,
      roughness: 0.65,
      metalness: 0.18,
    });
  }, [agent.framework, agent.status]);

  const roofMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: FRAMEWORK_COLORS[agent.framework],
      emissive: FRAMEWORK_EMISSIVE[agent.framework],
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.35,
    });
  }, [agent.framework]);

  const h = Math.max(6, TIER_HEIGHT[agent.tier] ?? 6);
  const w = 4;
  const fw: Framework = agent.framework;

  return (
    <group>
      {/* Body */}
      <mesh position={[0, h / 2, 0]} scale={[w, h, w]} material={bodyMat}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      {/* Window strip when running */}
      {agent.status === 'running' && (
        <mesh
          position={[0, h * 0.55, 0]}
          scale={[w * 1.02, 0.3, w * 1.02]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={0xfde68a} emissive={0xfbbf24} emissiveIntensity={1.6} />
        </mesh>
      )}
      {/* Framework roof */}
      <RoofSolo framework={fw} mat={roofMat} h={h} w={w} />
      {/* Founding crown */}
      {agent.tier === 4 && (
        <mesh position={[0, h + 1.8, 0]}>
          <coneGeometry args={[w * 0.55, w * 0.8, 5]} />
          <meshStandardMaterial color={0xfbbf24} emissive={0xf59e0b} emissiveIntensity={0.7} metalness={0.85} roughness={0.15} />
        </mesh>
      )}
      {/* Ground pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[26, 26]} />
        <meshStandardMaterial color={0x111827} roughness={0.9} transparent opacity={0.75} />
      </mesh>
      <gridHelper args={[80, 20, 0x1f2937, 0x0f172a]} position={[0, 0.025, 0]} />
    </group>
  );
}

function RoofSolo({ framework, mat, h, w }: { framework: Framework; mat: THREE.Material; h: number; w: number }) {
  switch (framework) {
    case 'openclaw':
      return (
        <>
          <mesh position={[0, h + 0.09, 0]} scale={[w, 1, w]} material={mat}>
            <boxGeometry args={[1.06, 0.18, 1.06]} />
          </mesh>
          <mesh position={[w * 0.2, h + 0.6, -w * 0.15]} material={mat}>
            <cylinderGeometry args={[w * 0.2, w * 0.2, 0.7, 10]} />
          </mesh>
        </>
      );
    case 'hermes':
      return (
        <mesh position={[0, h + w * 0.3, 0]} rotation={[0, Math.PI / 4, 0]} material={mat}>
          <coneGeometry args={[w * 0.82, w * 0.6, 4]} />
        </mesh>
      );
    case 'elizaos':
      return (
        <mesh position={[0, h, 0]} scale={[1, 0.6, 1]} material={mat}>
          <sphereGeometry args={[w * 0.58, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      );
    case 'milady':
      return (
        <mesh position={[0, h + w * 0.5, 0]} material={mat}>
          <coneGeometry args={[w * 0.45, w * 0.95, 6]} />
        </mesh>
      );
  }
}

export function PerAgentScene({ agent }: Props) {
  const target = useMemo(() => new THREE.Vector3(0, (TIER_HEIGHT[agent.tier] ?? 6) * 0.45, 0), [agent.tier]);

  return (
    <Canvas
      camera={{ fov: 40, near: 0.1, far: 500, position: [20, 14, 20] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[0x050814]} />
      <fog attach="fog" args={[0x050814, 40, 90]} />

      <ambientLight intensity={0.45} color={0xaabbcc} />
      <directionalLight position={[18, 28, 12]} intensity={0.9} color={0xfff4d6} />
      <hemisphereLight args={[0x7799ff, 0x1a0f2a, 0.4]} />

      <BuildingSolo agent={agent} />
      <OrbitCamera target={target} radius={22} height={(TIER_HEIGHT[agent.tier] ?? 6) * 0.9} />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom intensity={0.9} luminanceThreshold={0.35} luminanceSmoothing={0.15} mipmapBlur radius={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
