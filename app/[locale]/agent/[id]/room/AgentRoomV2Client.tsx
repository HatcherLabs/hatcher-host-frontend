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
  integrations?: Array<{ platform?: string; channel?: string; status?: string; enabled?: boolean }>;
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
        ownerIdPreview: data.ownerId ? data.ownerId.slice(0, 8) : null,
        framework: data.framework,
        status: data.status,
        keys: Object.keys(data).sort(),
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

  const connectedIntegrations = useMemo(() => {
    const set = new Set<string>();
    for (const i of agent?.integrations ?? []) {
      const key = (i.platform ?? i.channel ?? '').toLowerCase();
      const on = i.status === 'connected' || i.enabled === true;
      if (on && key) set.add(key);
    }
    return set;
  }, [agent]);

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
