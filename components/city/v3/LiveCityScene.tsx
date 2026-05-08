'use client';
import { MapControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Building2, UserRound, Users, X, Zap } from 'lucide-react';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import {
  layoutLiveCity,
  type LiveAgentMarkerLayout,
  type LiveBuildingLayout,
} from './liveLayout';
import { LiveAgentMarkers } from './LiveAgentMarkers';
import { LiveActivityPulses } from './LiveActivityPulses';
import { LiveBuildings } from './LiveBuildings';
import { LiveCityHud } from './LiveCityHud';
import { LiveCityInfrastructure } from './LiveCityInfrastructure';

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
        routeLimit: 0,
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
        camera={{ position: [72, 56, 88], fov: 46, near: 0.5, far: 900 }}
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
        <fog attach="fog" args={['#bdebf0', 310, 820]} />
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
        <SceneErrorBoundary label="LiveActivityPulses">
          <LiveActivityPulses
            buildings={layout.buildings}
            pulseAts={pulseAts}
          />
        </SceneErrorBoundary>
        <LiveCityPointerTargets
          buildings={layout.buildings}
          markers={layout.markers}
          onBuildingClick={(building) => setSelectedOwnerKey(building.ownerKey)}
          onAgentClick={onAgentClick}
        />
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
    camera.position.set(72, 56, 88);
    camera.lookAt(0, 9, 8);
  }, [camera]);

  return (
    <MapControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enableZoom
      enablePan
      enableRotate
      minDistance={28}
      maxDistance={240}
      minPolarAngle={0.5}
      maxPolarAngle={1.26}
      target={[0, 9, 8]}
    />
  );
}

function LiveCityPointerTargets({
  buildings,
  markers,
  onBuildingClick,
  onAgentClick,
}: {
  buildings: LiveBuildingLayout[];
  markers: LiveAgentMarkerLayout[];
  onBuildingClick: (building: LiveBuildingLayout) => void;
  onAgentClick: (agentId: string) => void;
}) {
  const { camera, gl } = useThree();
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const buildingTargets = useMemo(
    () =>
      buildings.map((building) => {
        const footprint =
          5.6 +
          Math.min(4.2, building.tier * 0.86) +
          Math.min(3.1, Math.log2(building.agentCount + 1) * 0.46);
        return {
          building,
          box: new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(
              building.x,
              Math.max(1.8, building.height / 2),
              building.z,
            ),
            new THREE.Vector3(footprint, Math.max(4.2, building.height), footprint),
          ),
        };
      }),
    [buildings],
  );
  const markerTargets = useMemo(
    () =>
      markers.map((marker) => {
        const footprint = 3.2 + marker.width * 2.2 + marker.tier * 0.24;
        return {
          marker,
          box: new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(marker.x, marker.height / 2 + 0.4, marker.z),
            new THREE.Vector3(footprint, Math.max(4.6, marker.height), footprint),
          ),
        };
      }),
    [markers],
  );

  useEffect(() => {
    const element = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();

    const updateRay = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointerDown.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pointerDown.current;
      pointerDown.current = null;
      if (!start || event.button !== 0) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
        return;
      }

      updateRay(event);

      let bestAgent:
        | { marker: LiveAgentMarkerLayout; distance: number }
        | null = null;
      for (const target of markerTargets) {
        const point = raycaster.ray.intersectBox(target.box, hit);
        if (!point) continue;
        const distance = raycaster.ray.origin.distanceTo(point);
        if (!bestAgent || distance < bestAgent.distance) {
          bestAgent = { marker: target.marker, distance };
        }
      }

      if (bestAgent) {
        event.preventDefault();
        onAgentClick(bestAgent.marker.agentId);
        return;
      }

      let bestBuilding:
        | { building: LiveBuildingLayout; distance: number }
        | null = null;
      for (const target of buildingTargets) {
        const point = raycaster.ray.intersectBox(target.box, hit);
        if (!point) continue;
        const distance = raycaster.ray.origin.distanceTo(point);
        if (!bestBuilding || distance < bestBuilding.distance) {
          bestBuilding = { building: target.building, distance };
        }
      }

      if (bestBuilding) {
        event.preventDefault();
        onBuildingClick(bestBuilding.building);
      }
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointerup', onPointerUp);
    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointerup', onPointerUp);
    };
  }, [buildingTargets, camera, gl, markerTargets, onAgentClick, onBuildingClick]);

  return null;
}
