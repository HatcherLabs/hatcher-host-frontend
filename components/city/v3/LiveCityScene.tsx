'use client';
import { MapControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useRouter } from '@/i18n/routing';
import type { CityAgent, CityResponse } from '@/components/city/types';
import { QualityProvider, useQuality } from '@/components/city/v2/quality/QualityContext';
import { QualityToggle } from '@/components/city/v2/quality/QualityToggle';
import { CyberSky } from '@/components/city/v2/world/CyberSky';
import { Ground } from '@/components/city/v2/world/Ground';
import { HorizonRing } from '@/components/city/v2/world/HorizonRing';
import { SceneErrorBoundary } from '@/components/city/v2/world/SceneErrorBoundary';
import { Skybox } from '@/components/city/v2/world/Skybox';
import { Atmosphere } from '@/components/city/v2/world/Atmosphere';
import { layoutLiveCity } from './liveLayout';
import { LiveActivityPulses } from './LiveActivityPulses';
import { LiveBuildings } from './LiveBuildings';
import { LiveCityHud } from './LiveCityHud';
import { LiveNetworkRoutes } from './LiveNetworkRoutes';

interface Props {
  agents: CityAgent[];
  counts: CityResponse['counts'] | null;
  generatedAt?: string | null;
  pulseAts: Map<string, number>;
}

const EMPTY_COUNTS: CityResponse['counts'] = {
  total: 0,
  running: 0,
  byFramework: { openclaw: 0, hermes: 0 },
  byCategory: {} as CityResponse['counts']['byCategory'],
};

export function LiveCityScene({ agents, counts, generatedAt, pulseAts }: Props) {
  const router = useRouter();
  const openAgentRoom = useCallback(
    (agentId: string) => router.push(`/agent/${agentId}/room?from=city`),
    [router],
  );

  return (
    <QualityProvider>
      <LiveCitySceneBody
        agents={agents}
        counts={counts ?? EMPTY_COUNTS}
        generatedAt={generatedAt}
        pulseAts={pulseAts}
        onBuildingClick={openAgentRoom}
      />
    </QualityProvider>
  );
}

function LiveCitySceneBody({
  agents,
  counts,
  generatedAt,
  pulseAts,
  onBuildingClick,
}: Props & { counts: CityResponse['counts']; onBuildingClick: (agentId: string) => void }) {
  const quality = useQuality();
  const layout = useMemo(
    () =>
      layoutLiveCity(agents, {
        maxBuildings: quality === 'high' ? 88 : 42,
        routeLimit: quality === 'high' ? 24 : 10,
      }),
    [agents, quality],
  );

  return (
    <div className="relative h-full w-full bg-[#030506]">
      <Canvas
        key={quality}
        camera={{ position: [98, 92, 126], fov: 46, near: 0.5, far: 900 }}
        dpr={quality === 'high' ? [1, 2] : 1}
        gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
        shadows={quality === 'high'}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = quality === 'high' ? 1.08 : 1.0;
        }}
      >
        <color attach="background" args={['#050814']} />
        <fog attach="fog" args={['#050814', 150, 420]} />
        <ambientLight intensity={0.28} color="#7fb7ff" />
        <hemisphereLight color="#9fc9ff" groundColor="#050814" intensity={0.18} />
        <directionalLight
          position={[90, 120, 80]}
          intensity={0.95}
          color="#7ac8ff"
          castShadow={quality === 'high'}
        />
        <directionalLight position={[-90, 58, -74]} intensity={0.48} color="#d855ff" />

        <Suspense fallback={null}>
          <SceneErrorBoundary label="Skybox">
            <Skybox timeOfDay="auto" />
          </SceneErrorBoundary>
        </Suspense>
        <SceneErrorBoundary label="CyberSky">
          <CyberSky />
        </SceneErrorBoundary>
        <Suspense fallback={null}>
          <Ground />
        </Suspense>
        <HorizonRing />
        <SceneErrorBoundary label="LiveBuildings">
          <Suspense fallback={null}>
            <LiveBuildings buildings={layout.buildings} onBuildingClick={onBuildingClick} />
          </Suspense>
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveNetworkRoutes">
          <LiveNetworkRoutes routes={layout.routes} />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveActivityPulses">
          <LiveActivityPulses buildings={layout.buildings} pulseAts={pulseAts} />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="Atmosphere">
          <Atmosphere />
        </SceneErrorBoundary>
        <SurveyCamera />
      </Canvas>
      <QualityToggle />
      <LiveCityHud counts={counts} ownedAgents={layout.ownedAgents} generatedAt={generatedAt} />
    </div>
  );
}

function SurveyCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(98, 92, 126);
    camera.lookAt(0, 8, -4);
  }, [camera]);

  return (
    <MapControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enableZoom
      enablePan
      enableRotate
      minDistance={56}
      maxDistance={260}
      minPolarAngle={0.45}
      maxPolarAngle={1.26}
      target={[0, 8, -4]}
    />
  );
}
