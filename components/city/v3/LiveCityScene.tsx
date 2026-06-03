'use client';
import { MapControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import {
  ArrowLeft,
  Bot,
  Building2,
  DoorOpen,
  Footprints,
  Map as MapIcon,
  MessageSquare,
  Signal,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { Link } from '@/i18n/routing';
import { useRouter } from '@/i18n/routing';
import type { CityAgent, CityResponse, CityUser } from '@/components/city/types';
import { MobileJoystick } from '@/components/city/v2/character/MobileJoystick';
import {
  QualityProvider,
  useQuality,
  useQualityControl,
} from '@/components/city/v2/quality/QualityContext';
import { QualityToggle } from '@/components/city/v2/quality/QualityToggle';
import { SceneErrorBoundary } from '@/components/city/v2/world/SceneErrorBoundary';
import {
  MobileSceneActionButton,
  MobileSceneMenu,
} from '@/components/mobile-scene/MobileSceneControls';
import {
  agentRoomFromBuildingHref,
  buildingPanelEnterLabel,
  cityBuildingHref,
  cityBuildingTitle,
  isViewerBuilding,
} from './cityNavigation';
import { cityAgentDisplayName } from './cityDisplay';
import { agentFocusTargetFor, type AgentFocusTarget } from './agentFocusTarget';
import { publicAgentChatHref } from './activeAgentList';
import { LIVE_CITY_TIERS, type LiveCityGrid, type LiveCityTimeMode } from './liveCityHandoff';
import { layoutLiveCity, type LiveAgentMarkerLayout, type LiveBuildingLayout } from './liveLayout';
import { LiveAgentMarkers } from './LiveAgentMarkers';
import { LiveActivityPulses } from './LiveActivityPulses';
import { LiveBuildings } from './LiveBuildings';
import { LiveCityHud } from './LiveCityHud';
import { DispatchCouriers } from './dispatch/DispatchCouriers';
import { DispatchHud } from './dispatch/DispatchHud';
import { useAuth } from '@/lib/auth-context';
import { LiveCityInfrastructure } from './LiveCityInfrastructure';
import {
  makeLiveAgentLoopPath,
  sampleLiveAgentPath,
  type LiveAgentPose,
} from './liveAgentMotion';
import {
  createAgentColliders,
  createWalkCollisionMap,
  resolveWalkPosition,
  SURVEY_FOV,
  WALK_EYE_HEIGHT,
  WALK_FOV,
  WALK_SPEED,
} from './walkCollision';

interface Props {
  agents: CityAgent[];
  users?: CityUser[];
  counts: CityResponse['counts'] | null;
  generatedAt?: string | null;
  pulseAts: Map<string, number>;
  canEnterBuilding?: boolean;
  viewerUsername?: string | null;
}

const EMPTY_COUNTS: CityResponse['counts'] = {
  total: 0,
  running: 0,
  users: 0,
  byFramework: { openclaw: 0, hermes: 0 },
  byCategory: {} as CityResponse['counts']['byCategory'],
};

const CITY_CAMERA_FAR = 3_000;

const CITY_LIGHTING: Record<
  LiveCityTimeMode,
  {
    background: string;
    fog: string;
    fogNear: number;
    fogFar: number;
    exposure: number;
    ambient: number;
    hemi: number;
    hemiSky: string;
    hemiGround: string;
    sun: number;
    sunColor: string;
  }
> = {
  day: {
    background: '#e5edf4',
    fog: '#dce8f0',
    fogNear: 340,
    fogFar: 980,
    exposure: 1.16,
    ambient: 0.86,
    hemi: 0.98,
    hemiSky: '#ffffff',
    hemiGround: '#7ca568',
    sun: 1.32,
    sunColor: '#fff5e0',
  },
  night: {
    background: '#111a30',
    fog: '#162038',
    fogNear: 250,
    fogFar: 820,
    exposure: 0.98,
    ambient: 0.24,
    hemi: 0.38,
    hemiSky: '#9bb8ff',
    hemiGround: '#182314',
    sun: 0.28,
    sunColor: '#9fb8ff',
  },
};

function getCityTimeMode(date = new Date()): LiveCityTimeMode {
  const hour = date.getHours();
  return hour >= 6 && hour < 21 ? 'day' : 'night';
}

function useCityTimeMode(): LiveCityTimeMode {
  const [timeMode, setTimeMode] = useState<LiveCityTimeMode>(() => getCityTimeMode());

  useEffect(() => {
    const update = () => setTimeMode(getCityTimeMode());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return timeMode;
}

export function LiveCityScene({
  agents,
  users = [],
  counts,
  generatedAt,
  pulseAts,
  canEnterBuilding = false,
  viewerUsername = null,
}: Props) {
  const router = useRouter();
  const buildingHref = cityBuildingHref();

  return (
    <QualityProvider>
      <LiveCitySceneBody
        agents={agents}
        users={users}
        counts={counts ?? EMPTY_COUNTS}
        generatedAt={generatedAt}
        pulseAts={pulseAts}
        onDashboardClick={(agentId) => router.push(agentRoomFromBuildingHref(agentId))}
        onPublicChatClick={(href) => router.push(href)}
        canEnterBuilding={canEnterBuilding}
        viewerUsername={viewerUsername}
        onBuildingEnterClick={() => router.push(buildingHref)}
      />
    </QualityProvider>
  );
}

function LiveCitySceneBody({
  agents,
  users = [],
  counts,
  generatedAt,
  pulseAts,
  canEnterBuilding = false,
  viewerUsername = null,
  onDashboardClick,
  onPublicChatClick,
  onBuildingEnterClick,
}: Props & {
  counts: CityResponse['counts'];
  onDashboardClick: (agentId: string) => void;
  onPublicChatClick: (href: string) => void;
  onBuildingEnterClick: () => void;
}) {
  const quality = useQuality();
  const qualityControl = useQualityControl();
  const { isAuthenticated } = useAuth();
  const timeMode = useCityTimeMode();
  const lighting = CITY_LIGHTING[timeMode];
  const [viewMode, setViewMode] = useState<'survey' | 'walk'>('survey');
  const [selectedOwnerKey, setSelectedOwnerKey] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [cameraFocus, setCameraFocus] = useState<AgentFocusTarget | null>(null);
  const agentPosesRef = useRef<Map<string, LiveAgentPose>>(new Map());
  const mobileWalkVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const layout = useMemo(
    () =>
      layoutLiveCity(agents, {
        maxBuildings: Math.max(2_500, users.length),
        routeLimit: 0,
        users,
      }),
    [agents, users],
  );
  const selectedBuilding = useMemo(
    () =>
      selectedOwnerKey
        ? (layout.buildings.find((building) => building.ownerKey === selectedOwnerKey) ?? null)
        : null,
    [layout.buildings, selectedOwnerKey],
  );
  const selectedAgent = useMemo(
    () =>
      selectedAgentId
        ? (layout.markers.find((marker) => marker.agentId === selectedAgentId) ?? null)
        : null,
    [layout.markers, selectedAgentId],
  );
  const viewerOwnerKey = useMemo(
    () => users.find((user) => user.mine)?.ownerKey ?? agents.find((agent) => agent.mine)?.ownerKey,
    [agents, users],
  );
  const myBuilding = useMemo(
    () =>
      layout.buildings.find((building) =>
        isViewerBuilding({
          buildingMine: building.mine,
          buildingOwnerKey: building.ownerKey,
          buildingOwnerUsername: building.ownerUsername,
          viewerOwnerKey,
          viewerUsername,
        }),
      ) ?? null,
    [layout.buildings, viewerOwnerKey, viewerUsername],
  );
  const selectedBuildingIsMine = selectedBuilding
    ? isViewerBuilding({
        buildingMine: selectedBuilding.mine,
        buildingOwnerKey: selectedBuilding.ownerKey,
        buildingOwnerUsername: selectedBuilding.ownerUsername,
        viewerOwnerKey,
        viewerUsername,
      })
    : false;
  const focusTarget = cameraFocus;

  useEffect(() => {
    if (selectedOwnerKey && !selectedBuilding) setSelectedOwnerKey(null);
  }, [selectedBuilding, selectedOwnerKey]);

  useEffect(() => {
    if (selectedAgentId && !selectedAgent) setSelectedAgentId(null);
  }, [selectedAgent, selectedAgentId]);

  const focusMyBuilding = () => {
    if (!myBuilding) return;
    setViewMode('survey');
    setSelectedAgentId(null);
    setSelectedOwnerKey(myBuilding.ownerKey);
    setCameraFocus({
      key: `building:${myBuilding.ownerKey}:${Date.now()}`,
      x: myBuilding.x,
      z: myBuilding.z,
      height: myBuilding.height,
    });
  };
  const focusAgentMarker = (agentId: string) => {
    const marker = layout.markers.find((candidate) => candidate.agentId === agentId);
    if (!marker) return;
    setViewMode('survey');
    setSelectedOwnerKey(null);
    setSelectedAgentId(marker.agentId);
    setCameraFocus(
      agentFocusTargetFor(marker, agentPosesRef.current.get(marker.agentId)),
    );
  };
  const selectedAgentChatHref = selectedAgent ? publicAgentChatHref(selectedAgent) : null;
  const mobilePrimaryAction =
    selectedBuilding && selectedBuildingIsMine && canEnterBuilding
      ? {
          label: 'Enter',
          onClick: onBuildingEnterClick,
        }
      : selectedAgent && selectedAgent.mine
        ? {
            label: 'Room',
            onClick: () => onDashboardClick(selectedAgent.dashboardAgentId ?? selectedAgent.agentId),
          }
        : selectedAgentChatHref
          ? {
              label: 'Chat',
              onClick: () => onPublicChatClick(selectedAgentChatHref),
            }
        : null;

  return (
    <div className="relative h-full w-full" style={{ background: lighting.background }}>
      <Canvas
        key={`${quality}-${timeMode}`}
        camera={{
          position: [85, 75, 95],
          fov: 45,
          near: 0.5,
          far: CITY_CAMERA_FAR,
        }}
        dpr={quality === 'high' ? [1, 2] : 1}
        gl={{
          antialias: quality === 'high',
          powerPreference: 'high-performance',
        }}
        shadows={quality === 'high'}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping;
          gl.toneMappingExposure = lighting.exposure;
        }}
      >
        <color attach="background" args={[lighting.background]} />
        <fog attach="fog" args={[lighting.fog, lighting.fogNear, lighting.fogFar]} />
        <ambientLight intensity={lighting.ambient} color="#ffffff" />
        <hemisphereLight
          color={lighting.hemiSky}
          groundColor={lighting.hemiGround}
          intensity={lighting.hemi}
        />
        <directionalLight
          position={[90, 120, 80]}
          intensity={lighting.sun}
          color={lighting.sunColor}
          castShadow={quality === 'high'}
        />

        <SceneErrorBoundary label="LiveCityInfrastructure">
          <LiveCityInfrastructure grid={layout.grid} timeMode={timeMode} />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveBuildings">
          <Suspense fallback={null}>
            <LiveBuildings
              buildings={layout.buildings}
              timeMode={timeMode}
              onBuildingClick={(building) => {
                setSelectedAgentId(null);
                setSelectedOwnerKey(building.ownerKey);
              }}
            />
          </Suspense>
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveAgentMarkers">
          <LiveAgentMarkers
            markers={layout.markers}
            poseRef={agentPosesRef}
            onMarkerClick={(agentId) => {
              setSelectedOwnerKey(null);
              setSelectedAgentId(agentId);
            }}
          />
        </SceneErrorBoundary>
        <SceneErrorBoundary label="LiveActivityPulses">
          <LiveActivityPulses buildings={layout.buildings} pulseAts={pulseAts} />
        </SceneErrorBoundary>
        <LiveCityPointerTargets
          buildings={layout.buildings}
          markers={layout.markers}
          onBuildingClick={(building) => {
            setSelectedAgentId(null);
            setSelectedOwnerKey(building.ownerKey);
          }}
          onAgentClick={(agentId) => {
            setSelectedOwnerKey(null);
            setSelectedAgentId(agentId);
          }}
        />
        {isAuthenticated && (
          <SceneErrorBoundary label="DispatchCouriers">
            <DispatchCouriers />
          </SceneErrorBoundary>
        )}
        {viewMode === 'survey' ? (
          <SurveyCamera grid={layout.grid} focusTarget={focusTarget} />
        ) : null}
        <WalkCameraController
          enabled={viewMode === 'walk'}
          grid={layout.grid}
          buildings={layout.buildings}
          markers={layout.markers}
          mobileAnalog={mobileWalkVector.current}
        />
        {/* Phase 1 polish: selective bloom makes the city's emissive elements
            (beacons, lit windows, agent halos/trails, signal packets — all
            rendered with toneMapped=false) actually GLOW, turning the flat
            diorama into a living neon grid. Plus a subtle vignette to frame it.
            Disabled on 'low' quality to protect weak/mobile GPUs. */}
        {quality !== 'low' ? (
          <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
            <Bloom
              mipmapBlur
              luminanceThreshold={0.62}
              luminanceSmoothing={0.2}
              intensity={0.85}
              radius={0.6}
            />
            <Vignette eskil={false} offset={0.32} darkness={0.55} />
          </EffectComposer>
        ) : null}
      </Canvas>
      <div className="hidden md:block">
        <QualityToggle />
      </div>
      <div className="hidden md:block">
        <CityModeToggle
          viewMode={viewMode}
          timeMode={timeMode}
          onToggle={() => setViewMode((mode) => (mode === 'walk' ? 'survey' : 'walk'))}
        />
      </div>
      <LiveCityHud
        counts={counts}
        ownedAgents={layout.ownedAgents}
        activeAgents={layout.markers}
        generatedAt={generatedAt}
        hasMyBuilding={canEnterBuilding || myBuilding !== null}
        onMyBuildingClick={onBuildingEnterClick}
        onFindMyBuildingClick={myBuilding ? focusMyBuilding : undefined}
        onAgentViewClick={focusAgentMarker}
      />
      {isAuthenticated && (
        <DispatchHud
          grid={layout.grid}
          ownedAgents={layout.ownedAgents}
          agentPosesRef={agentPosesRef}
        />
      )}
      {selectedBuilding && (
        <LiveBuildingPanel
          building={selectedBuilding}
          canEnterBuilding={canEnterBuilding}
          isViewerBuilding={selectedBuildingIsMine}
          onClose={() => setSelectedOwnerKey(null)}
          onBuildingEnterClick={onBuildingEnterClick}
        />
      )}
      {selectedAgent && (
        <LiveAgentPanel
          marker={selectedAgent}
          onClose={() => setSelectedAgentId(null)}
          onDashboardClick={onDashboardClick}
        />
      )}
      <LiveCityMobileMenu
        counts={counts}
        ownedAgents={layout.ownedAgents}
        activeAgents={layout.markers}
        generatedAt={generatedAt}
        viewMode={viewMode}
        timeMode={timeMode}
        qualityOverride={qualityControl.override}
        onQualityChange={qualityControl.setQuality}
        hasMyBuilding={canEnterBuilding || myBuilding !== null}
        onMyBuildingClick={onBuildingEnterClick}
        onFindMyBuildingClick={myBuilding ? focusMyBuilding : undefined}
        onAgentViewClick={focusAgentMarker}
        onToggleViewMode={() => setViewMode((mode) => (mode === 'walk' ? 'survey' : 'walk'))}
      />
      {viewMode === 'walk' && (
        <MobileJoystick
          onVector={(x, y) => {
            mobileWalkVector.current.x = x;
            mobileWalkVector.current.y = y;
          }}
        />
      )}
      {mobilePrimaryAction && (
        <MobileSceneActionButton
          label={mobilePrimaryAction.label}
          onClick={mobilePrimaryAction.onClick}
        />
      )}
    </div>
  );
}

function LiveCityMobileMenu({
  counts,
  ownedAgents,
  generatedAt,
  viewMode,
  timeMode,
  qualityOverride,
  hasMyBuilding,
  onMyBuildingClick,
  onFindMyBuildingClick,
  onToggleViewMode,
  onQualityChange,
}: {
  counts: CityResponse['counts'];
  ownedAgents: CityAgent[];
  activeAgents: LiveAgentMarkerLayout[];
  generatedAt?: string | null;
  viewMode: 'survey' | 'walk';
  timeMode: LiveCityTimeMode;
  qualityOverride: 'auto' | 'high' | 'low';
  hasMyBuilding: boolean;
  onMyBuildingClick: () => void;
  onFindMyBuildingClick?: () => void;
  onAgentViewClick: (agentId: string) => void;
  onToggleViewMode: () => void;
  onQualityChange: (quality: 'auto' | 'high' | 'low') => void;
}) {
  const topOwned = ownedAgents
    .sort((a, b) => Number(b.status === 'running') - Number(a.status === 'running'))
    .slice(0, 4);

  return (
    <MobileSceneMenu
      title="Live Agent Network"
      subtitle={`${counts?.users ?? 0} users · ${counts?.total ?? 0} total agents · ${counts?.running ?? 0} active${
        generatedAt ? ` · ${new Date(generatedAt).toLocaleTimeString()}` : ''
      }`}
      tone="cool"
    >
      <Link
        href="/"
        className="inline-flex w-full items-center justify-center gap-2 rounded-[7px] border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-white"
      >
        <ArrowLeft size={15} />
        Back to site
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onToggleViewMode}
          className="rounded-[7px] border border-white/12 bg-white/[0.06] px-3 py-2 text-left text-sm font-semibold text-white"
        >
          {viewMode === 'walk' ? 'Map view' : 'Walk mode'}
          <span className="mt-1 block text-[11px] font-normal text-white/55">{timeMode}</span>
        </button>
        <Link
          href="/create"
          className="rounded-[7px] border border-emerald-300/25 bg-emerald-300 px-3 py-2 text-sm font-semibold text-black"
        >
          Create agent
        </Link>
      </div>

      <div className="grid gap-2">
        {hasMyBuilding && (
          <button
            type="button"
            onClick={onMyBuildingClick}
            className="rounded-[7px] border border-amber-300/35 bg-amber-300 px-3 py-2 text-left text-sm font-semibold text-black"
          >
            Go to building
          </button>
        )}
        {onFindMyBuildingClick && (
          <button
            type="button"
            onClick={onFindMyBuildingClick}
            className="rounded-[7px] border border-white/12 bg-white/[0.06] px-3 py-2 text-left text-sm font-semibold text-white"
          >
            Find my building
          </button>
        )}
      </div>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          Quality
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['auto', 'high', 'low'] as const).map((quality) => (
            <button
              key={quality}
              type="button"
              onClick={() => onQualityChange(quality)}
              className={`rounded-[7px] border px-3 py-2 text-xs font-semibold uppercase ${
                qualityOverride === quality
                  ? 'border-amber-300 bg-amber-300 text-black'
                  : 'border-white/12 bg-white/[0.05] text-white/72'
              }`}
            >
              {quality}
            </button>
          ))}
        </div>
      </div>

      {topOwned.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              My agents
            </div>
            <Link href="/dashboard/agents" className="text-xs text-cyan-200">
              Dashboard
            </Link>
          </div>
          <div className="grid gap-1.5">
            {topOwned.map((agent) => (
              <Link
                key={agent.id}
                href={agentRoomFromBuildingHref(agent.dashboardAgentId ?? agent.id)}
                className="rounded-[7px] border border-white/10 bg-white/[0.045] px-3 py-2"
              >
                <span className="block truncate text-sm font-medium text-white">
                  {cityAgentDisplayName(agent)}
                </span>
                <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-white/48">
                  {agent.framework} · {labelAgentStatus(agent.status)} · View
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </MobileSceneMenu>
  );
}

function LiveBuildingPanel({
  building,
  canEnterBuilding,
  isViewerBuilding: isViewerBuildingOwner,
  onClose,
  onBuildingEnterClick,
}: {
  building: LiveBuildingLayout;
  canEnterBuilding: boolean;
  isViewerBuilding: boolean;
  onClose: () => void;
  onBuildingEnterClick: () => void;
}) {
  const tierLabel = LIVE_CITY_TIERS[building.tierKey].label;
  const activeCount = building.activeAgentCount;
  const enterLabel = buildingPanelEnterLabel({
    canEnterBuilding,
    isMyBuilding: isViewerBuildingOwner,
  });

  return (
    <aside className="pointer-events-auto absolute bottom-24 left-3 right-3 z-20 rounded-[4px] border border-white/18 bg-[#08111a]/88 p-4 text-white shadow-2xl backdrop-blur-xl md:bottom-5 md:left-auto md:right-5 md:w-[min(340px,calc(100vw-2.5rem))]">
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
        <BuildingStat icon={<UserRound size={13} />} label="Tier" value={tierLabel} />
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

      {enterLabel && (
        <button
          type="button"
          onClick={onBuildingEnterClick}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[4px] border border-emerald-300/30 bg-emerald-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-200"
        >
          <DoorOpen size={14} />
          {enterLabel}
        </button>
      )}
    </aside>
  );
}

function BuildingStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[3px] border border-white/10 bg-white/[0.055] px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-white/52">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function LiveAgentPanel({
  marker,
  onClose,
  onDashboardClick,
}: {
  marker: LiveAgentMarkerLayout;
  onClose: () => void;
  onDashboardClick: (agentId: string) => void;
}) {
  const owner = marker.ownerUsername?.trim() || 'Builder';
  const chatHref = publicAgentChatHref(marker);
  const displayName = cityAgentDisplayName(marker);

  return (
    <aside className="pointer-events-auto absolute bottom-24 left-3 right-3 z-20 rounded-[4px] border border-white/18 bg-[#08111a]/88 p-4 text-white shadow-2xl backdrop-blur-xl md:bottom-5 md:left-auto md:right-5 md:w-[min(320px,calc(100vw-2.5rem))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            <Bot size={13} />
            Active agent
          </div>
          <h2 className="mt-1 truncate text-lg font-semibold leading-tight">{displayName}</h2>
          <p className="mt-1 truncate text-xs text-white/58">{owner}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border border-white/12 bg-white/5 text-white/80 transition hover:border-white/30 hover:bg-white/10"
          aria-label="Close agent panel"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <BuildingStat
          icon={<Signal size={13} />}
          label="Status"
          value={labelAgentStatus(marker.status)}
        />
        <BuildingStat icon={<Zap size={13} />} label="Framework" value={marker.framework} />
      </div>

      {marker.mine && (
        <button
          type="button"
          onClick={() => onDashboardClick(marker.dashboardAgentId ?? marker.agentId)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[4px] border border-emerald-300/30 bg-emerald-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-200"
        >
          <DoorOpen size={14} />
          Open room
        </button>
      )}
      {chatHref && (
        <Link
          href={chatHref}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[4px] border border-emerald-300/30 bg-emerald-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-200"
        >
          <MessageSquare size={14} />
          Chat
        </Link>
      )}
    </aside>
  );
}

function CityModeToggle({
  viewMode,
  timeMode,
  onToggle,
}: {
  viewMode: 'survey' | 'walk';
  timeMode: LiveCityTimeMode;
  onToggle: () => void;
}) {
  const isWalk = viewMode === 'walk';

  return (
    <div className="pointer-events-auto absolute right-3 top-[102px] z-20 flex items-center gap-2 rounded-[6px] border border-amber-300/40 bg-[#050814]/75 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-300 backdrop-blur">
      <span className="text-amber-300/70">{timeMode}</span>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 rounded-[3px] border border-amber-300 px-2 py-1 text-amber-300 transition hover:bg-amber-300 hover:text-black"
        aria-pressed={isWalk}
      >
        {isWalk ? <MapIcon size={13} /> : <Footprints size={13} />}
        {isWalk ? 'Map' : 'Walk'}
      </button>
    </div>
  );
}

function labelAgentStatus(status: CityAgent['status']): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    case 'crashed':
      return 'Needs attention';
    case 'sleeping':
      return 'Sleeping';
  }
}

function SurveyCamera({
  grid,
  focusTarget,
}: {
  grid: LiveCityGrid;
  focusTarget: AgentFocusTarget | null;
}) {
  const { camera } = useThree();
  const mapTarget = useMemo<[number, number, number]>(
    () =>
      focusTarget
        ? [focusTarget.x, Math.min(12, focusTarget.height * 0.36), focusTarget.z]
        : [0, 0, 0],
    [focusTarget],
  );

  useEffect(() => {
    const span = Math.max(95, grid.bounds.width * 0.48);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = SURVEY_FOV;
      camera.near = 0.2;
      camera.far = Math.max(CITY_CAMERA_FAR, grid.bounds.width * 5);
      camera.updateProjectionMatrix();
    }
    if (focusTarget) {
      const distance = Math.max(34, Math.min(82, focusTarget.height * 2.4 + 24));
      const y = Math.max(18, focusTarget.height + 12, distance * 0.64);
      camera.position.set(focusTarget.x + distance * 0.82, y, focusTarget.z + distance * 1.04);
      camera.lookAt(mapTarget[0], mapTarget[1], mapTarget[2]);
      return;
    }
    camera.position.set(span, span * 0.82, span * 1.12);
    camera.lookAt(mapTarget[0], mapTarget[1], mapTarget[2]);
  }, [camera, focusTarget, grid.bounds.width, mapTarget]);

  return (
    <MapControls
      key={focusTarget?.key ?? 'city-survey'}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enableZoom
      enablePan
      enableRotate
      minDistance={28}
      maxDistance={Math.max(220, grid.bounds.width * 1.4)}
      minPolarAngle={0.24}
      maxPolarAngle={Math.PI * 0.48}
      target={mapTarget}
    />
  );
}

function WalkCameraController({
  enabled,
  grid,
  buildings,
  markers,
  mobileAnalog,
}: {
  enabled: boolean;
  grid: LiveCityGrid;
  buildings: LiveBuildingLayout[];
  markers: LiveAgentMarkerLayout[];
  mobileAnalog?: { x: number; y: number };
}) {
  const { camera, gl } = useThree();
  const keysRef = useRef(new Set<string>());
  const draggingRef = useRef(false);
  const yawRef = useRef(0);
  const pitchRef = useRef(-0.04);
  const scratchForward = useMemo(() => new THREE.Vector3(), []);
  const scratchRight = useMemo(() => new THREE.Vector3(), []);
  const scratchMove = useMemo(() => new THREE.Vector3(), []);
  const scratchEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const collisionMap = useMemo(() => createWalkCollisionMap(grid, buildings), [buildings, grid]);
  const markerPaths = useMemo(
    () =>
      new Map(
        markers.map((marker) => [
          marker.agentId,
          makeLiveAgentLoopPath(marker.pathNodes, marker.x, marker.z),
        ]),
      ),
    [markers],
  );

  useEffect(() => {
    if (!enabled) return;
    const startZ = Math.min(grid.half + 10, collisionMap.bounds - 2);
    camera.position.set(0, WALK_EYE_HEIGHT, startZ);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = WALK_FOV;
      camera.near = 0.05;
      camera.updateProjectionMatrix();
    }
    yawRef.current = 0;
    pitchRef.current = -0.04;
    scratchEuler.set(pitchRef.current, yawRef.current, 0);
    camera.quaternion.setFromEuler(scratchEuler);
  }, [camera, collisionMap.bounds, enabled, grid.half, scratchEuler]);

  useEffect(() => {
    if (!enabled) {
      keysRef.current.clear();
      draggingRef.current = false;
      return;
    }

    const element = gl.domElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (isWalkKey(event.code)) event.preventDefault();
      keysRef.current.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      draggingRef.current = true;
      element.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      yawRef.current -= event.movementX * 0.004;
      pitchRef.current = Math.max(
        -0.75,
        Math.min(0.35, pitchRef.current - event.movementY * 0.003),
      );
    };
    const stopDrag = (event: PointerEvent) => {
      draggingRef.current = false;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', stopDrag);
    element.addEventListener('pointerleave', stopDrag);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', stopDrag);
      element.removeEventListener('pointerleave', stopDrag);
    };
  }, [enabled, gl]);

  useFrame(({ clock }, delta) => {
    if (!enabled) return;
    const keys = keysRef.current;
    const turnSpeed = 1.8 * delta;
    if (keys.has('ArrowLeft') || keys.has('KeyQ')) yawRef.current += turnSpeed;
    if (keys.has('ArrowRight') || keys.has('KeyE')) yawRef.current -= turnSpeed;

    scratchEuler.set(pitchRef.current, yawRef.current, 0);
    camera.quaternion.setFromEuler(scratchEuler);

    scratchForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    scratchForward.y = 0;
    scratchForward.normalize();
    scratchRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    scratchRight.y = 0;
    scratchRight.normalize();
    scratchMove.set(0, 0, 0);

    if (keys.has('KeyW') || keys.has('ArrowUp')) scratchMove.add(scratchForward);
    if (keys.has('KeyS') || keys.has('ArrowDown')) scratchMove.sub(scratchForward);
    if (keys.has('KeyA')) scratchMove.sub(scratchRight);
    if (keys.has('KeyD')) scratchMove.add(scratchRight);
    if (mobileAnalog && (Math.abs(mobileAnalog.x) > 0.05 || Math.abs(mobileAnalog.y) > 0.05)) {
      scratchMove.addScaledVector(scratchForward, -mobileAnalog.y);
      scratchMove.addScaledVector(scratchRight, mobileAnalog.x);
    }

    if (scratchMove.lengthSq() > 0) {
      const elapsed = clock.elapsedTime;
      scratchMove.normalize().multiplyScalar(WALK_SPEED * delta);
      const previous = {
        x: camera.position.x,
        z: camera.position.z,
      };
      const dynamicColliders = createAgentColliders(markers, (marker) => {
        const path =
          markerPaths.get(marker.agentId) ??
          makeLiveAgentLoopPath(marker.pathNodes, marker.x, marker.z);
        return sampleLiveAgentPath(path, elapsed * marker.speed + marker.phase);
      });
      const next = resolveWalkPosition(
        {
          x: camera.position.x + scratchMove.x,
          z: camera.position.z + scratchMove.z,
        },
        previous,
        collisionMap,
        dynamicColliders,
      );
      camera.position.set(next.x, WALK_EYE_HEIGHT, next.z);
    }
  });

  return null;
}

function isWalkKey(code: string): boolean {
  return [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'KeyQ',
    'KeyE',
  ].includes(code);
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
        const footprint = Math.max(building.visual.width, building.visual.depth) + 1.7;
        return {
          building,
          box: new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(building.x, Math.max(1.8, building.height / 2), building.z),
            new THREE.Vector3(footprint, Math.max(4.2, building.height), footprint),
          ),
        };
      }),
    [buildings],
  );
  const markerTargets = useMemo(
    () =>
      markers.flatMap((marker) => {
        const footprint = 6.2 + marker.width * 1.8;
        const points = marker.pathNodes.flatMap((node, index) => {
          const next = marker.pathNodes[index + 1];
          if (!next) return [{ x: node.x, z: node.z }];
          return [
            { x: node.x, z: node.z },
            { x: (node.x + next.x) / 2, z: (node.z + next.z) / 2 },
          ];
        });
        return points.map((point, index) => ({
          marker,
          box: new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(point.x, 1.8, point.z),
            new THREE.Vector3(footprint, 5.2, footprint),
          ),
          key: `${marker.agentId}-${index}`,
        }));
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

      let bestAgent: {
        marker: LiveAgentMarkerLayout;
        distance: number;
      } | null = null;
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

      let bestBuilding: {
        building: LiveBuildingLayout;
        distance: number;
      } | null = null;
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
