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
import { ChatPanel, type ChatMessage } from '@/components/agent-room/v2/panels/ChatPanel';
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
  name?: string;
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

// Stations that need edit rights. StatsHologram stays public because it only
// exposes the public agent state already visible on the page.
const OWNER_ONLY: Set<StationId> = new Set([
  'agentAvatar',
  'skillWorkbench',
  'integrationsRack',
  'statusConsole',
  'logWall',
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [quality] = useState(() => detectDefaultQuality());
  const posRef = useRef(new THREE.Vector3());
  const saveChatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openPanel, setOpenPanel, close } = usePanelState();

  // GET /agents/:id strips ownerId for non-owners (backend decides based on
  // auth cookie/token). The mere presence of ownerId = you are the owner —
  // no client-side comparison needed. Matches the legacy /room logic.
  const canEdit = typeof agent?.ownerId === 'string' && agent.ownerId.length > 0;

  // URL param may be slug OR id; downstream API calls (memory, plugins, chat
  // history) use only id-keyed lookups, so resolve to canonical id once the
  // agent is loaded. Fall back to URL param while loading.
  const apiId = agent?.id ?? agentId;

  const loadAgent = useCallback(async () => {
    try {
      const res = await api.getAgent(agentId);
      if (!res.success) {
        setFramework(prev => prev ?? 'openclaw');
        return;
      }
      const data = res.data as unknown as AgentWithExtras;
      setAgent(data);
      setFramework(data.framework ?? 'openclaw');
    } catch {
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
    api.getAgentMemory(apiId)
      .then((res) => {
        if (!res.success) { setHasMemory(false); return; }
        const m = res.data as { memoryMd?: string; dailyLogs?: unknown[] };
        const anything = !!(m?.memoryMd && m.memoryMd.length > 20) || !!(m?.dailyLogs && m.dailyLogs.length);
        setHasMemory(anything);
      })
      .catch(() => setHasMemory(false));
  }, [apiId, canEdit]);

  // Plugin count for the cabinet's label ("Plugins · 3").
  useEffect(() => {
    if (!canEdit) {
      setPluginsInstalled(0);
      return;
    }
    api.getAgentPlugins(apiId)
      .then((res) => {
        if (!res.success) { setPluginsInstalled(0); return; }
        const data = res.data as { installed?: unknown[] };
        setPluginsInstalled(data.installed?.length ?? 0);
      })
      .catch(() => setPluginsInstalled(0));
  }, [apiId, canEdit]);

  // Load persisted chat history once per agent. State lives on the
  // client (not inside ChatPanel) so closing / re-opening the panel
  // keeps the conversation visible.
  useEffect(() => {
    if (!apiId || !canEdit) return;
    api.getChatHistory(apiId)
      .then((res) => {
        if (!res.success) return;
        const raw = res.data.messages ?? [];
        const normalized: ChatMessage[] = raw
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            ts: m.ts,
          }));
        setChatMessages(normalized);
      })
      .catch(() => {});
  }, [apiId, canEdit]);

  const appendChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastChatMessage = useCallback((content: string) => {
    setChatMessages((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], content };
      return copy;
    });
  }, []);

  // Debounced save to backend so every streaming token doesn't hit the
  // API. 800ms after the last message mutation settles, persist.
  useEffect(() => {
    if (!canEdit || chatMessages.length === 0) return;
    if (saveChatTimerRef.current) clearTimeout(saveChatTimerRef.current);
    saveChatTimerRef.current = setTimeout(() => {
      const payload = chatMessages
        .filter((m) => m.content.length > 0 && !m.content.startsWith('Error:'))
        .map((m) => ({ role: m.role, content: m.content, ts: m.ts }));
      if (payload.length === 0) return;
      api.saveChatHistory(apiId, payload).catch(() => {});
    }, 800);
    return () => {
      if (saveChatTimerRef.current) clearTimeout(saveChatTimerRef.current);
    };
  }, [chatMessages, apiId, canEdit]);

  const layout = useMemo(
    () => (framework ? getStationLayout(framework) : null),
    [framework],
  );

  const nearest = useStationProximity(posRef, layout);

  const handleStationClick = useCallback((id: StationId) => {
    if (OWNER_ONLY.has(id) && !canEdit) {
      toast.info('Owner-only — sign in as the owner or a team member to use this station.');
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
        agentId={apiId}
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
        agentName={agent?.name}
        isChatStreaming={isChatStreaming}
        onStationClick={handleStationClick}
        onStatusChange={loadAgent}
      />

      <BackToCity agentId={apiId} />
      <RoomMinimap layout={layout} playerPos={posRef} framework={framework} />
      <ProximityHint nearest={openPanel ? null : nearest} />
      <WalkOnboarding />

      {openPanel === 'agentAvatar' && canEdit && (
        <ChatPanel
          agentId={apiId}
          framework={framework}
          messages={chatMessages}
          onAppend={appendChatMessage}
          onUpdateLast={updateLastChatMessage}
          onStreamingChange={setIsChatStreaming}
          onClose={close}
        />
      )}
      {openPanel === 'skillWorkbench' && canEdit && (
        <SkillsPanel agentId={apiId} framework={framework} onClose={close} />
      )}
      {openPanel === 'integrationsRack' && canEdit && (
        <IntegrationsPanel
          agentId={apiId}
          framework={framework}
          connected={connectedIntegrations}
          onClose={close}
        />
      )}
      {openPanel === 'statusConsole' && canEdit && (
        <StatusPanel
          agentId={apiId}
          framework={framework}
          status={agent?.status ?? 'unknown'}
          uptimeSec={agent?.uptimeSec}
          messagesToday={agent?.messageCountToday}
          tier={agent?.tier}
          onAction={loadAgent}
          onClose={close}
        />
      )}
      {openPanel === 'logWall' && canEdit && (
        <LogsPanel agentId={apiId} framework={framework} onClose={close} />
      )}
      {openPanel === 'memoryShelves' && canEdit && (
        <MemoryPanel agentId={apiId} framework={framework} onClose={close} />
      )}
      {openPanel === 'configTerminal' && canEdit && (
        <ConfigPanel agentId={apiId} framework={framework} onClose={close} />
      )}
      {openPanel === 'pluginsCabinet' && canEdit && (
        <PluginsPanel agentId={apiId} framework={framework} onClose={close} />
      )}
    </div>
  );
}
