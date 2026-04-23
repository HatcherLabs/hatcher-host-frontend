'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import { QualityProvider, useQuality } from './quality/QualityContext';
import { QualityToggle } from './quality/QualityToggle';
import { Skybox } from './world/Skybox';
import { Ground } from './world/Ground';

// Rapier is installed (Phase 5) but not mounted here — walking
// character controller lands in a later phase.

/**
 * Top-level Canvas for City V2.
 *
 * Phase 1: empty world (skybox + ground + orbit camera) wrapped in a
 * QualityProvider. Descendants read `useQuality()` to branch HIGH/LOW
 * presets. Later phases add Buildings, Streets, NPCs, Traffic, the
 * character controller, etc.
 */
export function CitySceneV2() {
  return (
    <QualityProvider>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <CanvasInner />
        <QualityToggle />
      </div>
    </QualityProvider>
  );
}

function CanvasInner() {
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
        <Skybox timeOfDay="auto" />
        <Ground />
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
