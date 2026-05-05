'use client';
import { MapControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  N8AO,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useRouter } from '@/i18n/routing';
import { CATEGORIES, type Category, type CityAgent } from '@/components/city/types';
import { QualityProvider, useQuality } from './quality/QualityContext';
import { QualityToggle } from './quality/QualityToggle';
import { Skybox } from './world/Skybox';
import { CyberSky } from './world/CyberSky';
import { Ground } from './world/Ground';
import { HorizonRing } from './world/HorizonRing';
import { SceneErrorBoundary } from './world/SceneErrorBoundary';
import { Streets } from './world/Streets';
import { DistrictPads } from './world/DistrictPads';
import { Landmarks } from './world/Landmarks';
import { DistrictLabels } from './world/DistrictLabels';
import { Streetlights } from './world/Streetlights';
import { TravelPads } from './world/TravelPads';
import { Traffic } from './world/Traffic';
import { NPCs } from './world/NPCs';
import { Buildings } from './world/Buildings';
import { CitySetDressing } from './world/CitySetDressing';
import { ActivityPulses } from './world/ActivityPulses';
import { Atmosphere } from './world/Atmosphere';
import { LiveBillboard } from './world/LiveBillboard';
import { CityGameFX } from './world/CityGameFX';
import { buildSolidDiscs } from './world/colliders';
import {
  CharacterController,
  CharacterMesh,
  MouseLook,
  type CharacterState,
} from './character/CharacterController';
import { FollowCamera } from './character/FollowCamera';
import { WalkSurveyToggle, type CityMode } from './hud/WalkSurveyToggle';
import { Minimap } from './hud/Minimap';
import { WalkOnboarding } from './hud/WalkOnboarding';
import { MobileJoystick } from './character/MobileJoystick';
import { AmbientAudio } from './hud/AmbientAudio';
import {
  DISTRICT_COLS,
  DISTRICT_GAP,
  DISTRICT_ROWS,
  DISTRICT_SIZE,
  DISTRICT_STEP,
  GROUND_SIZE,
  districtPosition as gridDistrictPosition,
} from './world/grid';

interface Props {
  agents?: CityAgent[];
  /** Optional live-activity pulses — keyed by agentId → timestamp, as
   *  emitted by CityClient. If omitted, the activity-pulse ring pool
   *  stays dormant. */
  pulseAts?: Map<string, number>;
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
const EMPTY_PULSES: Map<string, number> = new Map();
const DEFAULT_WALK_DISTRICT: Category = 'data';

function walkSpawnFor(category: Category) {
  const idx = CATEGORIES.indexOf(category);
  const { x: cx, z: cz } = gridDistrictPosition(idx >= 0 ? idx : 0);
  const padOffset = DISTRICT_SIZE * 0.3;
  const x = cx + padOffset;
  const z = cz + padOffset;
  const yaw = Math.atan2(cx - x, cz - z);
  return { x, z, yaw };
}

function placeCharacterOnTravelPad(state: CharacterState, category: Category) {
  const spawn = walkSpawnFor(category);
  state.position.set(spawn.x, 0, spawn.z);
  state.heading = spawn.yaw;
  state.cameraYaw = spawn.yaw;
  state.cameraPitch = 0.18;
}

export function CitySceneV2({ agents = [], pulseAts = EMPTY_PULSES }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<CityMode>('survey');
  const initialSpawn = walkSpawnFor(DEFAULT_WALK_DISTRICT);
  const charState = useRef<CharacterState>({
    position: new THREE.Vector3(initialSpawn.x, 0, initialSpawn.z),
    heading: initialSpawn.yaw,
    cameraYaw: initialSpawn.yaw,
    cameraPitch: 0.18,
  });
  // Analog vector from the mobile joystick; shared with CanvasInner
  // via ref so updating it doesn't cause re-renders.
  const analogRef = useRef({ x: 0, y: 0 });

  // Building/NPC click → drop into the agent's V2 room. Replaces the
  // old AgentPopup preview overlay — the room IS the detail view.
  const openAgentRoom = useCallback(
    (agentId: string) => {
      router.push(`/agent/${agentId}/room?from=city`);
    },
    [router],
  );

  const handleModeChange = useCallback(
    (next: CityMode) => {
      if (next === 'walk' && mode !== 'walk' && charState.current.position.lengthSq() < 4) {
        placeCharacterOnTravelPad(charState.current, DEFAULT_WALK_DISTRICT);
      }
      setMode(next);
    },
    [mode],
  );

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
    const idx = CATEGORIES.indexOf(cat);
    if (idx < 0) return;
    const { x: cx, z: cz } = gridDistrictPosition(idx);
    const category = CATEGORIES[idx]!;
    placeCharacterOnTravelPad(charState.current, category);
    charState.current.heading = Math.atan2(
      cx - charState.current.position.x,
      cz - charState.current.position.z,
    );
    setMode('walk');
  };

  return (
    <QualityProvider>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <CanvasInner
          agents={agents}
          mode={mode}
          charState={charState.current}
          pulseAts={pulseAts}
          onBuildingClick={openAgentRoom}
          analogRef={analogRef}
        />
        <QualityToggle />
        <WalkSurveyToggle mode={mode} onChange={handleModeChange} />
        <Minimap
          state={charState.current}
          agents={agents}
          showCharacter={mode === 'walk'}
          onTravel={handleTravel}
        />
        <WalkOnboarding visible={mode === 'walk'} />
        <AmbientAudio />
        {mode === 'walk' && (
          <MobileJoystick
            onVector={(x, y) => {
              analogRef.current.x = x;
              analogRef.current.y = y;
            }}
          />
        )}
      </div>
    </QualityProvider>
  );
}

function CanvasInner({
  agents,
  mode,
  charState,
  pulseAts,
  onBuildingClick,
  analogRef,
}: {
  agents: CityAgent[];
  mode: CityMode;
  charState: CharacterState;
  pulseAts: Map<string, number>;
  onBuildingClick?: (agentId: string) => void;
  analogRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const quality = useQuality();
  // Only derive collider discs when in walk mode — in survey there's
  // no character to push out, and the agent list can be huge.
  const solids = useMemo(
    () => (mode === 'walk' ? buildSolidDiscs(agents) : []),
    [mode, agents],
  );
  return (
    <Canvas
      key={quality}
      camera={{
        position: [0, 260, 0.1],
        rotation: [-Math.PI / 2, 0, 0],
        fov: 45,
        near: 0.5,
        far: 1000,
      }}
      dpr={quality === 'high' ? [1, 2] : 1}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
      shadows={quality === 'high'}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = quality === 'high' ? 1.08 : 1.0;
      }}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      {/* Cyber-cool lighting. Skybox HDRI supplies ambient/reflection
          only (background={false}); CyberSky paints a procedural
          gradient + sparse star field so the dome above the city reads
          as a real sky instead of a flat void. The clear color is a
          near-match to the sky horizon as a fallback if the shader
          ever fails to compile. */}
      <color attach="background" args={['#070a18']} />
      {/* Fog is a light atmospheric touch — city stays clearly
          readable out to ~380u, with a slow falloff past that. Walk
          mode clamps at ~255u of player movement, so the fog far
          plane at 480 leaves plenty of headroom. The fog colour
          matches CyberSky's horizon band so the city blends into the
          sky without a visible seam. */}
      <fog attach="fog" args={['#070a18', 260, 620]} />
      <ambientLight intensity={0.28} color={'#5f7fca'} />
      <hemisphereLight color={'#9fc9ff'} groundColor={'#050814'} intensity={0.16} />
      <directionalLight
        position={[100, 140, 80]}
        intensity={0.9}
        color={'#7ac8ff'}
        castShadow={quality === 'high'}
      />
      <directionalLight
        position={[-120, 60, -80]}
        intensity={0.45}
        color={'#d855ff'}
      />
      <Suspense fallback={null}>
        <SceneErrorBoundary label="Skybox">
          <Skybox timeOfDay="auto" />
        </SceneErrorBoundary>
      </Suspense>
      <SceneErrorBoundary label="CyberSky">
        <CyberSky />
      </SceneErrorBoundary>
      <Suspense fallback={<FallbackGround />}>
        <Ground />
      </Suspense>
      <HorizonRing />
      <SceneErrorBoundary label="DistrictPads">
        <DistrictPads />
      </SceneErrorBoundary>
      <SceneErrorBoundary label="Streets">
        <Suspense fallback={<FallbackStreets />}>
          <Streets />
        </Suspense>
      </SceneErrorBoundary>
      <SceneErrorBoundary label="Landmarks">
        <Landmarks />
      </SceneErrorBoundary>
      <SceneErrorBoundary label="Streetlights">
        <Streetlights />
      </SceneErrorBoundary>
      <SceneErrorBoundary label="TravelPads">
        <TravelPads />
      </SceneErrorBoundary>
      <SceneErrorBoundary label="Traffic">
        <Traffic />
      </SceneErrorBoundary>
      <SceneErrorBoundary label="NPCs">
        <NPCs agents={agents} onNpcClick={onBuildingClick} />
      </SceneErrorBoundary>
      <Suspense fallback={null}>
        <SceneErrorBoundary label="CitySetDressing">
          <CitySetDressing />
        </SceneErrorBoundary>
      </Suspense>
      <Suspense fallback={null}>
        <SceneErrorBoundary label="Buildings">
          <Buildings agents={agents} onBuildingClick={onBuildingClick} />
        </SceneErrorBoundary>
      </Suspense>
      <SceneErrorBoundary label="ActivityPulses">
        <ActivityPulses agents={agents} pulseAts={pulseAts} />
      </SceneErrorBoundary>
      <SceneErrorBoundary label="Atmosphere">
        <Atmosphere />
      </SceneErrorBoundary>
      <SceneErrorBoundary label="CityGameFX">
        <CityGameFX agents={agents} />
      </SceneErrorBoundary>
      <SceneErrorBoundary label="LiveBillboard">
        <LiveBillboard agents={agents} />
      </SceneErrorBoundary>
      <SceneErrorBoundary label="DistrictLabels">
        <DistrictLabels agents={agents} />
      </SceneErrorBoundary>
      {mode === 'walk' && (
        <SceneErrorBoundary label="Character">
          <CharacterMesh state={charState} />
        </SceneErrorBoundary>
      )}
      {mode === 'survey' ? (
        <SurveyCamera />
      ) : (
        <>
          <CharacterController
            state={charState}
            analog={analogRef.current}
            solids={solids}
          />
          {/* Walk mode needs enough pitch range to look at the street
              in front of the character. -0.35 ≈ 20° below horizontal —
              you see the road ahead but not past the ground slab.
              Upper 0.95 keeps skyline look-ups unchanged. */}
          <MouseLook state={charState} pitchMin={-0.35} pitchMax={0.95} />
          <FollowCamera state={charState} />
        </>
      )}
      <CityPostProcessing />
    </Canvas>
  );
}

function SurveyCamera() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(150, 170, 235);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <MapControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enableZoom
      enablePan
      enableRotate
      minDistance={85}
      maxDistance={430}
      minPolarAngle={0.38}
      maxPolarAngle={1.23}
      zoomSpeed={0.9}
      panSpeed={0.72}
      rotateSpeed={0.42}
      target={[0, 0, 0]}
    />
  );
}

function CityPostProcessing() {
  const quality = useQuality();
  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={0.28}
          luminanceThreshold={0.72}
          luminanceSmoothing={0.22}
          mipmapBlur
        />
        <Vignette offset={0.22} darkness={0.35} opacity={0.38} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO
        aoRadius={5.5}
        distanceFalloff={1.8}
        intensity={0.72}
        quality="performance"
        halfRes
      />
      <Bloom intensity={0.58} luminanceThreshold={0.68} luminanceSmoothing={0.22} mipmapBlur />
      <Vignette offset={0.18} darkness={0.42} opacity={0.5} />
      <Noise opacity={0.018} />
    </EffectComposer>
  );
}

function FallbackGround() {
  return (
    <group>
      <mesh position={[0, -3, 0]} receiveShadow>
        <boxGeometry args={[GROUND_SIZE, 6, GROUND_SIZE]} />
        <meshStandardMaterial color={'#151720'} roughness={0.95} metalness={0.03} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshBasicMaterial color={'#0b1224'} transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

function FallbackStreets() {
  const longEdge = Math.max(DISTRICT_COLS, DISTRICT_ROWS) * DISTRICT_STEP + 20;
  const laneWidth = DISTRICT_GAP - 2;
  const horizontal = [];
  for (let r = 0; r <= DISTRICT_ROWS; r++) {
    horizontal.push((r - DISTRICT_ROWS / 2) * DISTRICT_STEP);
  }
  const vertical = [];
  for (let c = 0; c <= DISTRICT_COLS; c++) {
    vertical.push((c - DISTRICT_COLS / 2) * DISTRICT_STEP);
  }

  return (
    <group>
      {horizontal.map((z, i) => (
        <mesh key={`fallback-h-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, z]}>
          <planeGeometry args={[longEdge, laneWidth]} />
          <meshStandardMaterial color={'#252832'} roughness={0.88} />
        </mesh>
      ))}
      {vertical.map((x, i) => (
        <mesh key={`fallback-v-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.027, 0]}>
          <planeGeometry args={[laneWidth, longEdge]} />
          <meshStandardMaterial color={'#252832'} roughness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

// Keep Three.js import so the ESM tree-shaker doesn't drop the side
// effect that registers BufferGeometry extensions used by drei.
void THREE;
