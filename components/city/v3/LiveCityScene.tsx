'use client';
import { MapControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Building2, UserRound, Users, X, Zap } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { useRouter } from '@/i18n/routing';
import type { CityAgent, CityResponse } from '@/components/city/types';
import {
  QualityProvider,
  useQuality,
} from '@/components/city/v2/quality/QualityContext';
import { QualityToggle } from '@/components/city/v2/quality/QualityToggle';
import { SceneErrorBoundary } from '@/components/city/v2/world/SceneErrorBoundary';
import { cityAgentPassportPath, cityBuildingTitle } from './cityNavigation';
import { layoutLiveCity, type LiveBuildingLayout } from './liveLayout';
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
  const openAgentPassport = useCallback(
    (agentId: string) => router.push(cityAgentPassportPath(agentId)),
    [router],
  );

  return (
    <QualityProvider>
      <LiveCitySceneBody
        agents={agents}
        counts={counts ?? EMPTY_COUNTS}
        generatedAt={generatedAt}
        pulseAts={pulseAts}
        onAgentClick={openAgentPassport}
      />
    </QualityProvider>
  );
}

function LiveCitySceneBody({
  agents,
  counts,
  generatedAt,
  pulseAts,
  onAgentClick,
}: Props & {
  counts: CityResponse['counts'];
  onAgentClick: (agentId: string) => void;
}) {
  const quality = useQuality();
  const [selectedOwnerKey, setSelectedOwnerKey] = useState<string | null>(null);
  const layout = useMemo(
    () =>
      layoutLiveCity(agents, {
        maxBuildings: quality === 'high' ? 800 : 420,
        routeLimit: quality === 'high' ? 18 : 10,
      }),
    [agents, quality],
  );
  const selectedBuilding = useMemo(
    () =>
      selectedOwnerKey
        ? (layout.buildings.find(
            (building) => building.ownerKey === selectedOwnerKey,
          ) ?? null)
        : null,
    [layout.buildings, selectedOwnerKey],
  );

  useEffect(() => {
    if (selectedOwnerKey && !selectedBuilding) setSelectedOwnerKey(null);
  }, [selectedBuilding, selectedOwnerKey]);

  return (
    <div className="relative h-full w-full bg-[#8fd3ea]">
      <Canvas
        key={quality}
        camera={{ position: [112, 82, 138], fov: 43, near: 0.5, far: 760 }}
        dpr={quality === 'high' ? [1, 2] : 1}
        gl={{
          antialias: quality === 'high',
          powerPreference: 'high-performance',
        }}
        shadows={quality === 'high'}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = quality === 'high' ? 1.04 : 0.98;
        }}
      >
        <color attach="background" args={['#8fd3ea']} />
        <fog attach="fog" args={['#bdebf0', 150, 560]} />
        <ambientLight intensity={0.68} color="#d8f8ff" />
        <hemisphereLight
          color="#e1fbff"
          groundColor="#31593f"
          intensity={0.86}
        />
        <directionalLight
          position={[90, 120, 80]}
          intensity={1.04}
          color="#fff5d6"
          castShadow={quality === 'high'}
        />
        <directionalLight
          position={[-90, 58, -74]}
          intensity={0.24}
          color="#76c9ff"
        />

        <SceneErrorBoundary label="LiveCityInfrastructure">
          <LiveCityInfrastructure />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveBuildings">
          <Suspense fallback={null}>
            <LiveBuildings
              buildings={layout.buildings}
              onBuildingClick={(building) =>
                setSelectedOwnerKey(building.ownerKey)
              }
            />
          </Suspense>
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveAgentMarkers">
          <LiveAgentMarkers
            markers={layout.markers}
            onMarkerClick={onAgentClick}
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
        <SurveyCamera />
      </Canvas>
      <QualityToggle />
      <LiveCityHud
        counts={counts}
        ownedAgents={layout.ownedAgents}
        generatedAt={generatedAt}
      />
      {selectedBuilding && (
        <LiveBuildingPanel
          building={selectedBuilding}
          onClose={() => setSelectedOwnerKey(null)}
        />
      )}
    </div>
  );
}

const TIER_LABELS = ['Free', 'Starter', 'Pro', 'Business', 'Founding'];

function LiveBuildingPanel({
  building,
  onClose,
}: {
  building: LiveBuildingLayout;
  onClose: () => void;
}) {
  const tierLabel = TIER_LABELS[building.tier] ?? 'User';
  const activeCount = building.activeAgentIds.length;

  return (
    <aside className="pointer-events-auto absolute bottom-5 right-5 z-20 w-[min(340px,calc(100vw-2.5rem))] rounded-[4px] border border-white/18 bg-[#08111a]/88 p-4 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <Building2 size={13} />
            User building
          </div>
          <h2 className="mt-1 truncate text-lg font-semibold leading-tight">
            {cityBuildingTitle(building.ownerUsername)}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border border-white/12 bg-white/5 text-white/80 transition hover:border-white/30 hover:bg-white/10"
          aria-label="Close building panel"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <BuildingStat
          icon={<UserRound size={13} />}
          label="Tier"
          value={tierLabel}
        />
        <BuildingStat
          icon={<Users size={13} />}
          label="Agents"
          value={building.agentCount.toLocaleString()}
        />
        <BuildingStat
          icon={<Zap size={13} />}
          label="Active"
          value={activeCount.toLocaleString()}
        />
      </div>
    </aside>
  );
}

function BuildingStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[3px] border border-white/10 bg-white/[0.055] px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-white/52">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function SurveyCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(112, 82, 138);
    camera.lookAt(0, 8, 6);
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
      target={[0, 8, 6]}
    />
  );
}
