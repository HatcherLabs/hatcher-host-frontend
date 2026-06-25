'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import type { Agent, AgentFeature, ChatAttachmentPayload, ChatSessionSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useWebSocketChat, type ChatThinkingEvent, type ChatToolEvent } from '@/hooks/useWebSocketChat';
import { FRAMEWORKS, getBYOKProvider } from '@hatcher/shared';
import type { UserTierKey } from '@hatcher/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';
import { AgentStatusPill } from '@/components/ui/AgentStatusPill';
import {
  ArrowLeft,
  Box,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Share2,
  Copy,
  MoreHorizontal,
} from 'lucide-react';
import {
  AgentContext,
  type Tab,
  type Message,
  type AgentStats,
  type AgentContextValue,
  genId,
  getNextChatSessionIdAfterDelete,
  Skeleton,
  STATUS_STYLES,
  pageEntranceVariants,
  shouldRunChatWorkloads,
} from '@/components/agents/AgentContext';
import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { PortAgentModal } from '@/components/agents/PortAgentModal';
import { shouldMountTerminalTab } from '@/components/agents/terminalPersistence';
import { resolveLoadedModelConfig, useAgentConfig } from '@/hooks/useAgentConfig';
import { DEFAULT_AGENT_VIEW_MODE, EASY_AGENT_TABS, resolveAgentViewMode } from '@/components/agents/navigationModel';
import { applyChatToolEvent, streamToolEventToChatToolEvent } from '@/components/agents/tabs/ChatTab/chatToolEvents';
import { applyChatThinkingEvent } from '@/components/agents/tabs/ChatTab/chatThinkingEvents';
import {
  chatMessageMetadataSignature,
  normalizeChatMessageMetadata,
  serializeChatMessageMetadata,
} from '@/components/agents/tabs/ChatTab/chatHistoryMetadata';
import { useAgentIntegrations } from '@/hooks/useAgentIntegrations';
import { useAgentActions } from '@/hooks/useAgentActions';
import { useAgentLogs } from '@/hooks/useAgentLogs';
import { resolveActiveModelDisplay } from '@/lib/hosted-model-catalog';
import dynamic from 'next/dynamic';

const CHAT_HISTORY_MESSAGE_LIMIT = 4000;
const CHAT_HISTORY_TRUNCATION_MARKER = '[Earlier content truncated]\n';

function trimChatHistoryContent(content: string): string {
  if (content.length <= CHAT_HISTORY_MESSAGE_LIMIT) return content;
  return `${CHAT_HISTORY_TRUNCATION_MARKER}${content.slice(
    -(CHAT_HISTORY_MESSAGE_LIMIT - CHAT_HISTORY_TRUNCATION_MARKER.length),
  )}`;
}

// Dynamically import tab components — only the active tab JS is loaded
function TabSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="shimmer rounded-xl h-8 w-48" />
      <div className="shimmer rounded-xl h-32 w-full" />
      <div className="shimmer rounded-xl h-24 w-full" />
    </div>
  );
}

const OverviewTab = dynamic(
  () => import('@/components/agents/tabs/OverviewTab').then(mod => ({ default: mod.OverviewTab })),
  { loading: () => <TabSkeleton /> }
);

const ConfigTab = dynamic(
  () => import('@/components/agents/tabs/ConfigTab').then(mod => ({ default: mod.ConfigTab })),
  { loading: () => <TabSkeleton /> }
);

const IntegrationsTab = dynamic(
  () => import('@/components/agents/tabs/IntegrationsTab').then(mod => ({ default: mod.IntegrationsTab })),
  { loading: () => <TabSkeleton /> }
);

const FilesTab = dynamic(
  () => import('@/components/agents/tabs/FilesTab').then(mod => ({ default: mod.FilesTab })),
  { loading: () => <TabSkeleton /> }
);

const LogsTab = dynamic(
  () => import('@/components/agents/tabs/LogsTab').then(mod => ({ default: mod.LogsTab })),
  { loading: () => <TabSkeleton /> }
);

const ChatTab = dynamic(
  () => import('@/components/agents/tabs/ChatTab').then(mod => ({ default: mod.ChatTab })),
  { loading: () => <TabSkeleton /> }
);

const MailTab = dynamic(
  () => import('@/components/agents/tabs/MailTab').then(mod => ({ default: mod.MailTab })),
  { loading: () => <TabSkeleton /> }
);

const MemoryTab = dynamic(
  () => import('@/components/agents/tabs/MemoryTab').then(mod => ({ default: mod.MemoryTab })),
  { loading: () => <TabSkeleton /> }
);

const OpenClawSessionsTab = dynamic(
  () => import('@/components/agents/tabs/OpenClawSessionsTab').then(mod => ({ default: mod.OpenClawSessionsTab })),
  { loading: () => <TabSkeleton /> }
);

const HermesMemoryTab = dynamic(
  () => import('@/components/agents/tabs/HermesMemoryTab').then(mod => ({ default: mod.HermesMemoryTab })),
  { loading: () => <TabSkeleton /> }
);

const StatsTab = dynamic(
  () => import('@/components/agents/tabs/StatsTab').then(mod => ({ default: mod.StatsTab })),
  { loading: () => <TabSkeleton /> }
);

const SchedulesTab = dynamic(
  () => import('@/components/agents/tabs/SchedulesTab').then(mod => ({ default: mod.SchedulesTab })),
  { loading: () => <TabSkeleton /> }
);

const PluginsTab = dynamic(
  () => import('@/components/agents/tabs/PluginsTab').then(mod => ({ default: mod.PluginsTab })),
  { loading: () => <TabSkeleton /> }
);

const WorkflowsTab = dynamic(
  () => import('@/components/agents/tabs/WorkflowsTab').then(mod => ({ default: mod.WorkflowsTab })),
  { loading: () => <TabSkeleton /> }
);

const TerminalTab = dynamic(
  () => import('@/components/agents/tabs/TerminalTab').then(mod => ({ default: mod.TerminalTab })),
  { loading: TabSkeleton },
);

const DevTab = dynamic(
  () => import('@/components/agents/tabs/DevTab').then(mod => ({ default: mod.DevTab })),
  { loading: () => <TabSkeleton /> },
);

const KnowledgeTab = dynamic(
  () => import('@/components/agents/tabs/KnowledgeTab').then(mod => ({ default: mod.KnowledgeTab })),
  { loading: () => <TabSkeleton /> },
);

const WalletTab = dynamic(
  () => import('@/components/agents/tabs/WalletTab').then(mod => ({ default: mod.WalletTab })),
  { loading: () => <TabSkeleton /> },
);

// ─── Main Component ─────────────────────────────────────────

export default function AgentManagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('dashboard.agentDetail');
  const tHeader = useTranslations('dashboard.agentDetail.header');
  const tNotFound = useTranslations('dashboard.agentDetail.notFound');
  const tStatusPoll = useTranslations('dashboard.agentDetail.statusPoll');

  // View mode (easy = operational tabs only, advanced = everything).
  // Default to advanced so the full dashboard is visible for new workspaces.
  const [viewMode, setViewModeRaw] = useState<'easy' | 'advanced'>(DEFAULT_AGENT_VIEW_MODE);
  useEffect(() => {
    const mode = resolveAgentViewMode(localStorage.getItem('hatcher-view-mode'));
    setViewModeRaw(mode);
    localStorage.setItem('hatcher-view-mode', mode);
  }, []);
  const setViewMode = useCallback((mode: 'easy' | 'advanced') => {
    setViewModeRaw(mode);
    localStorage.setItem('hatcher-view-mode', mode);
    // If switching to Easy and the current tab isn't visible in Easy, go to Chat.
    if (mode === 'easy') {
      setTabRaw(prev => EASY_AGENT_TABS.includes(prev) ? prev : 'chat');
    }
  }, []);

  // Core state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [ownedAgents, setOwnedAgents] = useState<Agent[]>([]);
  const [ownedAgentsLoading, setOwnedAgentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const validTabs: Tab[] = ['overview','config','integrations','skills','plugins','files','logs','terminal','dev','memory','sessions','knowledge','schedules','workflows','chat','mail','stats','wallet'];
  // 'skills' kept in validTabs for backwards compat (deep links), but redirects to plugins tab
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const rawTab = searchParams.get('tab');
  const normalizeTab = (t: string | null): Tab => {
    if (!t) return 'overview';
    if (t === 'workspace') return 'files';
    if (t === 'kausalayer') return 'wallet';
    return validTabs.includes(t as Tab) ? (t as Tab) : 'overview';
  };
  const initialTab = normalizeTab(rawTab);
  const [tab, setTabRaw] = useState<Tab>(initialTab);
  const [terminalMounted, setTerminalMounted] = useState(() => shouldMountTerminalTab(initialTab, false));
  const setTab = useCallback((t: Tab) => {
    setTabRaw(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'workspace') {
      setTab('files');
    }
  }, [setTab]);
  useEffect(() => {
    setTerminalMounted((mounted) => shouldMountTerminalTab(tab, mounted));
  }, [tab]);

  // Stats
  const [stats, setStats] = useState<AgentStats | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [activeChatSessionId, setActiveChatSessionIdState] = useState<string | null>(null);
  const [deletingChatSessionId, setDeletingChatSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const queuedChatMessagesRef = useRef<
    Array<{ text: string; options?: { attachments?: ChatAttachmentPayload[] } }>
  >([]);
  const [queuedChatCount, setQueuedChatCount] = useState(0);
  const [sendCooldown, setSendCooldown] = useState(false);
  const sendCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatErrorType, setChatErrorType] = useState<'timeout' | 'ratelimit' | 'network' | 'llm_down' | 'generic' | null>(null);
  const [portModalOpen, setPortModalOpen] = useState(false);

  const historyLoadedRef = useRef(false);
  const loadedChatSessionIdRef = useRef<string | null>(null);
  const lastSavedCountRef = useRef(0);
  const lastHistorySignatureRef = useRef('');
  const activeChatSessionIdRef = useRef<string | null>(null);

  // Features / integrations
  const [activeFeatures, setActiveFeatures] = useState<AgentFeature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);

  const userTier = (user?.tier ?? 'free') as UserTierKey;

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wsLogsRef = useRef<WebSocket | null>(null);
  const [wsLogsConnected, setWsLogsConnected] = useState(false);
  const wsLogsReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsLogsRetryCountRef = useRef(0);
  const wsStreamingMsgRef = useRef(false);
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  // Tool-call indicators surfaced from the agent container during streaming.
  // Cleared on each new message; populated by ws-chat tool events.
  const [inflightTools, setInflightTools] = useState<Array<{ callId: string; name: string; argsPreview?: string }>>([]);
  const [completedTools, setCompletedTools] = useState<Array<{ callId: string; name: string }>>([]);

  // ─── Custom hooks ─────────────────────────────────────────

  const config = useAgentConfig(agent, id, setAgent);
  const integrations = useAgentIntegrations(agent, id, setAgent);
  const logs = useAgentLogs(id);

  const setActiveChatSessionId = useCallback((sessionId: string) => {
    if (activeChatSessionIdRef.current !== sessionId) {
      historyLoadedRef.current = false;
      loadedChatSessionIdRef.current = null;
      setMessages([]);
      lastSavedCountRef.current = 0;
      lastHistorySignatureRef.current = '';
    }
    setActiveChatSessionIdState(sessionId);
    activeChatSessionIdRef.current = sessionId;
  }, []);

  // ─── Data loaders ────────────────────────────────────────

  const normalizeHistoryMessages = useCallback((raw: { role: string; content: string; ts: number; metadata?: unknown }[]) => {
    const deduped: typeof raw = [];
    for (const m of raw) {
      const prev = deduped[deduped.length - 1];
      if (prev && prev.role === m.role && prev.content === m.content) continue;
      deduped.push(m);
    }

    return deduped.map((m, i) => {
      const metadata = normalizeChatMessageMetadata(m.metadata);
      return {
        id: `hist-${m.ts ?? i}-${i}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.ts ? new Date(m.ts) : new Date(),
        ...(metadata?.thinking ? { thinking: metadata.thinking } : {}),
        ...(metadata?.toolEvents ? { toolEvents: metadata.toolEvents } : {}),
      };
    });
  }, []);

  const historySignature = useCallback((items: Message[]) => (
    items
      .filter((m) => !m.streaming && m.content)
      .map((m) => `${m.role}:${m.timestamp?.getTime() ?? 0}:${m.content}:${chatMessageMetadataSignature(m)}`)
      .join('\n')
  ), []);

  const loadAgent = useCallback(async () => {
    if (!isAuthenticated) return;
    const res = await api.getAgent(id);
    setLoading(false);
    if (res.success) {
      setAgent(res.data);
    }
  }, [id, isAuthenticated]);

  const loadOwnedAgents = useCallback(async () => {
    if (!isAuthenticated) return;
    setOwnedAgentsLoading(true);
    const res = await api.getMyAgents();
    setOwnedAgentsLoading(false);
    if (res.success && Array.isArray(res.data)) {
      setOwnedAgents(res.data);
    }
  }, [isAuthenticated]);

  const loadFeatures = useCallback(async () => {
    setFeaturesLoading(true);
    const res = await api.getAgentFeatures(id);
    setFeaturesLoading(false);
    if (res.success) setActiveFeatures(Array.isArray(res.data) ? res.data : []);
  }, [id]);

  // ─── Actions hook (depends on loadAgent) ──────────────────

  const actions = useAgentActions(agent, id, loadAgent);

  // ─── Reset tab when agent ID changes ──────────────────────

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      const params = new URLSearchParams(window.location.search);
      setTab(normalizeTab(params.get('tab')));
      setMessages([]);
      setChatSessions([]);
      setActiveChatSessionIdState(null);
      activeChatSessionIdRef.current = null;
      logs.setLogs([]);
      setStats(null);
      setAgent(null);
      setLoading(true);
      historyLoadedRef.current = false;
      lastSavedCountRef.current = 0;
      lastHistorySignatureRef.current = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─── Initial load ─────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      const current = typeof window !== 'undefined'
        ? `/dashboard/agent/${id}${window.location.search}`
        : `/dashboard/agent/${id}`;
      router.replace(`/login?return=${encodeURIComponent(current)}`);
      return;
    }
    loadAgent();
    loadOwnedAgents();
  }, [authLoading, id, isAuthenticated, loadAgent, loadOwnedAgents, router]);

  useEffect(() => { sendingRef.current = sending; }, [sending]);

  const chatDraftStorageKey = useMemo(
    () =>
      id
        ? `hatcher:agent:${id}:chat:${activeChatSessionId ?? 'current'}:draft`
        : null,
    [activeChatSessionId, id]
  );
  const hydratedDraftKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!chatDraftStorageKey || typeof window === 'undefined') return;
    hydratedDraftKeyRef.current = chatDraftStorageKey;
    try {
      setInput(window.localStorage.getItem(chatDraftStorageKey) ?? '');
    } catch {
      setInput('');
    }
  }, [chatDraftStorageKey]);

  useEffect(() => {
    if (
      !chatDraftStorageKey ||
      hydratedDraftKeyRef.current !== chatDraftStorageKey ||
      typeof window === 'undefined'
    ) {
      return;
    }
    try {
      if (input.trim()) {
        window.localStorage.setItem(chatDraftStorageKey, input);
      } else {
        window.localStorage.removeItem(chatDraftStorageKey);
      }
    } catch {
      // Ignore storage quota/private-mode failures; the in-memory draft still works.
    }
  }, [chatDraftStorageKey, input]);

  const enqueueChatMessage = useCallback(
    (text: string, options?: { attachments?: ChatAttachmentPayload[] }) => {
      const clean = text.trim();
      if (!clean) return;
      queuedChatMessagesRef.current = [
        ...queuedChatMessagesRef.current,
        { text: clean, options },
      ];
      setQueuedChatCount(queuedChatMessagesRef.current.length);
      setInput('');
      setChatError(null);
      setChatErrorType(null);
    },
    []
  );

  const dequeueChatMessage = useCallback(() => {
    const [next, ...remaining] = queuedChatMessagesRef.current;
    queuedChatMessagesRef.current = remaining;
    setQueuedChatCount(remaining.length);
    return next ?? null;
  }, []);

  // ─── Poll agent status ────────────────────────────────────

  useEffect(() => {
    const status = agent?.status;
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    if (!agent || status === 'active' || status === 'error') return;

    statusPollRef.current = setInterval(async () => {
      const res = await api.getAgent(id);
      if (!res.success) return;
      setAgent(res.data);
      if (res.data.status === 'active') {
        if (statusPollRef.current) { clearInterval(statusPollRef.current); statusPollRef.current = null; }
        toast('success', tStatusPoll('agentReady'));
      } else if (res.data.status === 'error') {
        if (statusPollRef.current) { clearInterval(statusPollRef.current); statusPollRef.current = null; }
      }
    }, 5000);

    return () => {
      if (statusPollRef.current) { clearInterval(statusPollRef.current); statusPollRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.status, id]);

  // ─── Guided onboarding ────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined' || !id) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') return;
    const onboardKey = `hatcher-onboarded-${id}`;
    if (localStorage.getItem(onboardKey)) return;

    setTab('chat');
    setMessages((prev) => {
      if (prev.some((m) => m.id === 'onboard-welcome')) return prev;
      return [
        ...prev,
        {
          id: 'onboard-welcome',
          role: 'assistant' as const,
          content: '\uD83D\uDC4B Welcome! Your agent is starting up. Try sending a message to test it out!',
          timestamp: new Date(),
        },
      ];
    });

    localStorage.setItem(onboardKey, '1');
    const url = new URL(window.location.href);
    url.searchParams.delete('new');
    window.history.replaceState({}, '', url.pathname + (url.search || ''));
  }, [id, setTab]);

  // ─── Load stats ───────────────────────────────────────────

  useEffect(() => {
    if (!agent) return;
    api.getAgentStats(id).then((res) => {
      if (res.success) setStats(res.data);
    });
  }, [agent, id]);

  // ─── Load logs: WebSocket streaming with auto-reconnect ───

  const agentStatus = agent?.status;

  useEffect(() => {
    if (!(tab === 'logs' || tab === 'overview') || !agentStatus) return;

    // Clean up any existing connection + pending reconnect
    if (wsLogsRef.current) {
      wsLogsRef.current.close();
      wsLogsRef.current = null;
    }
    if (wsLogsReconnectRef.current) {
      clearTimeout(wsLogsReconnectRef.current);
      wsLogsReconnectRef.current = null;
    }
    setWsLogsConnected(false);
    wsLogsRetryCountRef.current = 0;

    const isActiveStatus = agentStatus === 'active';

    // Use WebSocket streaming for all tiers when agent is active
    if (isActiveStatus) {
      let cancelled = false;

      // Fire the HTTP batch load immediately, independent of the WS
      // handshake. Mobile networks / corporate proxies sometimes allow
      // HTTPS but block WebSocket upgrades, in which case the WS
      // `connected` event that used to trigger this fetch never fires
      // and the logs tab stays empty. Running both in parallel makes
      // sure the tab always has content.
      logs.loadLogs();

      function connectWsLogs() {
        if (cancelled) return;
        const apiBase = API_URL;
        const wsBase = apiBase.replace(/^http/, 'ws');
        const url = `${wsBase}/agents/${id}/logs/ws`;
        // Don't flash the loading skeleton on every reconnect. Only the
        // very first attempt sets loading; subsequent retries keep the
        // existing log buffer on screen so the user doesn't see the
        // whole pane blink every second while we back off and retry.
        if (wsLogsRetryCountRef.current === 0) logs.setLogsLoading(true);
        const ws = new WebSocket(url);
        wsLogsRef.current = ws;

        // Don't reset the retry counter here — the TCP upgrade can
        // succeed and the server can then reject us (auth fail, stream
        // cap hit, etc.) which flips onclose without ever sending the
        // `connected` app-level message. If we reset on onopen we end
        // up in a tight 1s reconnect loop; reset only when we've seen
        // the server's `connected` message.

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as { type: string; timestamp?: string; level?: string; message?: string };
            if (msg.type === 'connected') {
              logs.setLogsLoading(false);
              setWsLogsConnected(true);
              wsLogsRetryCountRef.current = 0;
              // Historical batch is already loaded in parallel above —
              // no need to refetch here.
            } else if (msg.type === 'log' && msg.timestamp && msg.message) {
              const entry = {
                timestamp: msg.timestamp,
                level: (msg.level as 'info' | 'warn' | 'error') ?? 'info',
                message: msg.message,
              };
              logs.setLogs((prev) => {
                const next = [...prev, entry];
                return next.length > 200 ? next.slice(next.length - 200) : next;
              });
            } else if (msg.type === 'disconnected') {
              logs.setLogsLoading(false);
              setWsLogsConnected(false);
            } else if (msg.type === 'error') {
              logs.setLogsLoading(false);
              setWsLogsConnected(false);
            }
          } catch { /* Ignore unparseable messages */ }
        };

        ws.onerror = () => {
          logs.setLogsLoading(false);
          setWsLogsConnected(false);
          wsLogsRef.current = null;
        };

        ws.onclose = () => {
          logs.setLogsLoading(false);
          setWsLogsConnected(false);
          wsLogsRef.current = null;
          // Auto-reconnect with exponential backoff (max 30s)
          if (!cancelled) {
            const retries = wsLogsRetryCountRef.current;
            const delay = Math.min(1000 * Math.pow(2, retries), 30_000);
            wsLogsRetryCountRef.current = retries + 1;
            wsLogsReconnectRef.current = setTimeout(connectWsLogs, delay);
          }
        };
      }

      connectWsLogs();

      return () => {
        cancelled = true;
        if (wsLogsRef.current) {
          wsLogsRef.current.close();
          wsLogsRef.current = null;
        }
        if (wsLogsReconnectRef.current) {
          clearTimeout(wsLogsReconnectRef.current);
          wsLogsReconnectRef.current = null;
        }
        setWsLogsConnected(false);
      };
    } else {
      // Agent not active — do a single static fetch
      logs.loadLogs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, agentStatus, id]);

  // ─── Load features when integrations or config tab ────────

  useEffect(() => {
    if ((tab === 'integrations' || tab === 'config') && agentStatus) loadFeatures();
  }, [tab, agentStatus, loadFeatures]);

  // ─── Load and poll chat history from server ───────────────

  const loadChatSessions = useCallback(async () => {
    if (!id) return;
    const res = await api.getChatSessions(id);
    if (!res.success) return;

    const sessions = Array.isArray(res.data.sessions) ? res.data.sessions : [];
    setChatSessions(sessions);
    const current = sessions.find((session) => session.current) ?? sessions[0];
    const selectedStillExists = sessions.some((session) => session.id === activeChatSessionIdRef.current);
    if (current && !selectedStillExists) {
      activeChatSessionIdRef.current = current.id;
      setActiveChatSessionIdState(current.id);
      historyLoadedRef.current = false;
      loadedChatSessionIdRef.current = null;
      setMessages([]);
      lastSavedCountRef.current = 0;
      lastHistorySignatureRef.current = '';
    }
  }, [id]);

  const loadChatHistory = useCallback(async (mode: 'initial' | 'poll' = 'poll') => {
    if (!id) return;
    if (mode === 'poll' && (sendingRef.current || wsStreamingMsgRef.current)) return;

    const requestedSessionId = activeChatSessionIdRef.current;
    if (mode === 'initial') {
      historyLoadedRef.current = false;
      loadedChatSessionIdRef.current = null;
    }

    try {
      const res = await api.getChatHistory(id, requestedSessionId ?? undefined);
      if (activeChatSessionIdRef.current !== requestedSessionId) return;
      if (res.success) {
        const loaded = normalizeHistoryMessages(Array.isArray(res.data.messages) ? res.data.messages : []);
        const signature = historySignature(loaded);

        if (mode === 'initial') {
          setMessages(loaded);
          lastSavedCountRef.current = loaded.length;
          lastHistorySignatureRef.current = signature;
        } else if (signature && signature !== lastHistorySignatureRef.current) {
          setMessages((prev) => {
            const completeLocal = prev.filter((m) => !m.streaming && m.content);
            const hasLocalTail = completeLocal.length > 0;
            const localTail = completeLocal[completeLocal.length - 1];
            const loadedHasTail = localTail
              ? loaded.some((m) => m.role === localTail.role && m.content === localTail.content)
              : true;

            // Avoid replacing a just-sent local message before the save debounce
            // has persisted it. Scheduled assistant messages arrive on the next
            // poll once the local tail is present server-side.
            if (hasLocalTail && completeLocal.length > loaded.length && !loadedHasTail) {
              return prev;
            }

            lastSavedCountRef.current = loaded.length;
            lastHistorySignatureRef.current = signature;
            return loaded;
          });
        }
      }
    } finally {
      if (mode === 'initial' && activeChatSessionIdRef.current === requestedSessionId) {
        loadedChatSessionIdRef.current = requestedSessionId;
        historyLoadedRef.current = true;
      }
    }
  }, [historySignature, id, normalizeHistoryMessages]);

  useEffect(() => {
    if (!shouldRunChatWorkloads(tab)) return;
    lastHistorySignatureRef.current = '';
    void loadChatSessions();
    void loadChatHistory('initial');
  }, [loadChatHistory, loadChatSessions, activeChatSessionId, tab]);

  useEffect(() => {
    if (tab !== 'chat' || !id) return;
    const timer = setInterval(() => {
      void loadChatHistory('poll');
    }, 10_000);
    return () => clearInterval(timer);
  }, [id, loadChatHistory, tab]);

  const startNewChatSession = useCallback(async () => {
    if (!id) return;
    const res = await api.createChatSession(id);
    if (!res.success) {
      toast.error(res.error ?? 'Failed to start a new chat session');
      return;
    }
    setActiveChatSessionId(res.data.session.id);
    setChatSessions((prev) => [
      { ...res.data.session, current: true },
      ...prev.map((session) => ({ ...session, current: false })),
    ]);
    setMessages([]);
    lastSavedCountRef.current = 0;
    lastHistorySignatureRef.current = '';
    loadedChatSessionIdRef.current = res.data.session.id;
    historyLoadedRef.current = true;
  }, [id, setActiveChatSessionId, toast]);

  const deleteChatSession = useCallback(async (sessionId: string) => {
    if (!id || deletingChatSessionId) return;
    const target = chatSessions.find((session) => session.id === sessionId);
    const confirmed = window.confirm(`Delete "${target?.title ?? 'this chat'}"? This cannot be undone.`);
    if (!confirmed) return;

    const activeBeforeDelete = activeChatSessionIdRef.current;
    const nextActiveId = getNextChatSessionIdAfterDelete(chatSessions, sessionId, activeBeforeDelete);
    const deletingActiveSession = activeBeforeDelete === sessionId || (!activeBeforeDelete && target?.current);

    setDeletingChatSessionId(sessionId);
    const res = await api.deleteChatSession(id, sessionId);
    setDeletingChatSessionId(null);

    if (!res.success) {
      toast.error(res.error ?? 'Failed to delete chat');
      return;
    }

    setChatSessions((prev) => prev.filter((session) => session.id !== sessionId));
    if (deletingActiveSession) {
      activeChatSessionIdRef.current = nextActiveId;
      setActiveChatSessionIdState(nextActiveId);
      setMessages([]);
      lastSavedCountRef.current = 0;
      lastHistorySignatureRef.current = '';
      loadedChatSessionIdRef.current = null;
      historyLoadedRef.current = false;
    }

    toast.success('Chat deleted');
    window.setTimeout(() => void loadChatSessions(), 300);
  }, [chatSessions, deletingChatSessionId, id, loadChatSessions, toast]);

  // ─── Save chat history to server (debounced) ──────────────

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (messages.length === 0 || !id) return;
    if (!historyLoadedRef.current) return;
    const complete = messages.filter(m => !m.streaming && m.content);
    if (complete.length === 0) return;
    if (complete.length <= lastSavedCountRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const saveSessionId = loadedChatSessionIdRef.current ?? activeChatSessionIdRef.current;
    saveTimerRef.current = setTimeout(() => {
      lastSavedCountRef.current = complete.length;
      const toSave = complete.map(m => {
        const metadata = serializeChatMessageMetadata(m);
        return {
          role: m.role,
          content: m.content,
          ts: m.timestamp?.getTime(),
          ...(metadata ? { metadata } : {}),
        };
      });
      const deduped: typeof toSave = [];
      for (const m of toSave) {
        const prev = deduped[deduped.length - 1];
        if (prev && prev.role === m.role && prev.content === m.content) continue;
        deduped.push(m);
      }
      api.saveChatHistory(id, deduped, saveSessionId).catch(() => {});
    }, 2000);
  }, [messages, id]);

  // ─── Auto-focus chat input ─────────────────────────────────

  useEffect(() => {
    if (tab === 'chat' && !loading && agent) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [tab, loading, agent]);

  // ─── Auto-scroll logs ─────────────────────────────────────

  useEffect(() => {
    if (!logs.autoScroll || tab !== 'logs') return;
    const el = logs.logsEndRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs.logs.length, logs.autoScroll, logs.logsEndRef, tab]);

  // ─── WebSocket streaming chat ──────────────────────────────

  const updateLastStreamingAssistant = useCallback((updater: (message: Message) => Message) => {
    setMessages((prev) => {
      const updated = [...prev];
      let targetIndex = -1;
      for (let i = updated.length - 1; i >= 0; i -= 1) {
        const candidate = updated[i];
        if (candidate?.role === 'assistant' && candidate.streaming) {
          targetIndex = i;
          break;
        }
      }
      const target = targetIndex >= 0 ? updated[targetIndex] : undefined;
      if (!target) return prev;
      updated[targetIndex] = updater(target);
      return updated;
    });
  }, []);

  const handleChatThinkingEvent = useCallback((evt: ChatThinkingEvent) => {
    updateLastStreamingAssistant((target) => ({
      ...target,
      thinking: applyChatThinkingEvent(target.thinking, {
        phase: evt.phase,
        ...(evt.label !== undefined ? { label: evt.label } : {}),
        ...(evt.content !== undefined ? { content: evt.content } : {}),
        now: Date.now(),
      }),
    }));
  }, [updateLastStreamingAssistant]);

  const handleChatToolEvent = useCallback((evt: ChatToolEvent) => {
    const toolEvent = streamToolEventToChatToolEvent(evt);
    updateLastStreamingAssistant((target) => ({
      ...target,
      thinking: target.thinking?.streaming
        ? applyChatThinkingEvent(target.thinking, { phase: 'done', now: Date.now() })
        : target.thinking,
      toolEvents: applyChatToolEvent(target.toolEvents ?? [], toolEvent),
    }));

    if (evt.phase === 'start') {
      setInflightTools((prev) => prev.some((t) => t.callId === evt.callId)
        ? prev
        : [...prev, { callId: evt.callId, name: evt.name, argsPreview: evt.argsPreview }]);
    } else if (evt.callId === 'all' && evt.name === '*') {
      setInflightTools((prev) => {
        setCompletedTools((c) => [...c, ...prev.map((t) => ({ callId: t.callId, name: t.name }))].slice(-6));
        return [];
      });
    } else {
      setInflightTools((prev) => {
        const matched = prev.find((t) => t.callId === evt.callId);
        if (matched) setCompletedTools((c) => [...c, { callId: matched.callId, name: matched.name }].slice(-6));
        return prev.filter((t) => t.callId !== evt.callId);
      });
    }
  }, [updateLastStreamingAssistant]);

  const wsChat = useWebSocketChat({
    agentId: id,
    enabled: isAuthenticated && !!id && shouldRunChatWorkloads(tab),
    onToken: (token) => {
      setChatError(null);
      setChatErrorType(null);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: last.content + token,
            thinking: last.thinking?.streaming
              ? applyChatThinkingEvent(last.thinking, { phase: 'done', now: Date.now() })
              : last.thinking,
          };
        }
        return updated;
      });
    },
    onToolEvent: handleChatToolEvent,
    onThinkingEvent: handleChatThinkingEvent,
    onMessage: (message) => {
      if (message.role !== 'assistant' || !message.content.trim()) return;
      setChatError(null);
      setChatErrorType(null);
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [
          ...prev,
          {
            id: message.id,
            role: 'assistant',
            content: message.content,
            timestamp: new Date(message.ts),
          },
        ];
      });
      window.setTimeout(() => void loadChatSessions(), 500);
    },
    onDone: (_content, _model) => {
      wsStreamingMsgRef.current = false;
      chatAbortControllerRef.current = null;
      setInflightTools([]);
      setCompletedTools([]);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          if (!last.content) {
            return updated.filter((m) => m.id !== last.id);
          }
          updated[updated.length - 1] = {
            ...last,
            content: _content || last.content,
            streaming: false,
            thinking: last.thinking?.streaming
              ? applyChatThinkingEvent(last.thinking, { phase: 'done', now: Date.now() })
              : last.thinking,
          };
        }
        return updated;
      });
      if (!_content) {
        setChatErrorType('generic');
        setChatError('Agent returned an empty response. Try again or check if the agent is running.');
      } else {
        setChatError(null);
        setChatErrorType(null);
      }
      setSending(false);
      window.setTimeout(() => void loadChatSessions(), 500);
    },
    onError: (errMsg) => {
      wsStreamingMsgRef.current = false;
      chatAbortControllerRef.current = null;
      const lower = errMsg.toLowerCase();
      if (lower.includes('429') || lower.includes('rate limit') || lower.includes('daily limit') || lower.includes('ai credit') || lower.includes('credit')) {
        setChatErrorType('ratelimit');
        setChatError('AI Credits exhausted. Top up credits, upgrade for a larger monthly grant, or bring your own key.');
        toast.warning('AI Credits exhausted. Top up, upgrade, or bring your own API key.');
      } else if (lower.includes('content policy') || lower.includes('filtered')) {
        setChatErrorType('generic');
        setChatError('Agent response was blocked by content policy.');
      } else if (lower.includes('503') || lower.includes('no_groq_key') || lower.includes('service unavailable') || lower.includes('groq') || lower.includes('llm') || lower.includes('proxy_error')) {
        setChatErrorType('llm_down');
        setChatError('AI service is temporarily unavailable.');
      } else {
        setChatErrorType('generic');
        setChatError(errMsg);
      }
      setMessages((prev) => prev.filter((m) => !(m.streaming && m.content === '')));
      setSending(false);
    },
    onRateLimit: (error, _limit, _used) => {
      wsStreamingMsgRef.current = false;
      chatAbortControllerRef.current = null;
      setChatErrorType('ratelimit');
      setChatError(error);
      toast.warning('AI Credits exhausted. Top up, upgrade, or bring your own API key.');
      setMessages((prev) => prev.filter((m) => !(m.streaming && m.content === '')));
      setSending(false);
    },
  });
  const abortWsChat = wsChat.abort;

  const finishAbortedChat = useCallback(() => {
    wsStreamingMsgRef.current = false;
    setInflightTools([]);
    setCompletedTools([]);
    setChatError(null);
    setChatErrorType(null);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (!last?.streaming) return prev;
      if (!last.content.trim()) return updated.slice(0, -1);
      updated[updated.length - 1] = {
        ...last,
        streaming: false,
        thinking: last.thinking?.streaming
          ? applyChatThinkingEvent(last.thinking, { phase: 'done', now: Date.now() })
          : last.thinking,
      };
      return updated;
    });
    setSending(false);
  }, []);

  const abortChatResponse = useCallback(() => {
    chatAbortControllerRef.current?.abort();
    chatAbortControllerRef.current = null;
    abortWsChat();
    finishAbortedChat();
    window.setTimeout(() => void loadChatSessions(), 500);
  }, [abortWsChat, finishAbortedChat, loadChatSessions]);

  // ─── Chat send ────────────────────────────────────────────

  const sendMessage = async (overrideText?: string, options?: { attachments?: ChatAttachmentPayload[] }) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    if (text.toLowerCase() === '/reset' || text.toLowerCase() === '/new') {
      setInput('');
      await startNewChatSession();
      return;
    }
    if (sendingRef.current || sendCooldown) {
      enqueueChatMessage(text, options);
      return;
    }
    if (agent?.status !== 'active') return;
    setInput('');
    setChatError(null);
    setChatErrorType(null);

    const currentSession = chatSessions.find((session) => session.current) ?? chatSessions[0];
    const selectedSession = chatSessions.find((session) => session.id === activeChatSessionIdRef.current);
    const selectedHistory = messages
      .filter((m) => !m.streaming)
      .slice(-40)
      .map((m) => ({ role: m.role, content: trimChatHistoryContent(m.content) }));
    const requestSessionId = selectedSession?.id ?? activeChatSessionIdRef.current ?? currentSession?.id ?? null;
    if (!historyLoadedRef.current || loadedChatSessionIdRef.current !== requestSessionId) {
      toast('info', 'Loading chat history. Try again in a moment.');
      return;
    }

    setSendCooldown(true);
    if (sendCooldownRef.current) clearTimeout(sendCooldownRef.current);
    sendCooldownRef.current = setTimeout(() => setSendCooldown(false), 2000);
    const userMsg: Message = { id: genId(), role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    chatAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    chatAbortControllerRef.current = abortController;
    const history = selectedHistory;
    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        role: 'assistant',
        content: '',
        streaming: true,
        timestamp: new Date(),
        thinking: { content: '', streaming: true, label: 'Thinking', startedAt: Date.now() },
      },
    ]);

    if (wsChat.isConnected) {
      wsStreamingMsgRef.current = true;
      const sent = wsChat.send(text, history, requestSessionId, options?.attachments);
      if (sent) {
        return;
      }
      wsStreamingMsgRef.current = false;
    }

    try {
      await api.chatStream(
        id,
        text,
        history,
        (token) => {
          setChatError(null);
          setChatErrorType(null);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.streaming) {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + token,
                thinking: last.thinking?.streaming
                  ? applyChatThinkingEvent(last.thinking, { phase: 'done', now: Date.now() })
                  : last.thinking,
              };
            }
            return updated;
          });
        },
        () => {
          setChatError(null);
          setChatErrorType(null);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.streaming) {
              if (!last.content) {
                return updated.filter((m) => m.id !== last.id);
              }
              updated[updated.length - 1] = {
                ...last,
                streaming: false,
                thinking: last.thinking?.streaming
                  ? applyChatThinkingEvent(last.thinking, { phase: 'done', now: Date.now() })
                  : last.thinking,
              };
            }
            return updated;
          });
          setSending(false);
          window.setTimeout(() => void loadChatSessions(), 500);
        },
        (errMsg) => {
          const lower = errMsg.toLowerCase();
          if (lower.includes('429') || lower.includes('rate limit') || lower.includes('daily limit') || lower.includes('ai credit') || lower.includes('credit')) {
            setChatErrorType('ratelimit');
            setChatError('AI Credits exhausted. Top up credits, upgrade for a larger monthly grant, or bring your own key.');
            toast.warning('AI Credits exhausted. Top up, upgrade, or bring your own API key.');
          } else if (lower.includes('503') || lower.includes('no_groq_key') || lower.includes('service unavailable') || lower.includes('groq') || lower.includes('llm') || lower.includes('proxy_error')) {
            setChatErrorType('llm_down');
            setChatError('AI service is temporarily unavailable.');
          } else if (lower.includes('timeout') || lower.includes('504') || lower.includes('502')) {
            setChatErrorType('timeout');
            setChatError('Agent had trouble thinking. Try again.');
          } else if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) {
            setChatErrorType('network');
            setChatError('Connection lost. Reconnecting...');
          } else {
            setChatErrorType('generic');
            setChatError('Agent had trouble thinking. Try again.');
          }
          setMessages((prev) => prev.filter((m) => !(m.streaming && m.content === '')));
          setSending(false);
        },
        (content) => {
          setMessages((prev) => [
            ...prev,
            { id: genId(), role: 'assistant', content, timestamp: new Date() },
          ]);
        },
        requestSessionId,
        options?.attachments,
        abortController.signal,
        handleChatToolEvent,
        handleChatThinkingEvent,
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        finishAbortedChat();
        return;
      }
      const errMessage = err instanceof Error ? err.message : 'Connection error';
      setChatErrorType('generic');
      setChatError(`Error: ${errMessage}`);
      setMessages((prev) => prev.filter((m) => !(m.streaming && m.content === '')));
      setSending(false);
    } finally {
      if (chatAbortControllerRef.current === abortController) {
        chatAbortControllerRef.current = null;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (typeof window !== 'undefined' && window.innerWidth < 768) return;
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    if (sending || sendCooldown || queuedChatCount === 0 || agent?.status !== 'active') return;
    const next = dequeueChatMessage();
    if (next) void sendMessage(next.text, next.options);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.status, dequeueChatMessage, queuedChatCount, sendCooldown, sending]);

  // ─── Clone ────────────────────────────────────────────────

  const [cloning, setCloning] = useState(false);
  const handleClone = async () => {
    setCloning(true);
    try {
      const res = await api.cloneAgent(id);
      if (res.success) {
        toast.success(`Agent cloned as "${res.data.name}"`);
        router.push(`/dashboard/agent/${res.data.id}`);
      } else {
        toast.error(res.error ?? 'Failed to clone agent');
      }
    } catch {
      toast.error('Failed to clone agent. Check your connection.');
    }
    setCloning(false);
  };

  // ─── Derived values ───────────────────────────────────────

  const statusInfo = agent ? (STATUS_STYLES[agent.status] ?? STATUS_STYLES.paused) : STATUS_STYLES.paused;
  const frameworkMeta = agent ? FRAMEWORKS[agent.framework] : undefined;
  // Treat transitional states (restarting/starting/stopping) as 'active' for
  // header controls so the Restart/Stop buttons stay visible (their loading
  // spinners surface the transition); avoids both buttons disappearing during
  // a restart and leaving the header empty.
  const isActive = agent?.status === 'active' || agent?.status === 'restarting' || agent?.status === 'starting' || agent?.status === 'stopping';
  const isNotActive = agent?.status === 'paused' || agent?.status === 'sleeping' || agent?.status === 'error' || agent?.status === 'stopped' || agent?.status === 'archived';
  const activeFeatureKeys = new Set(activeFeatures.map((f) => f.featureKey));

  const llmProvider = config.configProvider || (() => {
    const char = agent?.config ?? {};
    const settings = (char as Record<string, unknown>).settings as Record<string, unknown> | undefined;
    return (char as Record<string, unknown>).provider as string ?? settings?.modelProvider as string ?? 'openrouter';
  })();
  const activeModelDisplay = useMemo(
    () => {
      const saved = resolveLoadedModelConfig((agent?.config ?? {}) as Record<string, unknown>);
      return resolveActiveModelDisplay({ provider: saved.provider, model: saved.model });
    },
    [agent?.config],
  );
  const currentProviderMeta = getBYOKProvider(llmProvider);
  const providerModels = currentProviderMeta?.models ?? [];

  const displayUptime = stats?.uptimeSecs && stats.uptimeSecs > 0 ? stats.uptimeSecs : 0;
  const isLiveUptime = !!(stats?.uptimeSecs && stats.uptimeSecs > 0);

  // ─── Build context value ───────────────────────────────────

  const contextValue: AgentContextValue | null = useMemo(() => {
    if (!agent) return null;
    return {
      agent, id, stats, isActive, isNotActive, statusInfo, frameworkMeta,
      tab, setTab,
      logs: logs.logs, logsLoading: logs.logsLoading, logFilter: logs.logFilter,
      setLogFilter: logs.setLogFilter, logSearch: logs.logSearch, setLogSearch: logs.setLogSearch,
      autoScroll: logs.autoScroll, setAutoScroll: logs.setAutoScroll,
      filteredLogs: logs.filteredLogs, logsEndRef: logs.logsEndRef, loadLogs: logs.loadLogs, wsLogsConnected,
      messages, setMessages, input, setInput, sending, queuedChatCount,
      chatError, setChatError, chatErrorType, setChatErrorType,
      bottomRef, inputRef, sendMessage, abortChatResponse, handleKeyDown, sendCooldown,
      wsConnected: wsChat.isConnected,
      chatSessions,
      activeChatSessionId,
      setActiveChatSessionId,
      startNewChatSession,
      deleteChatSession,
      deletingChatSessionId,
      refreshChatSessions: loadChatSessions,
      inflightTools, completedTools,
      configName: config.configName, setConfigName: config.setConfigName,
      configDesc: config.configDesc, setConfigDesc: config.setConfigDesc,
      configBio: config.configBio, setConfigBio: config.setConfigBio,
      configLore: config.configLore, setConfigLore: config.setConfigLore,
      configTopics: config.configTopics, setConfigTopics: config.setConfigTopics,
      configStyle: config.configStyle, setConfigStyle: config.setConfigStyle,
      configAdjectives: config.configAdjectives, setConfigAdjectives: config.setConfigAdjectives,
      configSystemPrompt: config.configSystemPrompt, setConfigSystemPrompt: config.setConfigSystemPrompt,
      configSkills: config.configSkills, setConfigSkills: config.setConfigSkills,
      configModel: config.configModel, setConfigModel: config.setConfigModel,
      configProvider: config.configProvider, setConfigProvider: config.setConfigProvider,
      customModelInput: config.customModelInput, setCustomModelInput: config.setCustomModelInput,
      useCustomModel: config.useCustomModel, setUseCustomModel: config.setUseCustomModel,
      byokKeyInput: config.byokKeyInput, setByokKeyInput: config.setByokKeyInput,
      showByokKey: config.showByokKey, setShowByokKey: config.setShowByokKey,
      configIsPublic: config.configIsPublic, setConfigIsPublic: config.setConfigIsPublic,
      configPublicChatEnabled: config.configPublicChatEnabled, setConfigPublicChatEnabled: config.setConfigPublicChatEnabled,
      configPublicChatDailyAiCreditCap: config.configPublicChatDailyAiCreditCap,
      setConfigPublicChatDailyAiCreditCap: config.setConfigPublicChatDailyAiCreditCap,
      saving: config.saving, saveMsg: config.saveMsg, setSaveMsg: config.setSaveMsg,
      saveConfig: config.saveConfig,
      llmProvider, activeModelDisplay, currentProviderMeta, providerModels, hasApiKey: config.hasApiKey,
      displayUptime, isLiveUptime,
      activeFeatures, activeFeatureKeys, featuresLoading,
      unlocking: null, handleUnlockFeature: async () => {},
      integrationSecrets: integrations.integrationSecrets,
      expandedIntegrations: integrations.expandedIntegrations,
      visibleFields: integrations.visibleFields,
      savingIntegration: integrations.savingIntegration,
      integrationSaveMsg: integrations.integrationSaveMsg,
      toggleIntegrationExpanded: integrations.toggleIntegrationExpanded,
      toggleFieldVisibility: integrations.toggleFieldVisibility,
      setIntegrationField: integrations.setIntegrationField,
      saveIntegrationSecrets: integrations.saveIntegrationSecrets,
      disconnectIntegration: integrations.disconnectIntegration,
      hasExistingSecret: integrations.hasExistingSecret,
      actionLoading: actions.actionLoading, actionError: actions.actionError,
      actionSuccess: actions.actionSuccess, setActionError: actions.setActionError,
      handleAction: actions.handleAction, handleDelete: actions.handleDelete,
      deleteConfirm: actions.deleteConfirm, setDeleteConfirm: actions.setDeleteConfirm,
      deleting: actions.deleting, deleteError: actions.deleteError,
      setDeleteError: actions.setDeleteError,
      loadAgent, loadFeatures,
      isAuthenticated,
      userTier,
      viewMode, setViewMode,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, agent, stats, tab, logs.logs, logs.logsLoading, logs.logFilter, logs.logSearch, logs.autoScroll, logs.filteredLogs, wsLogsConnected,
    messages, input, sending, queuedChatCount, sendCooldown, chatError, chatErrorType, abortChatResponse,
    chatSessions, activeChatSessionId, setActiveChatSessionId, startNewChatSession, deleteChatSession, deletingChatSessionId, loadChatSessions,
    inflightTools, completedTools,
    config.configName, config.configDesc, config.configBio, config.configLore, config.configTopics,
    config.configStyle, config.configAdjectives, config.configSystemPrompt, config.configSkills,
    config.configModel, config.configProvider, config.customModelInput, config.useCustomModel,
    config.byokKeyInput, config.showByokKey, config.saving, config.saveMsg,
    integrations.integrationSecrets, integrations.expandedIntegrations, integrations.visibleFields,
    integrations.savingIntegration, integrations.integrationSaveMsg,
    activeFeatures, activeFeatureKeys, featuresLoading,
    actions.deleteConfirm, actions.deleting, actions.deleteError,
    actions.actionLoading, actions.actionError, actions.actionSuccess,
    llmProvider, activeModelDisplay, currentProviderMeta, providerModels, config.hasApiKey,
    displayUptime, isLiveUptime, isActive, isNotActive, statusInfo, frameworkMeta,
    isAuthenticated, userTier, viewMode]);

  // ─── Loading state ───────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 min-h-screen">
        <div className="mb-6">
          <Skeleton className="w-40 h-4 mb-6" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1">
              <Skeleton className="w-48 h-7 mb-2" />
              <Skeleton className="w-72 h-4 mb-2" />
              <Skeleton className="w-32 h-3" />
            </div>
          </div>
        </div>
        <Skeleton className="w-full h-10 mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="w-full h-48" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-[var(--text-primary)]">
        <div className="text-4xl mb-4 text-[var(--color-accent)]">{tNotFound('code')}</div>
        <h1 className="text-2xl font-bold mb-3">{tNotFound('title')}</h1>
        <p className="mb-6 text-[var(--text-muted)]">
          {tNotFound('description', { id })}
        </p>
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40 transition-colors"
        >
          <ArrowLeft size={16} /> {tNotFound('backToAgents')}
        </Link>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <AgentContext.Provider value={contextValue!}>
      <motion.div
        className="flex flex-col xl:flex-row"
        style={{ minHeight: 'calc(100dvh - 64px)' }}
        variants={pageEntranceVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ─── Sidebar (desktop) / Horizontal tabs (mobile) ── */}
        <AgentSidebar
          agent={agent}
          agents={ownedAgents}
          agentsLoading={ownedAgentsLoading}
          activeTab={tab}
          onTabChange={setTab}
        />

        {/* ─── Main Content ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-base)]">
          {/* Top action bar */}
          <div
            className="flex flex-wrap items-center gap-3 border-b border-[var(--border-default)] bg-[color-mix(in_srgb,var(--bg-surface)_92%,transparent)] px-4 py-3.5 backdrop-blur-md sm:px-6"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            {/* Status pill */}
            <AgentStatusPill status={agent.status} label={statusInfo.label} pulse={statusInfo.pulse} size="md" />

            <button
              type="button"
              onClick={() => setTab('config')}
              className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--accent)] sm:max-w-[420px]"
              title={`${activeModelDisplay.provider} · ${activeModelDisplay.name} · ${activeModelDisplay.route}`}
            >
              <span className="text-[var(--accent)]">AI route</span>
              <span className="min-w-0 truncate text-[var(--text-primary)]">
                {activeModelDisplay.name}
              </span>
              <span className="hidden text-[var(--text-muted)] md:inline">· {activeModelDisplay.provider}</span>
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Easy / Advanced mode toggle */}
            <div className="flex flex-shrink-0 items-center overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs">
              <button
                onClick={() => setViewMode('easy')}
                className={`px-3 py-2 font-semibold transition-colors ${viewMode === 'easy' ? 'bg-[var(--control-active)] text-[var(--control-active-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {tHeader('easy')}
              </button>
              <div className="h-5 w-px bg-[var(--border-line)]" aria-hidden="true" />
              <button
                onClick={() => setViewMode('advanced')}
                className={`px-3 py-2 font-semibold transition-colors ${viewMode === 'advanced' ? 'bg-[var(--control-active)] text-[var(--control-active-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {tHeader('advanced')}
              </button>
            </div>

            {/* Action buttons — v3 */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isActive && (
                <>
                  <button
                    onClick={() => actions.handleAction('restart')}
                    disabled={actions.actionLoading === 'restart'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:bg-[var(--tech-accent-soft)] hover:text-[var(--accent)] disabled:opacity-40"
                    title="Restart agent"
                  >
                    <RotateCcw size={12} className={actions.actionLoading === 'restart' ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">{actions.actionLoading === 'restart' ? tHeader('restarting') : tHeader('restart')}</span>
                  </button>
                  <button
                    onClick={() => actions.handleAction('stop')}
                    disabled={actions.actionLoading === 'stop'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:bg-[var(--tech-accent-soft)] hover:text-[var(--accent)] disabled:opacity-40"
                    title="Stop agent"
                  >
                    {actions.actionLoading === 'stop' ? (
                      <div className="w-3 h-3 rounded-full border-2 border-[var(--tech-accent-soft)] border-t-[var(--accent)] animate-spin" />
                    ) : (
                      <Square size={12} />
                    )}
                    <span className="hidden sm:inline">{actions.actionLoading === 'stop' ? tHeader('stopping') : tHeader('stop')}</span>
                  </button>
                </>
              )}
              {isNotActive && (
                <button
                  onClick={() => actions.handleAction('start')}
                  disabled={actions.actionLoading === 'start'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--action)] bg-[var(--action)] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(18,20,18,0.18)] transition-all hover:bg-[var(--action-hover)] disabled:opacity-40"
                  title="Start agent"
                >
                  {actions.actionLoading === 'start' ? (
                    <div className="w-3 h-3 border-2 border-[rgba(74,119,139,0.28)] border-t-[var(--accent)] rounded-full animate-spin" />
                  ) : (
                    <Play size={12} />
                  )}
                  <span className="hidden sm:inline">{actions.actionLoading === 'start' ? tHeader('starting') : tHeader('start')}</span>
                </button>
              )}
              <details className="group relative flex-shrink-0">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--accent)] [&::-webkit-details-marker]:hidden">
                  <MoreHorizontal size={13} />
                  <span className="hidden sm:inline">More</span>
                </summary>
                <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-64 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-2 shadow-[var(--shadow-card)]">
                  <button
                    onClick={() => {
                      const fw = agent?.framework || 'openclaw';
                      const name = agent?.name || 'My Agent';
                      const desc = agent?.description || 'an AI agent';
                      const text = `Check out "${name}" — ${desc}. Built on Hatcher with ${fw}.\n\nhatcher.host`;
                      if (navigator.share) {
                        navigator.share({ title: name, text, url: 'https://hatcher.host' }).catch(() => {});
                      } else {
                        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                        window.open(tweetUrl, '_blank', 'width=550,height=420');
                      }
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    title="Share agent"
                  >
                    <Share2 size={13} />
                    <span>{tHeader('share')}</span>
                  </button>
                  {agent?.framework && ['openclaw', 'hermes'].includes(agent.framework) && (
                    <Link
                      href={`/agent/${id}/room?from=dashboard`}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      title="Enter 3D Agent Room"
                    >
                      <Box size={13} aria-hidden />
                      <span>{tHeader('room')}</span>
                    </Link>
                  )}
                  <button
                    onClick={() => setPortModalOpen(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    title="Clone to another framework"
                  >
                    <Copy size={13} />
                    <span>{tHeader('clone')}</span>
                  </button>
                  <div className="my-1 h-px bg-[var(--border-line)]" />
                  <button
                    onClick={actions.handleDelete}
                    disabled={actions.deleting}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition disabled:opacity-40 ${
                      actions.deleteConfirm
                        ? 'bg-[var(--color-destructive)] text-[var(--bg-base)]'
                        : 'text-[var(--color-destructive)] hover:bg-[var(--color-destructive-bg)]'
                    }`}
                    title="Delete agent"
                  >
                    <Trash2 size={13} />
                    <span>{actions.deleting ? tHeader('deleting') : actions.deleteConfirm ? tHeader('confirm') : tHeader('delete')}</span>
                  </button>
                  {actions.deleteConfirm && !actions.deleting && (
                    <button
                      onClick={() => { actions.setDeleteConfirm(false); actions.setDeleteError(null); }}
                      className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      {tHeader('cancel')}
                    </button>
                  )}
                </div>
              </details>
            </div>
          </div>

          {actions.deleteError && (
            <p
              className="text-xs px-6 py-2 border-b border-[var(--color-destructive-border)] text-[var(--color-destructive)] bg-[var(--color-destructive-bg)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ✕ {actions.deleteError}
            </p>
          )}

          {/* ─── Tab Content ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 bg-[var(--bg-base)]">
            <div className={`${tab === 'chat' || tab === 'terminal' || tab === 'mail' || tab === 'dev' ? 'w-full max-w-none px-4 sm:px-6 lg:px-8 2xl:px-10' : 'max-w-[1280px] mx-auto px-4 sm:px-6'} py-6`}>
            <AnimatePresence mode="wait">
              {tab === 'overview' && <OverviewTab />}
              {tab === 'config' && <ConfigTab />}
              {tab === 'integrations' && <IntegrationsTab />}
              {(tab === 'skills' || tab === 'plugins') && <PluginsTab />}
              {tab === 'files' && <FilesTab />}
              {tab === 'logs' && <LogsTab />}
              {tab === 'memory' && (
                agent?.framework === 'hermes' ? <HermesMemoryTab /> :
                <MemoryTab />
              )}
              {tab === 'sessions' && (
                agent?.framework === 'openclaw' ? <OpenClawSessionsTab /> :
                null
              )}
              {tab === 'chat' && <ChatTab />}
              {tab === 'mail' && <MailTab />}
              {tab === 'dev' && <DevTab />}
              {tab === 'knowledge' && <KnowledgeTab />}
              {tab === 'wallet' && <WalletTab />}
              {tab === 'stats' && <StatsTab />}
              {tab === 'schedules' && <SchedulesTab />}
              {tab === 'workflows' && <WorkflowsTab />}
            </AnimatePresence>
            {terminalMounted && (
              <div className={tab === 'terminal' ? 'block' : 'hidden'} aria-hidden={tab !== 'terminal'}>
                <TerminalTab isVisible={tab === 'terminal'} />
              </div>
            )}
            </div>
          </div>
        </div>
      </motion.div>

      {agent && (
        <PortAgentModal
          agent={{ id: agent.id, name: agent.name, framework: agent.framework }}
          isOpen={portModalOpen}
          onClose={() => setPortModalOpen(false)}
        />
      )}
    </AgentContext.Provider>
  );
}
