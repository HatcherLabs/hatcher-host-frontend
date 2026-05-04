'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useRouter } from '@/i18n/routing';
import type { CityAgent } from '@/components/city/types';
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
import { CATEGORIES } from '@/components/city/types';
import {
  DISTRICT_COLS,
  DISTRICT_GAP,
  DISTRICT_ROWS,
  DISTRICT_SIZE,
  DISTRICT_STEP,
  GROUND_SIZE,
  districtPosition as gridDistrictPosition,
} from './world/grid';
import { useMemo as useMemoReact } from 'react';

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

export function CitySceneV2({ agents = [], pulseAts = EMPTY_PULSES }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<CityMode>('survey');
  const charState = useRef<CharacterState>({
    position: new THREE.Vector3(0, 0, 0),
    heading: 0,
    cameraYaw: 0,
    cameraPitch: 0.35,
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
    // Drop the character at the SE travel-pad corner so they never
    // appear inside the district's landmark sculpt.
    const padOffset = DISTRICT_SIZE * 0.3;
    charState.current.position.set(cx + padOffset, 0, cz + padOffset);
    charState.current.heading = 0;
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
        <WalkSurveyToggle mode={mode} onChange={setMode} />
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
  const solids = useMemoReact(
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
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      {/* Cyber-cool lighting. Skybox HDRI supplies ambient/reflection
          only (background={false}); CyberSky paints a procedural
          gradient + sparse star field so the dome above the city reads
          as a real sky instead of a flat void. The clear color is a
          near-match to the sky horizon as a fallback if the shader
          ever fails to compile. */}
      <color attach="background" args={['#050418']} />
      {/* Fog is a light atmospheric touch — city stays clearly
          readable out to ~380u, with a slow falloff past that. Walk
          mode clamps at ~255u of player movement, so the fog far
          plane at 480 leaves plenty of headroom. The fog colour
          matches CyberSky's horizon band so the city blends into the
          sky without a visible seam. */}
      <fog attach="fog" args={['#050418', 200, 480]} />
      <ambientLight intensity={0.18} color={'#4866aa'} />
      <directionalLight
        position={[100, 140, 80]}
        intensity={0.6}
        color={'#7ac8ff'}
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
    </Canvas>
  );
}

function SurveyCamera() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 210, 255);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.035;
    const radius = 255;
    camera.position.set(Math.sin(t) * radius, 210, Math.cos(t) * radius);
    camera.lookAt(0, 0, 0);
  });

  return null;
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
