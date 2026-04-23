'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CityAgent } from '@/components/city/types';
import { QualityProvider, useQuality } from './quality/QualityContext';
import { QualityToggle } from './quality/QualityToggle';
import { Skybox } from './world/Skybox';
import { Ground } from './world/Ground';
import { SceneErrorBoundary } from './world/SceneErrorBoundary';
import { Streets } from './world/Streets';
import { DistrictPads } from './world/DistrictPads';
import { Landmarks } from './world/Landmarks';
import { TravelPads } from './world/TravelPads';
import { Traffic } from './world/Traffic';
import { NPCs } from './world/NPCs';
import { Buildings } from './world/Buildings';
import {
  CharacterController,
  CharacterMesh,
  MouseLook,
  type CharacterState,
} from './character/CharacterController';
import { FollowCamera } from './character/FollowCamera';
import { WalkSurveyToggle, type CityMode } from './hud/WalkSurveyToggle';
import { Minimap } from './hud/Minimap';
import { CATEGORIES } from '@/components/city/types';

interface Props {
  agents?: CityAgent[];
}

/**
 * Top-level Canvas for City V2.
 *
 * Phase 2 + cyber pass + Phase 5 walk mode: HDRI skybox + PBR ground
 * with emissive grid overlay + 25 themed district pads + street grid
 * + InstancedMesh buildings + ambient traffic + wandering NPCs +
 * Bloom post-processing. Toggle between aerial Survey (OrbitControls)
 * and first-person Walk (WASD + FollowCamera).
 */
export function CitySceneV2({ agents = [] }: Props) {
  const [mode, setMode] = useState<CityMode>('survey');
  // Shared kinematic state — mutable so both CharacterController and
  // FollowCamera can read/write without triggering re-renders.
  const charState = useRef<CharacterState>({
    position: new THREE.Vector3(0, 0, 0),
    heading: 0,
    cameraYaw: 0,
    cameraPitch: 0.35,
  });

  // Esc exits walk mode from anywhere on the page
  useEffect(() => {
    if (mode !== 'walk') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode('survey');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  // Minimap click handler — teleport character + enter walk mode so
  // the click immediately puts you somewhere you can explore.
  const handleTravel = (cat: (typeof CATEGORIES)[number]) => {
    const DISTRICT_COLS = 5;
    const DISTRICT_SIZE = 52;
    const DISTRICT_GAP = 14;
    const step = DISTRICT_SIZE + DISTRICT_GAP;
    const totalRows = Math.ceil(CATEGORIES.length / DISTRICT_COLS);
    const idx = CATEGORIES.indexOf(cat);
    if (idx < 0) return;
    const col = idx % DISTRICT_COLS;
    const row = Math.floor(idx / DISTRICT_COLS);
    const cx = (col - (DISTRICT_COLS - 1) / 2) * step;
    const cz = (row - (totalRows - 1) / 2) * step;
    // Drop character at the district's travel pad corner so they're
    // never inside a building after teleport.
    charState.current.position.set(cx + 16, 0, cz + 16);
    charState.current.heading = 0;
    setMode('walk');
  };

  return (
    <QualityProvider>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <CanvasInner agents={agents} mode={mode} charState={charState.current} />
        <QualityToggle />
        <WalkSurveyToggle mode={mode} onChange={setMode} />
        <Minimap
          state={charState.current}
          agents={agents}
          showCharacter={mode === 'walk'}
          onTravel={handleTravel}
        />
      </div>
    </QualityProvider>
  );
}

function CanvasInner({
  agents,
  mode,
  charState,
}: {
  agents: CityAgent[];
  mode: CityMode;
  charState: CharacterState;
}) {
  const quality = useQuality();
  return (
    <Canvas
      key={quality}
      camera={{ position: [60, 80, 120], fov: 45, near: 0.5, far: 1000 }}
      dpr={quality === 'high' ? [1, 2] : 1}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      {/* Cyber-cool lighting. Skybox HDRI supplies ambient/reflection
          only (background={false}), so everything you see beyond the
          city is the flat `<color>` below + fog falloff. Keeps the
          scene calm and keeps our 600u ground from competing with real
          photographed skyscrapers in the HDRI. */}
      <color attach="background" args={['#030111']} />
      <fog attach="fog" args={['#050418', 140, 450]} />
      <ambientLight intensity={0.18} color={'#4866aa'} />
      <directionalLight
        position={[100, 140, 80]}
        intensity={0.6}
        color={'#7ac8ff'}
        castShadow
      />
      <directionalLight
        position={[-120, 60, -80]}
        intensity={0.3}
        color={'#d855ff'}
      />
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
        <SceneErrorBoundary label="Landmarks">
          <Landmarks />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="TravelPads">
          <TravelPads />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="Traffic">
          <Traffic />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="NPCs">
          <NPCs agents={agents} />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="Buildings">
          <Buildings agents={agents} />
        </SceneErrorBoundary>
        {mode === 'walk' && (
          <SceneErrorBoundary label="Character">
            <CharacterMesh state={charState} />
          </SceneErrorBoundary>
        )}
      </Suspense>
      {mode === 'survey' ? (
        <OrbitControls
          enableDamping
          target={[0, 0, 0]}
          minDistance={30}
          maxDistance={400}
        />
      ) : (
        <>
          <CharacterController state={charState} />
          <MouseLook state={charState} />
          <FollowCamera state={charState} />
        </>
      )}
      {/* Bloom picks up the emissive building tint + district pad edges
          and the HDRI neon highlights. HIGH gets a punchier pass; LOW
          keeps it cheap. */}
      <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={false}>
        <Bloom
          intensity={quality === 'high' ? 0.55 : 0.3}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.2}
          mipmapBlur
          radius={quality === 'high' ? 0.6 : 0.45}
        />
      </EffectComposer>
    </Canvas>
  );
}

// Keep Three.js import so the ESM tree-shaker doesn't drop the side
// effect that registers BufferGeometry extensions used by drei.
void THREE;
