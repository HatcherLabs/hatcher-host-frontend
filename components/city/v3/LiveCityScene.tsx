'use client';
import { MapControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useRouter } from '@/i18n/routing';
import type { CityAgent, CityResponse } from '@/components/city/types';
import {
  QualityProvider,
  useQuality,
} from '@/components/city/v2/quality/QualityContext';
import { QualityToggle } from '@/components/city/v2/quality/QualityToggle';
import { CyberSky } from '@/components/city/v2/world/CyberSky';
import { HorizonRing } from '@/components/city/v2/world/HorizonRing';
import { SceneErrorBoundary } from '@/components/city/v2/world/SceneErrorBoundary';
import { Skybox } from '@/components/city/v2/world/Skybox';
import { Atmosphere } from '@/components/city/v2/world/Atmosphere';
import { layoutLiveCity } from './liveLayout';
import { LiveAgentMarkers } from './LiveAgentMarkers';
import { LiveActivityPulses } from './LiveActivityPulses';
import { LiveBuildings } from './LiveBuildings';
import { LiveCityHud } from './LiveCityHud';
import { LiveCityInfrastructure } from './LiveCityInfrastructure';
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

export function LiveCityScene({
  agents,
  counts,
  generatedAt,
  pulseAts,
}: Props) {
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
}: Props & {
  counts: CityResponse['counts'];
  onBuildingClick: (agentId: string) => void;
}) {
  const quality = useQuality();
  const layout = useMemo(
    () =>
      layoutLiveCity(agents, {
        maxBuildings: quality === 'high' ? 800 : 420,
        routeLimit: quality === 'high' ? 18 : 10,
      }),
    [agents, quality],
  );

  return (
    <div className="relative h-full w-full bg-[#030506]">
      <Canvas
        key={quality}
        camera={{ position: [98, 62, 118], fov: 43, near: 0.5, far: 760 }}
        dpr={quality === 'high' ? [1, 2] : 1}
        gl={{
          antialias: quality === 'high',
          powerPreference: 'high-performance',
        }}
        shadows={quality === 'high'}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = quality === 'high' ? 1.08 : 1.0;
        }}
      >
        <color attach="background" args={['#050814']} />
        <fog attach="fog" args={['#050814', 170, 540]} />
        <ambientLight intensity={0.2} color="#6aa6ff" />
        <hemisphereLight
          color="#9fc9ff"
          groundColor="#030506"
          intensity={0.15}
        />
        <directionalLight
          position={[90, 120, 80]}
          intensity={0.86}
          color="#7ac8ff"
          castShadow={quality === 'high'}
        />
        <directionalLight
          position={[-90, 58, -74]}
          intensity={0.58}
          color="#d855ff"
        />

        <Suspense fallback={null}>
          <SceneErrorBoundary label="Skybox">
            <Skybox timeOfDay="auto" />
          </SceneErrorBoundary>
        </Suspense>
        <SceneErrorBoundary label="CyberSky">
          <CyberSky />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="HorizonRing">
          <HorizonRing />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveCityInfrastructure">
          <LiveCityInfrastructure />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveBuildings">
          <Suspense fallback={null}>
            <LiveBuildings
              buildings={layout.buildings}
              onBuildingClick={onBuildingClick}
            />
          </Suspense>
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveAgentMarkers">
          <LiveAgentMarkers
            markers={layout.markers}
            onMarkerClick={onBuildingClick}
          />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveNetworkRoutes">
          <LiveNetworkRoutes routes={layout.routes} />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveActivityPulses">
          <LiveActivityPulses
            buildings={layout.buildings}
            pulseAts={pulseAts}
          />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="Atmosphere">
          <Atmosphere />
        </SceneErrorBoundary>
        <SurveyCamera />
      </Canvas>
      <QualityToggle />
      <LiveCityHud
        counts={counts}
        ownedAgents={layout.ownedAgents}
        generatedAt={generatedAt}
      />
    </div>
  );
}

function SurveyCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(98, 62, 118);
    camera.lookAt(0, 9, 6);
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
      minPolarAngle={0.5}
      maxPolarAngle={1.26}
      target={[0, 9, 6]}
    />
  );
}
