'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { BackToCity } from '@/components/agent-room/v2/hud/BackToCity';
import { WalkOnboarding } from '@/components/agent-room/v2/hud/WalkOnboarding';
import { RoomMinimap } from '@/components/agent-room/v2/hud/RoomMinimap';
import { ProximityHint } from '@/components/agent-room/v2/hud/ProximityHint';
import { getStationLayout, type StationId } from '@/components/agent-room/v2/world/layout';
import { usePanelState } from '@/components/agent-room/v2/hooks/usePanelState';
import { useStationProximity } from '@/components/agent-room/v2/hooks/useStationProximity';
import { ChatPanel } from '@/components/agent-room/v2/panels/ChatPanel';
import { SkillsPanel } from '@/components/agent-room/v2/panels/SkillsPanel';
import { IntegrationsPanel } from '@/components/agent-room/v2/panels/IntegrationsPanel';
import { StatusPanel } from '@/components/agent-room/v2/panels/StatusPanel';
import { LogsPanel } from '@/components/agent-room/v2/panels/LogsPanel';
import { MemoryPanel } from '@/components/agent-room/v2/panels/MemoryPanel';
import { ConfigPanel } from '@/components/agent-room/v2/panels/ConfigPanel';
import { PluginsPanel } from '@/components/agent-room/v2/panels/PluginsPanel';
import { detectDefaultQuality } from '@/components/agent-room/v2/quality';

const AgentRoomSceneV2 = dynamic(
  () => import('@/components/agent-room/v2/AgentRoomSceneV2').then(m => m.AgentRoomSceneV2),
  { ssr: false, loading: () => <div className="h-screen w-screen bg-black" /> }
);

interface Props {
  agentId: string;
}

interface AgentWithExtras {
  id?: string;
  ownerId?: string;
  framework?: string;
  status?: string;
  tier?: string;
  uptimeSec?: number;
  messageCountToday?: number;
  config?: Record<string, unknown>;
}

// Same extraction the legacy /room uses — integrations live inside config
// under several shapes depending on framework. Returns a Set of lowercase
// channel keys ('telegram', 'discord', 'twitter', etc.) that look wired up.
function extractConnectedIntegrations(config: Record<string, unknown> | undefined): Set<string> {
  const enabled = new Set<string>();
  if (!config) return enabled;
  for (const field of ['platforms', 'integrations'] as const) {
    const v = config[field];
    if (Array.isArray(v)) {
      for (const item of v) if (typeof item === 'string') enabled.add(item.toLowerCase());
    } else if (v && typeof v === 'object') {
      for (const [k, cv] of Object.entries(v as Record<string, unknown>)) {
        if (cv && typeof cv === 'object' && (cv as { enabled?: boolean }).enabled) enabled.add(k.toLowerCase());
      }
    }
  }
  const channelSettings = config.channelSettings;
  if (channelSettings && typeof channelSettings === 'object') {
    for (const k of Object.keys(channelSettings as Record<string, unknown>)) enabled.add(k.toLowerCase());
  }
  for (const k of Object.keys(config)) {
    const m = k.match(/^([A-Z]+)_BOT_TOKEN$/);
    if (m && config[k]) enabled.add(m[1]!.toLowerCase());
  }
  return enabled;
}

// Stations that need edit rights. AgentAvatar (chat), LogWall, StatsHologram stay
// public — reading the agent's state is fine for anyone allowed on the page.
const OWNER_ONLY: Set<StationId> = new Set([
  'skillWorkbench',
  'integrationsRack',
  'statusConsole',
  'memoryShelves',
  'configTerminal',
  'pluginsCabinet',
]);

export function AgentRoomV2Client({ agentId }: Props) {
  const { toast } = useToast();
  const [agent, setAgent] = useState<AgentWithExtras | null>(null);
  const [framework, setFramework] = useState<string | null>(null);
  const [hasMemory, setHasMemory] = useState(false);
  const [pluginsInstalled, setPluginsInstalled] = useState(0);
  const [quality] = useState(() => detectDefaultQuality());
  const posRef = useRef(new THREE.Vector3());
  const { openPanel, setOpenPanel, close } = usePanelState();

  // GET /agents/:id strips ownerId for non-owners (backend decides based on
  // auth cookie/token). The mere presence of ownerId = you are the owner —
  // no client-side comparison needed. Matches the legacy /room logic.
  const canEdit = typeof agent?.ownerId === 'string' && agent.ownerId.length > 0;

  const loadAgent = useCallback(async () => {
    try {
      const res = await api.getAgent(agentId);
      if (!res.success) {
        // eslint-disable-next-line no-console
        console.warn('[room-v2] getAgent failed', res);
        setFramework(prev => prev ?? 'openclaw');
        return;
      }
      const data = res.data as unknown as AgentWithExtras;
      // eslint-disable-next-line no-console
      console.log('[room-v2] agent loaded', {
        hasOwnerId: typeof data.ownerId === 'string',
        framework: data.framework,
        keyList: Object.keys(data).sort().join(','),
      });
      // Cross-check: does /auth/me identify the same user from this page?
      // If this returns success but getAgent shows hasOwnerId=false, then
      // the user IS logged in but the agent request is somehow losing the
      // auth signal.
      api.getProfile().then((p) => {
        // eslint-disable-next-line no-console
        console.log('[room-v2] /auth/me from same context', {
          success: p.success,
          userId: p.success ? p.data.id.slice(0, 8) : null,
          email: p.success ? p.data.email : null,
        });
      }).catch(() => {
        // eslint-disable-next-line no-console
        console.log('[room-v2] /auth/me threw');
      });
      setAgent(data);
      setFramework(data.framework ?? 'openclaw');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[room-v2] getAgent threw', e);
      setFramework(prev => prev ?? 'openclaw');
    }
  }, [agentId]);

  useEffect(() => {
    loadAgent();
    const t = setInterval(loadAgent, 10_000);
    return () => clearInterval(t);
  }, [loadAgent]);

  // One-shot memory probe on mount to decide if the shelves glow brighter.
  useEffect(() => {
    if (!canEdit) return;
    api.getAgentMemory(agentId)
      .then((res) => {
        if (!res.success) { setHasMemory(false); return; }
        const m = res.data as { memoryMd?: string; dailyLogs?: unknown[] };
        const anything = !!(m?.memoryMd && m.memoryMd.length > 20) || !!(m?.dailyLogs && m.dailyLogs.length);
        setHasMemory(anything);
      })
      .catch(() => setHasMemory(false));
  }, [agentId, canEdit]);

  // Plugin count for the cabinet's label ("Plugins · 3").
  useEffect(() => {
    api.getAgentPlugins(agentId)
      .then((res) => {
        if (!res.success) { setPluginsInstalled(0); return; }
        const data = res.data as { installed?: unknown[] };
        setPluginsInstalled(data.installed?.length ?? 0);
      })
      .catch(() => setPluginsInstalled(0));
  }, [agentId]);

  const layout = useMemo(
    () => (framework ? getStationLayout(framework) : null),
    [framework],
  );

  const nearest = useStationProximity(posRef, layout);

  const handleStationClick = useCallback((id: StationId) => {
    if (OWNER_ONLY.has(id) && !canEdit) {
      toast.info('Owner-only — only the agent owner can use this station.');
      return;
    }
    setOpenPanel(id);
  }, [canEdit, setOpenPanel, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && nearest && !openPanel) handleStationClick(nearest);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearest, openPanel, handleStationClick]);

  const connectedIntegrations = useMemo(
    () => extractConnectedIntegrations(agent?.config),
    [agent?.config],
  );

  if (!framework || !layout) return <div className="h-screen w-screen bg-black" />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <AgentRoomSceneV2
        agentId={agentId}
        framework={framework}
        posRef={posRef}
        status={agent?.status ?? 'unknown'}
        tier={agent?.tier}
        messagesToday={agent?.messageCountToday}
        uptimeSec={agent?.uptimeSec}
        connectedIntegrations={connectedIntegrations}
        pluginsInstalled={pluginsInstalled}
        nearest={nearest}
        canEdit={canEdit}
        hasMemory={hasMemory}
        quality={quality}
        onStationClick={handleStationClick}
        onStatusChange={loadAgent}
      />

      <BackToCity />
      <RoomMinimap layout={layout} playerPos={posRef} framework={framework} />
      <ProximityHint nearest={openPanel ? null : nearest} />
      <WalkOnboarding />

      {openPanel === 'agentAvatar' && (
        <ChatPanel agentId={agentId} framework={framework} onClose={close} />
      )}
      {openPanel === 'skillWorkbench' && canEdit && (
        <SkillsPanel agentId={agentId} framework={framework} onClose={close} />
      )}
      {openPanel === 'integrationsRack' && canEdit && (
        <IntegrationsPanel
          agentId={agentId}
          framework={framework}
          connected={connectedIntegrations}
          onClose={close}
        />
      )}
      {openPanel === 'statusConsole' && canEdit && (
        <StatusPanel
          agentId={agentId}
          framework={framework}
          status={agent?.status ?? 'unknown'}
          uptimeSec={agent?.uptimeSec}
          messagesToday={agent?.messageCountToday}
          tier={agent?.tier}
          onAction={loadAgent}
          onClose={close}
        />
      )}
      {openPanel === 'logWall' && (
        <LogsPanel agentId={agentId} framework={framework} onClose={close} />
      )}
      {openPanel === 'memoryShelves' && canEdit && (
        <MemoryPanel agentId={agentId} framework={framework} onClose={close} />
      )}
      {openPanel === 'configTerminal' && canEdit && (
        <ConfigPanel agentId={agentId} framework={framework} onClose={close} />
      )}
      {openPanel === 'pluginsCabinet' && canEdit && (
        <PluginsPanel agentId={agentId} framework={framework} onClose={close} />
      )}
    </div>
  );
}
