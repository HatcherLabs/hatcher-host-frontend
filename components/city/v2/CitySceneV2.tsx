'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
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
 * Phase 2: skybox + PBR ground + 25 themed district pads + street grid
 * + InstancedMesh buildings (one per agent, coloured by framework).
 * Survey-only camera; walking mode is Phase 5.
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
      <ambientLight intensity={0.3} />
      <directionalLight position={[100, 140, 80]} intensity={1.4} castShadow />
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
    </Canvas>
  );
}
