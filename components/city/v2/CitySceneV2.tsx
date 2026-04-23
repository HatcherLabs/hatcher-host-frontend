'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Suspense } from 'react';
import * as THREE from 'three';
import type { CityAgent } from '@/components/city/types';
import { QualityProvider, useQuality } from './quality/QualityContext';
import { QualityToggle } from './quality/QualityToggle';
import { Skybox } from './world/Skybox';
import { Ground } from './world/Ground';
import { SceneErrorBoundary } from './world/SceneErrorBoundary';
import { Streets } from './world/Streets';
import { DistrictPads } from './world/DistrictPads';
import { Buildings } from './world/Buildings';

// Rapier is installed (Phase 5) but not mounted here — walking
// character controller lands in a later phase.

interface Props {
  agents?: CityAgent[];
}

/**
 * Top-level Canvas for City V2.
 *
 * Phase 2 + cyber pass: HDRI skybox + PBR ground with emissive grid
 * overlay + 25 themed district pads + street grid + InstancedMesh
 * buildings (one per agent, coloured by framework) + Bloom post-
 * processing for the neon glow. Survey-only camera; walking mode is
 * Phase 5.
 */
export function CitySceneV2({ agents = [] }: Props) {
  return (
    <QualityProvider>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <CanvasInner agents={agents} />
        <QualityToggle />
      </div>
    </QualityProvider>
  );
}

function CanvasInner({ agents }: { agents: CityAgent[] }) {
  const quality = useQuality();
  return (
    <Canvas
      key={quality}
      camera={{ position: [60, 80, 120], fov: 45, near: 0.5, far: 1000 }}
      dpr={quality === 'high' ? [1, 2] : 1}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      {/* Cyber-cool lighting — low ambient, cold directional key from
          behind-camera-right (tints building fronts teal), and a magenta
          rim from the opposite side to pop silhouettes against the
          skybox. Fog falls off at city edge to a deep indigo. */}
      <color attach="background" args={['#050214']} />
      <fog attach="fog" args={['#070420', 180, 520]} />
      <ambientLight intensity={0.25} color={'#4866aa'} />
      <directionalLight position={[100, 140, 80]} intensity={1.1} color={'#7ac8ff'} castShadow />
      <directionalLight position={[-120, 60, -80]} intensity={0.55} color={'#d855ff'} />
      <Suspense fallback={null}>
        <SceneErrorBoundary label="Skybox">
          <Skybox timeOfDay="auto" />
        </SceneErrorBoundary>
        <Ground />
        <SceneErrorBoundary label="DistrictPads">
          <DistrictPads />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="Streets">
          <Streets />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="Buildings">
          <Buildings agents={agents} />
        </SceneErrorBoundary>
      </Suspense>
      <OrbitControls
        enableDamping
        target={[0, 0, 0]}
        minDistance={30}
        maxDistance={400}
      />
      {/* Bloom picks up the emissive building tint + district pad edges
          and the HDRI neon highlights. HIGH gets a punchier pass; LOW
          keeps it cheap. */}
      <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={false}>
        <Bloom
          intensity={quality === 'high' ? 0.9 : 0.45}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.18}
          mipmapBlur
          radius={quality === 'high' ? 0.75 : 0.55}
        />
      </EffectComposer>
    </Canvas>
  );
}

// Keep Three.js import so the ESM tree-shaker doesn't drop the side
// effect that registers BufferGeometry extensions used by drei.
void THREE;
