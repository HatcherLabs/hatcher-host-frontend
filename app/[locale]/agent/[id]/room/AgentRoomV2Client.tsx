'use client';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useToast } from '@/components/ui/ToastProvider';
import { Link, useRouter } from '@/i18n/routing';
import { BackToCity } from '@/components/agent-room/v2/hud/BackToCity';
import { WalkOnboarding } from '@/components/agent-room/v2/hud/WalkOnboarding';
import {
  ProximityHint,
  stationActionLabel,
} from '@/components/agent-room/v2/hud/ProximityHint';
import { ShortcutHud } from '@/components/agent-room/v2/hud/ShortcutHud';
import {
  AvatarEmoteControls,
  AvatarEmoteHud,
} from '@/components/agent-room/v2/hud/AvatarEmoteHud';
import {
  getStationLayout,
  type StationId,
} from '@/components/agent-room/v2/world/layout';
import { usePanelState } from '@/components/agent-room/v2/hooks/usePanelState';
import { useStationProximity } from '@/components/agent-room/v2/hooks/useStationProximity';
import {
  ChatPanel,
  type ChatMessage,
} from '@/components/agent-room/v2/panels/ChatPanel';
import { SkillsPanel } from '@/components/agent-room/v2/panels/SkillsPanel';
import { IntegrationsPanel } from '@/components/agent-room/v2/panels/IntegrationsPanel';
import { StatusPanel } from '@/components/agent-room/v2/panels/StatusPanel';
import { MemoryPanel } from '@/components/agent-room/v2/panels/MemoryPanel';
import { ConfigPanel } from '@/components/agent-room/v2/panels/ConfigPanel';
import { PluginsPanel } from '@/components/agent-room/v2/panels/PluginsPanel';
import { EyesPanel } from '@/components/agent-room/v2/panels/EyesPanel';
import {
  LaptopPanel,
  type LaptopConfigPatch,
  type LaptopTab,
} from '@/components/agent-room/v2/panels/LaptopPanel';
import {
  normalizeRoomEyesLiveFeed,
  normalizeRoomEyesConfig,
  normalizeEyesCaptureTarget,
  DEFAULT_EYES_CAPTURE_URL,
  type RoomEyesLiveScreenshot,
  type RoomEyesLiveState,
  type RoomEyesConfig,
  type RoomEyesAction,
} from '@/components/agent-room/v2/eyes';
import { detectDefaultQuality } from '@/components/agent-room/v2/quality';
import {
  normalizeAvatarVariant,
  type AvatarVariant,
  type RoomEmoteId,
} from '@/components/agent-room/v2/stations/AgentBody';
import { cityBuildingHref } from '@/components/city/v3/cityNavigation';
import {
  MobileSceneActionButton,
  MobileSceneMenu,
} from '@/components/mobile-scene/MobileSceneControls';
import type { AgentPassport } from '@/lib/api';
import { buildFallbackPassport } from '@/lib/agent-passport';

const AgentRoomSceneV2 = dynamic(
  () =>
    import('@/components/agent-room/v2/AgentRoomSceneV2').then(
      (m) => m.AgentRoomSceneV2,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-[11px] uppercase tracking-[0.16em] text-neutral-400">
        Loading room
      </div>
    ),
  },
);

interface Props {
  agentId: string;
}

interface AgentWithExtras {
  id?: string;
  slug?: string | null;
  name?: string;
  description?: string | null;
  avatarUrl?: string | null;
  ownerId?: string;
  framework?: string;
  status?: string;
  tier?: string;
  uptimeSec?: number;
  messageCountToday?: number;
  config?: Record<string, unknown>;
  skaleWalletAddress?: string | null;
  skaleAgentId?: string | null;
  skaleRegisteredAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Same extraction the legacy /room uses — integrations live inside config
// under several shapes depending on framework. Returns a Set of lowercase
// channel keys ('telegram', 'discord', 'twitter', etc.) that look wired up.
function extractConnectedIntegrations(
  config: Record<string, unknown> | undefined,
): Set<string> {
  const enabled = new Set<string>();
  if (!config) return enabled;
  for (const field of ['platforms', 'integrations'] as const) {
    const v = config[field];
    if (Array.isArray(v)) {
      for (const item of v)
        if (typeof item === 'string') enabled.add(item.toLowerCase());
    } else if (v && typeof v === 'object') {
      for (const [k, cv] of Object.entries(v as Record<string, unknown>)) {
        if (
          cv &&
          typeof cv === 'object' &&
          (cv as { enabled?: boolean }).enabled
        )
          enabled.add(k.toLowerCase());
      }
    }
  }
  const channelSettings = config.channelSettings;
  if (channelSettings && typeof channelSettings === 'object') {
    for (const k of Object.keys(channelSettings as Record<string, unknown>))
      enabled.add(k.toLowerCase());
  }
  for (const k of Object.keys(config)) {
    const m = k.match(/^([A-Z]+)_BOT_TOKEN$/);
    if (m && config[k]) enabled.add(m[1]!.toLowerCase());
  }
  return enabled;
}

function normalizeLogLine(entry: unknown): string | null {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return null;
  const record = entry as Record<string, unknown>;
  const timestamp =
    typeof record.timestamp === 'string' ? record.timestamp : '';
  const level =
    typeof record.level === 'string' ? record.level.toUpperCase() : 'INFO';
  const message = typeof record.message === 'string' ? record.message : '';
  if (!message) return null;
  const time = timestamp ? new Date(timestamp) : null;
  const stamp =
    time && !Number.isNaN(time.getTime())
      ? time.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '';
  return `${stamp ? `${stamp} ` : ''}${level} ${message}`;
}

function normalizeLogLines(payload: unknown): string[] {
  const logs = (payload as { logs?: unknown })?.logs;
  if (!Array.isArray(logs)) return [];
  return logs
    .map(normalizeLogLine)
    .filter((line): line is string => !!line)
    .slice(-80);
}

// Stations that need edit rights. StatsHologram stays public because it only
// exposes the public agent state already visible on the page.
const OWNER_ONLY: Set<StationId> = new Set([
  'agentAvatar',
  'skillWorkbench',
  'integrationsRack',
  'statusConsole',
  'eyesConsole',
  'memoryShelves',
  'configTerminal',
  'mailInbox',
  'pluginsCabinet',
]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

export function AgentRoomV2Client({ agentId }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agent, setAgent] = useState<AgentWithExtras | null>(null);
  const [framework, setFramework] = useState<string | null>(null);
  const [hasMemory, setHasMemory] = useState(false);
  const [pluginsInstalled, setPluginsInstalled] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  // Floating chat dock — talk to the agent from anywhere in the room without
  // walking up to it; stays live so async replies surface as an unread badge.
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [passport, setPassport] = useState<AgentPassport | null>(null);
  const [laptopOpen, setLaptopOpen] = useState(false);
  const [laptopInitialTab, setLaptopInitialTab] = useState<LaptopTab>('status');
  const [activeEmote, setActiveEmote] = useState<RoomEmoteId | null>(null);
  const [emoteNonce, setEmoteNonce] = useState(0);
  const [mailAttentionCount, setMailAttentionCount] = useState(0);
  const [tvLogLines, setTvLogLines] = useState<string[]>([]);
  const [eyesSnapshot, setEyesSnapshot] = useState<
    RoomEyesLiveScreenshot | undefined
  >();
  const [eyesState, setEyesState] = useState<RoomEyesLiveState | undefined>();
  const [quality] = useState(() => detectDefaultQuality());
  const posRef = useRef(new THREE.Vector3());
  const saveChatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPassportRequestRef = useRef(false);
  const logsWsRef = useRef<WebSocket | null>(null);
  const logsWsReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logsWsRetryCountRef = useRef(0);
  const { openPanel, setOpenPanel, close } = usePanelState();

  // GET /agents/:id strips ownerId for non-owners (backend decides based on
  // auth cookie/token). The mere presence of ownerId = you are the owner —
  // no client-side comparison needed. Matches the legacy /room logic.
  const canEdit =
    typeof agent?.ownerId === 'string' && agent.ownerId.length > 0;

  // URL param may be slug OR id; downstream API calls (memory, plugins, chat
  // history) use only id-keyed lookups, so resolve to canonical id once the
  // agent is loaded. Fall back to URL param while loading.
  const apiId = agent?.id ?? agentId;
  const fallbackPassport = useMemo(
    () => buildFallbackPassport(agent, apiId),
    [agent, apiId],
  );
  const activePassport = passport ?? fallbackPassport;

  const loadAgent = useCallback(async () => {
    try {
      const res = await api.getAgent(agentId);
      if (!res.success) {
        setFramework((prev) => prev ?? 'openclaw');
        return;
      }
      const data = res.data as unknown as AgentWithExtras;
      setAgent(data);
      setFramework(data.framework ?? 'openclaw');
    } catch {
      setFramework((prev) => prev ?? 'openclaw');
    }
  }, [agentId]);

  useEffect(() => {
    loadAgent();
    const t = setInterval(loadAgent, 10_000);
    return () => clearInterval(t);
  }, [loadAgent]);

  useEffect(() => {
    if (!apiId || !canEdit) {
      setTvLogLines([]);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const streamCapable = ['active', 'running', 'restarting'].includes(
      agent?.status ?? '',
    );

    const loadLogs = () => {
      api
        .getAgentLogs(apiId)
        .then((res) => {
          if (cancelled || !res.success) return;
          setTvLogLines(normalizeLogLines(res.data));
        })
        .catch(() => {
          if (!cancelled) setTvLogLines([]);
        });
    };

    const startPollingFallback = (intervalMs = 5_000) => {
      if (pollTimer) return;
      loadLogs();
      pollTimer = setInterval(loadLogs, intervalMs);
    };

    const stopPollingFallback = () => {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    };

    const connectLogsStream = () => {
      if (cancelled || !streamCapable) return;
      const wsBase = API_URL.replace(/^http/, 'ws');
      const ws = new WebSocket(`${wsBase}/agents/${apiId}/logs/ws`);
      logsWsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            timestamp?: string;
            level?: string;
            message?: string;
          };
          if (msg.type === 'connected') {
            logsWsRetryCountRef.current = 0;
            stopPollingFallback();
            return;
          }
          if (msg.type === 'log') {
            const line = normalizeLogLine({
              timestamp: msg.timestamp,
              level: msg.level,
              message: msg.message,
            });
            if (!line) return;
            setTvLogLines((prev) => [...prev, line].slice(-80));
            return;
          }
          if (msg.type === 'error' || msg.type === 'disconnected') {
            startPollingFallback();
          }
        } catch {
          // Ignore malformed stream frames; the polling fallback keeps the wall alive.
        }
      };

      ws.onerror = () => {
        if (logsWsRef.current === ws) logsWsRef.current = null;
        startPollingFallback();
      };

      ws.onclose = () => {
        if (logsWsRef.current === ws) logsWsRef.current = null;
        if (cancelled) return;
        startPollingFallback();
        const retries = logsWsRetryCountRef.current;
        const delay = Math.min(1_000 * Math.pow(2, retries), 30_000);
        logsWsRetryCountRef.current = retries + 1;
        logsWsReconnectRef.current = setTimeout(connectLogsStream, delay);
      };
    };

    loadLogs();
    logsWsRetryCountRef.current = 0;
    if (streamCapable) connectLogsStream();
    else startPollingFallback(10_000);

    return () => {
      cancelled = true;
      stopPollingFallback();
      if (logsWsReconnectRef.current) {
        clearTimeout(logsWsReconnectRef.current);
        logsWsReconnectRef.current = null;
      }
      if (logsWsRef.current) {
        logsWsRef.current.close();
        logsWsRef.current = null;
      }
    };
  }, [agent?.status, apiId, canEdit]);

  useEffect(() => {
    let cancelled = false;
    api
      .getAgentPassport(apiId)
      .then((res) => {
        if (!cancelled && res.success) setPassport(res.data);
      })
      .catch(() => {
        if (!cancelled) setPassport(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiId]);

  const refreshEyesSnapshot = useCallback(() => {
    if (!apiId || !canEdit) {
      setEyesSnapshot(undefined);
      setEyesState(undefined);
      return;
    }
    return api
      .getAgentEyesLive(apiId, 'pip-1')
      .then((res) => {
        setEyesSnapshot(
          res.success && res.data.screenshot ? res.data.screenshot : undefined,
        );
        setEyesState(
          res.success && res.data.state ? res.data.state : undefined,
        );
      })
      .catch(() => {
        setEyesSnapshot(undefined);
        setEyesState(undefined);
      });
  }, [apiId, canEdit]);

  useEffect(() => {
    if (!apiId || !canEdit) {
      setEyesSnapshot(undefined);
      setEyesState(undefined);
      return;
    }
    let cancelled = false;
    const loadSnapshot = () => {
      api
        .getAgentEyesLive(apiId, 'pip-1')
        .then((res) => {
          if (cancelled) return;
          setEyesSnapshot(
            res.success && res.data.screenshot
              ? res.data.screenshot
              : undefined,
          );
          setEyesState(
            res.success && res.data.state ? res.data.state : undefined,
          );
        })
        .catch(() => {
          if (!cancelled) {
            setEyesSnapshot(undefined);
            setEyesState(undefined);
          }
        });
    };
    loadSnapshot();
    const timer = setInterval(loadSnapshot, 2_500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [apiId, canEdit]);

  const handleEyesStartLive = useCallback(
    async (targetUrl = DEFAULT_EYES_CAPTURE_URL) => {
      if (!canEdit) throw new Error('Owner-only Eyes workspace.');
      const url = normalizeEyesCaptureTarget(targetUrl);
      const res = await api.startAgentEyesLive(apiId, {
        url,
        pipId: 'pip-1',
        intervalMs: 1_000,
        durationMs: 30 * 60_000,
      });
      if (!res.success)
        throw new Error(res.error || 'Could not start live capture.');
      window.setTimeout(() => void refreshEyesSnapshot(), 1_500);
      return undefined;
    },
    [apiId, canEdit, refreshEyesSnapshot],
  );

  const handleEyesAction = useCallback(
    async (action: RoomEyesAction) => {
      if (!canEdit) throw new Error('Owner-only Eyes workspace.');
      const res = await api.sendAgentEyesAction(apiId, action);
      if (!res.success)
        throw new Error(res.error || 'Could not queue Eyes action.');
      window.setTimeout(() => void refreshEyesSnapshot(), 900);
      return undefined;
    },
    [apiId, canEdit, refreshEyesSnapshot],
  );

  const handleEyesStopLive = useCallback(async () => {
    if (!canEdit) throw new Error('Owner-only Eyes workspace.');
    const res = await api.stopAgentEyesLive(apiId, { pipId: 'pip-1' });
    if (!res.success)
      throw new Error(res.error || 'Could not stop Eyes workspace.');
    window.setTimeout(() => void refreshEyesSnapshot(), 500);
    return undefined;
  }, [apiId, canEdit, refreshEyesSnapshot]);

  const refreshMailSummary = useCallback(() => {
    if (!canEdit) {
      setMailAttentionCount(0);
      return;
    }
    api
      .getAgentMailMessages(apiId, { limit: 20 })
      .then((res) => {
        if (!res.success) {
          setMailAttentionCount(0);
          return;
        }
        const count = res.data.messages.filter(
          (message) =>
            message.direction === 'inbound' &&
            (message.status === 'received' ||
              message.status === 'failed' ||
              message.status === 'skipped'),
        ).length;
        setMailAttentionCount(count);
      })
      .catch(() => setMailAttentionCount(0));
  }, [apiId, canEdit]);

  useEffect(() => {
    refreshMailSummary();
  }, [refreshMailSummary]);

  // One-shot memory probe on mount to decide if the shelves glow brighter.
  useEffect(() => {
    if (!canEdit) return;
    api
      .getAgentMemory(apiId)
      .then((res) => {
        if (!res.success) {
          setHasMemory(false);
          return;
        }
        const m = res.data as { memoryMd?: string; dailyLogs?: unknown[] };
        const anything =
          !!(m?.memoryMd && m.memoryMd.length > 20) ||
          !!(m?.dailyLogs && m.dailyLogs.length);
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
    api
      .getAgentPlugins(apiId)
      .then((res) => {
        if (!res.success) {
          setPluginsInstalled(0);
          return;
        }
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
    api
      .getChatHistory(apiId)
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
  const selectedAvatarVariant = normalizeAvatarVariant(
    agent?.config?.roomAvatarVariant,
  );
  const selectedAvatarTraits =
    agent?.config?.roomAvatarTraits ?? agent?.config?.avatarTraits;
  const mobileBackTarget = useMemo(
    () => resolveMobileBackTarget(searchParams.get('from'), apiId),
    [apiId, searchParams],
  );
  const dashboardHref = `/dashboard/agent/${apiId}`;

  const openLaptop = useCallback(
    (tab: LaptopTab = 'status') => {
      close();
      setLaptopInitialTab(tab);
      setLaptopOpen(true);
    },
    [close],
  );

  const handleStationClick = useCallback(
    (id: StationId) => {
      if (id === 'buildingExit') {
        router.push(cityBuildingHref());
        return;
      }
      if (OWNER_ONLY.has(id) && !canEdit) {
        toast.info(
          'Owner-only — sign in as the owner or a team member to use this station.',
        );
        return;
      }
      if (id === 'mailInbox') {
        openLaptop('mail');
        return;
      }
      if (id === 'configTerminal') {
        openLaptop('config');
        return;
      }
      if (id === 'agentAvatar') {
        // Chat now lives in the floating dock — no need to camp by the avatar.
        setLaptopOpen(false);
        setFloatingChatOpen(true);
        setChatUnread(0);
        return;
      }
      setLaptopOpen(false);
      setOpenPanel(id);
    },
    [canEdit, openLaptop, router, setOpenPanel, toast],
  );

  const handlePassportOpen = useCallback(() => {
    openLaptop('passport');
  }, [openLaptop]);

  useEffect(() => {
    if (initialPassportRequestRef.current) return;
    if (searchParams.get('passport') !== '1') return;
    initialPassportRequestRef.current = true;
    handlePassportOpen();
  }, [handlePassportOpen, searchParams]);

  const handleOpenChatFromPassport = useCallback(() => {
    setLaptopOpen(false);
    if (canEdit) {
      setFloatingChatOpen(true);
      setChatUnread(0);
    }
  }, [canEdit]);

  const handleLaptopConfigSave = useCallback(
    async (patch: LaptopConfigPatch) => {
      if (!canEdit) throw new Error('Owner-only config.');
      const previous = agent;
      setAgent((prev) =>
        prev
          ? {
              ...prev,
              name: patch.name,
              description: patch.description || null,
              config: patch.config,
            }
          : prev,
      );
      const res = await api.updateAgent(apiId, {
        name: patch.name,
        description: patch.description,
        config: patch.config,
      });
      if (!res.success) {
        if (previous) setAgent(previous);
        throw new Error(res.error || 'Could not save config.');
      }
      setAgent(res.data as unknown as AgentWithExtras);
      toast.success('Config saved');
    },
    [agent, apiId, canEdit, toast],
  );

  const handleEyesSave = useCallback(
    async (config: RoomEyesConfig) => {
      if (!canEdit) throw new Error('Owner-only Eyes workspace.');
      const previous = agent;
      const nextConfig = { ...(agent?.config ?? {}), eyes: config };
      setAgent((prev) => (prev ? { ...prev, config: nextConfig } : prev));
      const res = await api.updateAgent(apiId, { config: nextConfig });
      if (!res.success) {
        if (previous) setAgent(previous);
        throw new Error(res.error || 'Could not save Eyes workspace.');
      }
      setAgent(res.data as unknown as AgentWithExtras);
      toast.success('Eyes workspace saved');
    },
    [agent, apiId, canEdit, toast],
  );

  const handleAvatarChange = useCallback(
    async (variant: AvatarVariant) => {
      if (!canEdit) return;
      const nextConfig = {
        ...(agent?.config ?? {}),
        roomAvatarVariant: variant,
      };
      setAgent((prev) => (prev ? { ...prev, config: nextConfig } : prev));
      try {
        const res = await api.updateAgent(apiId, { config: nextConfig });
        if (!res.success)
          throw new Error(res.error || 'Could not save avatar.');
        toast.success('Avatar updated');
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Could not save avatar.',
        );
        void loadAgent();
      }
    },
    [agent?.config, apiId, canEdit, loadAgent, toast],
  );

  const handleEmote = useCallback((emote: RoomEmoteId) => {
    setActiveEmote(emote);
    setEmoteNonce((value) => value + 1);
  }, []);

  const openFloatingChat = useCallback(() => {
    setLaptopOpen(false);
    setFloatingChatOpen(true);
    setChatUnread(0);
  }, []);

  // ── Auto-emote: the agent visibly reacts to its own real activity ────────
  // The robot used to only emote when you clicked a button. Now it comes alive
  // off real signals: thinking while it streams, waving when it replies,
  // working when its eyes go live, alerting on error.
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (isChatStreaming && !prevStreamingRef.current) {
      handleEmote('think');
    } else if (!isChatStreaming && prevStreamingRef.current) {
      handleEmote('wave');
    }
    prevStreamingRef.current = isChatStreaming;
  }, [isChatStreaming, handleEmote]);

  // Async push (integration / cron reply) arrives over the chat socket with an
  // id; streamed + history messages have none, so an id is a clean "live reply"
  // signal — wave, and bump the unread badge if the dock is closed.
  const seenPushIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    let fresh = false;
    for (const m of chatMessages) {
      if (m.role === 'assistant' && m.id && !seenPushIdsRef.current.has(m.id)) {
        seenPushIdsRef.current.add(m.id);
        fresh = true;
      }
    }
    if (fresh) {
      handleEmote('wave');
      if (!floatingChatOpen) setChatUnread((n) => n + 1);
    }
  }, [chatMessages, floatingChatOpen, handleEmote]);

  // Eyes go live → the agent is actively browsing/operating → work pose.
  const prevEyesLiveRef = useRef(false);
  useEffect(() => {
    const live = eyesState?.status === 'live';
    if (live && !prevEyesLiveRef.current) handleEmote('work');
    prevEyesLiveRef.current = live;
  }, [eyesState?.status, handleEmote]);

  // Container error → alert flinch (fires once on entering the error state).
  const prevErrorRef = useRef(false);
  useEffect(() => {
    const errored = agent?.status === 'error';
    if (errored && !prevErrorRef.current) handleEmote('alert');
    prevErrorRef.current = errored;
  }, [agent?.status, handleEmote]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === 'Escape') {
        close();
        setLaptopOpen(false);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'e' && nearest && !openPanel && !laptopOpen) {
        handleStationClick(nearest);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit, close, handleStationClick, laptopOpen, nearest, openPanel]);

  const connectedIntegrations = useMemo(
    () => extractConnectedIntegrations(agent?.config),
    [agent?.config],
  );
  const roomEyesLiveFeed = useMemo(
    () =>
      normalizeRoomEyesLiveFeed({
        status: agent?.status ?? 'unknown',
        lines: tvLogLines,
        updatedAt: eyesSnapshot?.capturedAt ?? Date.now(),
        messagesToday: agent?.messageCountToday,
        uptimeSec: agent?.uptimeSec,
        state: eyesState,
        screenshot: eyesSnapshot,
      }),
    [
      agent?.messageCountToday,
      agent?.status,
      agent?.uptimeSec,
      eyesSnapshot,
      eyesState,
      tvLogLines,
    ],
  );

  if (!framework || !layout) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-[11px] uppercase tracking-[0.16em] text-neutral-400">
        Loading room
      </div>
    );
  }

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
        logLines={tvLogLines}
        eyesSnapshotDataUrl={roomEyesLiveFeed.screenshot?.dataUrl}
        connectedIntegrations={connectedIntegrations}
        nearest={nearest}
        canEdit={canEdit}
        hasMemory={hasMemory}
        quality={quality}
        isChatStreaming={isChatStreaming}
        avatarVariant={selectedAvatarVariant}
        avatarTraits={selectedAvatarTraits}
        activeEmote={activeEmote}
        emoteNonce={emoteNonce}
        onStationClick={handleStationClick}
      />

      <BackToCity agentId={apiId} />
      <ProximityHint nearest={openPanel ? null : nearest} />
      <ShortcutHud canEdit={canEdit} />
      {canEdit && (
        <AvatarEmoteHud
          selectedAvatarVariant={selectedAvatarVariant}
          onAvatarChange={handleAvatarChange}
          onEmote={handleEmote}
        />
      )}
      <WalkOnboarding />
      <AgentRoomMobileMenu
        agentName={agent?.name ?? 'Agent'}
        framework={framework}
        status={agent?.status ?? 'unknown'}
        canEdit={canEdit}
        mailAttentionCount={mailAttentionCount}
        backTarget={mobileBackTarget}
        dashboardHref={dashboardHref}
        selectedAvatarVariant={selectedAvatarVariant}
        onAvatarChange={handleAvatarChange}
        onEmote={handleEmote}
        onOpenLaptop={openLaptop}
        onOpenChat={openFloatingChat}
      />
      {nearest && !openPanel && !laptopOpen && (
        <MobileSceneActionButton
          label={mobileStationButtonLabel(nearest)}
          onClick={() => handleStationClick(nearest)}
        />
      )}

      {/* Floating chat: always mounted for owners so the socket stays live and
          async replies surface even when the dock is minimized. */}
      {canEdit && (
        <ChatPanel
          agentId={apiId}
          framework={framework}
          messages={chatMessages}
          onAppend={appendChatMessage}
          onUpdateLast={updateLastChatMessage}
          onStreamingChange={setIsChatStreaming}
          onClose={() => setFloatingChatOpen(false)}
          variant="dock"
          collapsed={!floatingChatOpen}
          onToggleCollapse={() => setFloatingChatOpen(false)}
        />
      )}
      {canEdit && !floatingChatOpen && (
        <FloatingChatButton
          unread={chatUnread}
          framework={framework}
          onClick={openFloatingChat}
        />
      )}
      {laptopOpen && canEdit && (
        <LaptopPanel
          agentId={apiId}
          agentName={agent?.name}
          agentDescription={agent?.description}
          agentConfig={agent?.config}
          framework={framework}
          status={agent?.status ?? 'unknown'}
          tier={agent?.tier}
          messagesToday={agent?.messageCountToday}
          uptimeSec={agent?.uptimeSec}
          initialTab={laptopInitialTab}
          mailAttentionCount={mailAttentionCount}
          passport={activePassport}
          liveFeed={roomEyesLiveFeed}
          onSaveConfig={handleLaptopConfigSave}
          onSaveEyes={handleEyesSave}
          onStartEyesLive={handleEyesStartLive}
          onEyesAction={handleEyesAction}
          onStopEyesLive={handleEyesStopLive}
          onClose={() => setLaptopOpen(false)}
          onOpenStation={setOpenPanel}
          onOpenChat={handleOpenChatFromPassport}
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
      {openPanel === 'eyesConsole' && canEdit && (
        <EyesPanel
          agentName={agent?.name}
          framework={framework}
          eyesConfig={normalizeRoomEyesConfig(agent?.config?.eyes, agent?.name)}
          liveFeed={roomEyesLiveFeed}
          onSaveEyes={handleEyesSave}
          onStartLive={handleEyesStartLive}
          onAction={handleEyesAction}
          onStopLive={handleEyesStopLive}
          onClose={close}
        />
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

function FloatingChatButton({
  unread,
  framework,
  onClick,
}: {
  unread: number;
  framework: string;
  onClick: () => void;
}) {
  const accent =
    framework === 'openclaw'
      ? '#e3b765'
      : framework === 'hermes'
        ? '#b9a4e6'
        : framework === 'elizaos'
          ? '#8fb6e0'
          : framework === 'milady'
            ? '#f0a8cf'
            : '#9fc1c7';
  return (
    <button
      onClick={onClick}
      aria-label="Chat with your agent"
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border text-2xl shadow-xl backdrop-blur transition hover:scale-105 active:scale-95"
      style={{
        borderColor: `${accent}aa`,
        background: 'rgba(21,16,11,0.92)',
        boxShadow: `0 10px 30px ${accent}55`,
      }}
    >
      <span aria-hidden>💬</span>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

function resolveMobileBackTarget(
  from: string | null,
  agentId: string,
): { href: string; label: string } {
  if ((from === 'dashboard' || from === 'hatch') && agentId) {
    return { href: `/dashboard/agent/${agentId}`, label: 'Dashboard' };
  }
  if (from === 'agents') return { href: '/dashboard/agents', label: 'Agents' };
  if (from === 'building' || from === 'house') {
    return { href: cityBuildingHref(), label: 'Building' };
  }
  return { href: '/city', label: 'City' };
}

function mobileStationButtonLabel(station: StationId): string {
  switch (station) {
    case 'buildingExit':
      return 'Back';
    case 'agentAvatar':
      return 'Talk';
    case 'configTerminal':
      return 'Laptop';
    case 'eyesConsole':
      return 'Eyes';
    case 'mailInbox':
      return 'Mail';
    default:
      return stationActionLabel(station)
        .replace('manage ', '')
        .replace('view ', 'Open ');
  }
}

function AgentRoomMobileMenu({
  agentName,
  framework,
  status,
  canEdit,
  mailAttentionCount,
  backTarget,
  dashboardHref,
  selectedAvatarVariant,
  onAvatarChange,
  onEmote,
  onOpenLaptop,
  onOpenChat,
}: {
  agentName: string;
  framework: string;
  status: string;
  canEdit: boolean;
  mailAttentionCount: number;
  backTarget: { href: string; label: string };
  dashboardHref: string;
  selectedAvatarVariant: AvatarVariant | null;
  onAvatarChange: (variant: AvatarVariant) => void | Promise<void>;
  onEmote: (emote: RoomEmoteId) => void;
  onOpenLaptop: (tab?: LaptopTab) => void;
  onOpenChat: () => void;
}) {
  const showDashboardLink = backTarget.href !== dashboardHref;

  return (
    <MobileSceneMenu
      title={agentName}
      subtitle={`${framework} · ${status}`}
      tone="warm"
    >
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={backTarget.href}
          className="rounded-[7px] border border-[#d6b177]/25 bg-[#2b1d12] px-3 py-2 text-sm font-semibold text-[#f6ead8]"
        >
          {backTarget.label}
        </Link>
        {showDashboardLink && (
          <Link
            href={dashboardHref}
            className="rounded-[7px] border border-[#d6b177]/25 bg-[#2b1d12] px-3 py-2 text-sm font-semibold text-[#f6ead8]"
          >
            Dashboard
          </Link>
        )}
        <button
          type="button"
          onClick={() => onOpenLaptop('status')}
          disabled={!canEdit}
          className={`rounded-[7px] border border-[#d6b177]/25 bg-[#d6b177] px-3 py-2 text-sm font-semibold text-[#20140b] disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35 ${
            showDashboardLink ? 'col-span-2' : ''
          }`}
        >
          Laptop
        </button>
      </div>

      {canEdit && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenLaptop('config')}
              className="rounded-[7px] border border-[#d6b177]/25 bg-[#2b1d12] px-3 py-2 text-sm font-semibold text-[#f6ead8]"
            >
              Config
            </button>
            <button
              type="button"
              onClick={() => onOpenLaptop('passport')}
              className="rounded-[7px] border border-[#d6b177]/25 bg-[#2b1d12] px-3 py-2 text-sm font-semibold text-[#f6ead8]"
            >
              Passport
            </button>
            <button
              type="button"
              onClick={() => onOpenLaptop('eyes')}
              className="rounded-[7px] border border-[#d6b177]/25 bg-[#2b1d12] px-3 py-2 text-sm font-semibold text-[#f6ead8]"
            >
              Eyes
            </button>
            <button
              type="button"
              onClick={() => onOpenLaptop('mail')}
              className="rounded-[7px] border border-[#d6b177]/25 bg-[#2b1d12] px-3 py-2 text-sm font-semibold text-[#f6ead8]"
            >
              Mail{mailAttentionCount > 0 ? ` · ${mailAttentionCount}` : ''}
            </button>
            <button
              type="button"
              onClick={onOpenChat}
              className="rounded-[7px] border border-[#d6b177]/25 bg-[#2b1d12] px-3 py-2 text-sm font-semibold text-[#f6ead8]"
            >
              Chat
            </button>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d6b177]">
              Avatar
            </div>
            <AvatarEmoteControls
              selectedAvatarVariant={selectedAvatarVariant}
              onAvatarChange={onAvatarChange}
              onEmote={onEmote}
              layout="menu"
            />
          </div>
        </>
      )}
    </MobileSceneMenu>
  );
}
