'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getToken } from '@/lib/api';
import { API_URL } from '@/lib/config';
import type { Agent, AgentFeature } from '@/lib/api';

/** Extra fields the GET /agents/:id response includes beyond the base Agent type */
interface AgentDetail extends Agent {
  chatUsedToday?: number;
  chatLimit?: number | null;
  isByok?: boolean;
}
import { useAuth } from '@/lib/auth-context';
import { useWebSocketChat } from '@/hooks/useWebSocketChat';
import { FRAMEWORKS, TIERS, getBYOKProvider } from '@hatcher/shared';
import type { UserTierKey } from '@hatcher/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Share2,
  Copy,
} from 'lucide-react';
import {
  AgentContext,
  type Tab,
  type Message,
  type AgentStats,
  type AgentContextValue,
  genId,
  Skeleton,
  STATUS_STYLES,
  pageEntranceVariants,
} from '@/components/agents/AgentContext';
import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { PortAgentModal } from '@/components/agents/PortAgentModal';
import { useAgentConfig } from '@/hooks/useAgentConfig';
import { useAgentIntegrations } from '@/hooks/useAgentIntegrations';
import { useAgentActions } from '@/hooks/useAgentActions';
import { useAgentLogs } from '@/hooks/useAgentLogs';
import dynamic from 'next/dynamic';

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

const MemoryTab = dynamic(
  () => import('@/components/agents/tabs/MemoryTab').then(mod => ({ default: mod.MemoryTab })),
  { loading: () => <TabSkeleton /> }
);

const ElizaosMemoryTab = dynamic(
  () => import('@/components/agents/tabs/ElizaosMemoryTab').then(mod => ({ default: mod.ElizaosMemoryTab })),
  { loading: () => <TabSkeleton /> }
);

const ElizaosSessionsTab = dynamic(
  () => import('@/components/agents/tabs/ElizaosSessionsTab').then(mod => ({ default: mod.ElizaosSessionsTab })),
  { loading: () => <TabSkeleton /> }
);

const ElizaosPluginsTab = dynamic(
  () => import('@/components/agents/tabs/ElizaosPluginsTab').then(mod => ({ default: mod.ElizaosPluginsTab })),
  { loading: () => <TabSkeleton /> }
);

const MiladySkillsTab = dynamic(
  () => import('@/components/agents/tabs/MiladySkillsTab').then(mod => ({ default: mod.MiladySkillsTab })),
  { loading: () => <TabSkeleton /> }
);

const HermesSkillsTab = dynamic(
  () => import('@/components/agents/tabs/HermesSkillsTab').then(mod => ({ default: mod.HermesSkillsTab })),
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

const HermesConfigTab = dynamic(
  () => import('@/components/agents/tabs/HermesConfigTab').then(mod => ({ default: mod.HermesConfigTab })),
  { loading: () => <TabSkeleton /> }
);

const OpenClawConfigTab = dynamic(
  () => import('@/components/agents/tabs/OpenClawConfigTab').then(mod => ({ default: mod.OpenClawConfigTab })),
  { loading: () => <TabSkeleton /> }
);

const MiladyConfigTab = dynamic(
  () => import('@/components/agents/tabs/MiladyConfigTab').then(mod => ({ default: mod.MiladyConfigTab })),
  { loading: () => <TabSkeleton /> }
);

const MiladyPluginsTab = dynamic(
  () => import('@/components/agents/tabs/MiladyPluginsTab').then(mod => ({ default: mod.MiladyPluginsTab })),
  { loading: () => <TabSkeleton /> }
);

const MiladyRestartBanner = dynamic(
  () => import('@/components/agents/MiladyRestartBanner').then(mod => ({ default: mod.MiladyRestartBanner })),
  { ssr: false }
);

const StatsTab = dynamic(
  () => import('@/components/agents/tabs/StatsTab').then(mod => ({ default: mod.StatsTab })),
  { loading: () => <TabSkeleton /> }
);

const SchedulesTab = dynamic(
  () => import('@/components/agents/tabs/SchedulesTab').then(mod => ({ default: mod.SchedulesTab })),
  { loading: () => <TabSkeleton /> }
);

const SkillsTab = dynamic(
  () => import('@/components/agents/tabs/SkillsTab').then(mod => ({ default: mod.SkillsTab })),
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

const WorkspaceTab = dynamic(
  () => import('@/components/agents/tabs/WorkspaceTab').then(mod => ({ default: mod.WorkspaceTab })),
  { loading: () => <TabSkeleton /> },
);

const KnowledgeTab = dynamic(
  () => import('@/components/agents/tabs/KnowledgeTab').then(mod => ({ default: mod.KnowledgeTab })),
  { loading: () => <TabSkeleton /> },
);

// ─── Main Component ─────────────────────────────────────────

export default function AgentManagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  // View mode (easy = Chat/Integrations/Logs/Stats only, advanced = everything)
  const EASY_TABS: Tab[] = ['overview', 'chat', 'integrations', 'logs', 'stats'];
  const [viewMode, setViewModeRaw] = useState<'easy' | 'advanced'>('easy');
  useEffect(() => {
    const saved = localStorage.getItem('hatcher-view-mode') as 'easy' | 'advanced' | null;
    if (saved) setViewModeRaw(saved);
  }, []);
  const setViewMode = useCallback((mode: 'easy' | 'advanced') => {
    setViewModeRaw(mode);
    localStorage.setItem('hatcher-view-mode', mode);
    // If switching to Easy and the current tab isn't visible in Easy, go to Chat
    if (mode === 'easy') {
      setTabRaw(prev => EASY_TABS.includes(prev) ? prev : 'chat');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Core state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const validTabs: Tab[] = ['overview','config','integrations','skills','plugins','files','workspace','logs','terminal','memory','sessions','knowledge','schedules','workflows','chat','stats'];
  // 'skills' kept in validTabs for backwards compat (deep links), but redirects to plugins tab
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const rawTab = searchParams.get('tab') as Tab;
  const normalizeTab = (t: string | null): Tab => {
    if (!t) return 'overview';
    return validTabs.includes(t as Tab) ? (t as Tab) : 'overview';
  };
  const initialTab = normalizeTab(rawTab);
  const [tab, setTabRaw] = useState<Tab>(initialTab);
  const setTab = useCallback((t: Tab) => {
    setTabRaw(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  // Stats
  const [stats, setStats] = useState<AgentStats | null>(null);

  // Chat state
  const chatKey = `hatcher-chat-${id}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(false);
  const sendCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatErrorType, setChatErrorType] = useState<'timeout' | 'ratelimit' | 'network' | 'llm_down' | 'generic' | null>(null);
  const [msgCount, setMsgCount] = useState(0);
  const [portModalOpen, setPortModalOpen] = useState(false);

  const historyLoadedRef = useRef(false);
  const lastSavedCountRef = useRef(0);

  // Features / integrations
  const [activeFeatures, setActiveFeatures] = useState<AgentFeature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);

  const userTier = (user?.tier ?? 'free') as UserTierKey;
  const [hasUnlimitedChat, setHasUnlimitedChat] = useState(false);
  const [isByok, setIsByok] = useState(false);
  const [msgLimit, setMsgLimit] = useState(TIERS[userTier]?.messagesPerDay ?? TIERS.free.messagesPerDay);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wsLogsRef = useRef<WebSocket | null>(null);
  const [wsLogsConnected, setWsLogsConnected] = useState(false);
  const wsLogsReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsLogsRetryCountRef = useRef(0);
  const wsStreamingMsgRef = useRef(false);

  // ─── Custom hooks ─────────────────────────────────────────

  const config = useAgentConfig(agent, id, setAgent);
  const integrations = useAgentIntegrations(agent, id, setAgent);
  const logs = useAgentLogs(id);

  // ─── Data loaders ────────────────────────────────────────

  const loadAgent = useCallback(async () => {
    const res = await api.getAgent(id);
    setLoading(false);
    if (res.success) {
      setAgent(res.data);
      const agentData = res.data as AgentDetail;
      if (typeof agentData.chatUsedToday === 'number') {
        setMsgCount(agentData.chatUsedToday);
      }
      if (agentData.isByok) {
        setHasUnlimitedChat(true);
        setIsByok(true);
      } else if (typeof agentData.chatLimit === 'number' && agentData.chatLimit === 0) {
        setHasUnlimitedChat(true);
      } else if (typeof agentData.chatLimit === 'number' && agentData.chatLimit > 0) {
        setMsgLimit(agentData.chatLimit);
        setHasUnlimitedChat(false);
      }
    }
  }, [id]);

  const loadUsage = useCallback(async () => {
    try {
      const res = await api.getAgentUsage(id);
      if (res.success) {
        setMsgCount(res.data.messages.today);
        if (res.data.messages.isByok) {
          setHasUnlimitedChat(true);
          setIsByok(true);
        } else if (res.data.messages.limit === 0) {
          setHasUnlimitedChat(true);
          setIsByok(false);
        } else if (res.data.messages.limit > 0) {
          setMsgLimit(res.data.messages.limit);
          setHasUnlimitedChat(false);
        }
      }
    } catch {
      // Fall back to tier-based limit
    }
  }, [id]);

  const loadFeatures = useCallback(async () => {
    setFeaturesLoading(true);
    const res = await api.getAgentFeatures(id);
    setFeaturesLoading(false);
    if (res.success) setActiveFeatures(res.data);
  }, [id]);

  // ─── Actions hook (depends on loadAgent) ──────────────────

  const actions = useAgentActions(agent, id, loadAgent);

  // ─── Reset tab when agent ID changes ──────────────────────

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      const params = new URLSearchParams(window.location.search);
      setTab(normalizeTab(params.get('tab') as Tab));
      setMessages([]);
      logs.setLogs([]);
      setStats(null);
      setAgent(null);
      setLoading(true);
      historyLoadedRef.current = false;
      lastSavedCountRef.current = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─── Keep msgLimit in sync with userTier ──────────────────

  useEffect(() => {
    const tierLimit = TIERS[userTier]?.messagesPerDay ?? TIERS.free.messagesPerDay;
    setMsgLimit(tierLimit);
    if (tierLimit === 0) setHasUnlimitedChat(true);
  }, [userTier]);

  // ─── Initial load ─────────────────────────────────────────

  useEffect(() => { loadAgent(); loadUsage(); }, [loadAgent, loadUsage]);

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
        toast('success', 'Agent is ready to chat!');
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

      function connectWsLogs() {
        if (cancelled) return;
        const token = getToken();
        const apiBase = API_URL;
        const wsBase = apiBase.replace(/^http/, 'ws');
        const url = `${wsBase}/agents/${id}/logs/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        logs.setLogsLoading(true);
        const ws = new WebSocket(url);
        wsLogsRef.current = ws;

        ws.onopen = () => {
          wsLogsRetryCountRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as { type: string; timestamp?: string; level?: string; message?: string };
            if (msg.type === 'connected') {
              logs.setLogsLoading(false);
              setWsLogsConnected(true);
              // Also fetch initial batch via HTTP as fallback — WS stream
              // may not emit historical lines if Docker log file is empty/rotated
              logs.loadLogs();
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

  // ─── Load chat history from server on mount ───────────────

  useEffect(() => {
    if (!id) return;
    historyLoadedRef.current = false;
    api.getChatHistory(id).then(res => {
      if (res.success && res.data.messages.length > 0) {
        const raw = res.data.messages as { role: string; content: string; ts: number }[];
        const deduped: typeof raw = [];
        for (const m of raw) {
          const prev = deduped[deduped.length - 1];
          if (prev && prev.role === m.role && prev.content === m.content) continue;
          deduped.push(m);
        }
        const loaded = deduped.map((m, i) => ({
          id: `hist-${i}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.ts ? new Date(m.ts) : new Date(),
        }));
        setMessages(loaded);
        lastSavedCountRef.current = loaded.length;
      }
      historyLoadedRef.current = true;
    }).catch(() => {
      historyLoadedRef.current = true;
    });
  }, [id]);

  // ─── Save chat history to server (debounced) ──────────────

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (messages.length === 0 || !id) return;
    if (!historyLoadedRef.current) return;
    const complete = messages.filter(m => !m.streaming && m.content);
    if (complete.length === 0) return;
    if (complete.length <= lastSavedCountRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      lastSavedCountRef.current = complete.length;
      const toSave = complete.map(m => ({ role: m.role, content: m.content, ts: m.timestamp?.getTime() }));
      const deduped: typeof toSave = [];
      for (const m of toSave) {
        const prev = deduped[deduped.length - 1];
        if (prev && prev.role === m.role && prev.content === m.content) continue;
        deduped.push(m);
      }
      api.saveChatHistory(id, deduped).catch(() => {});
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

  const wsChat = useWebSocketChat({
    agentId: id,
    enabled: isAuthenticated && !!id,
    onToken: (token) => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          updated[updated.length - 1] = { ...last, content: last.content + token };
        }
        return updated;
      });
    },
    onDone: (_content, _model) => {
      wsStreamingMsgRef.current = false;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          if (!last.content) {
            return updated.filter((m) => m.id !== last.id);
          }
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
      if (!_content) {
        setChatErrorType('generic');
        setChatError('Agent returned an empty response. Try again or check if the agent is running.');
      }
      setSending(false);
    },
    onError: (errMsg) => {
      wsStreamingMsgRef.current = false;
      const lower = errMsg.toLowerCase();
      if (lower.includes('429') || lower.includes('rate limit') || lower.includes('daily limit')) {
        setChatErrorType('ratelimit');
        setChatError('Daily message limit reached. Upgrade to Pro for more, or bring your own key for unlimited.');
        toast.warning('Daily limit reached. Upgrade to Pro or bring your own API key for unlimited.');
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
      setChatErrorType('ratelimit');
      setChatError(error);
      toast.warning('Daily limit reached. Upgrade to Pro or bring your own API key for unlimited.');
      setMessages((prev) => prev.filter((m) => !(m.streaming && m.content === '')));
      setSending(false);
    },
  });

  // ─── Chat send ────────────────────────────────────────────

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending || sendCooldown) return;
    if (agent?.status !== 'active') return;
    if (!hasUnlimitedChat && msgCount >= msgLimit) {
      setChatErrorType('ratelimit');
      setChatError('Daily message limit reached. Upgrade to Pro for more, or bring your own key for unlimited.');
      toast.warning('Daily limit reached. Upgrade to Pro or bring your own API key for unlimited.');
      return;
    }
    setInput('');
    setChatError(null);
    setChatErrorType(null);

    setSendCooldown(true);
    if (sendCooldownRef.current) clearTimeout(sendCooldownRef.current);
    sendCooldownRef.current = setTimeout(() => setSendCooldown(false), 2000);
    const userMsg: Message = { id: genId(), role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setMsgCount((c) => c + 1);
    const history = messages
      .filter((m) => !m.streaming)
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { id: genId(), role: 'assistant', content: '', streaming: true, timestamp: new Date() }]);

    if (wsChat.isConnected) {
      wsStreamingMsgRef.current = true;
      const sent = wsChat.send(text, history);
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
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.streaming) {
              updated[updated.length - 1] = { ...last, content: last.content + token };
            }
            return updated;
          });
        },
        () => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.streaming) {
              if (!last.content) {
                return updated.filter((m) => m.id !== last.id);
              }
              updated[updated.length - 1] = { ...last, streaming: false };
            }
            return updated;
          });
          setSending(false);
        },
        (errMsg) => {
          const lower = errMsg.toLowerCase();
          if (lower.includes('429') || lower.includes('rate limit') || lower.includes('daily limit')) {
            setChatErrorType('ratelimit');
            setChatError('Daily message limit reached. Upgrade to Pro for more, or bring your own key for unlimited.');
            toast.warning('Daily limit reached. Upgrade to Pro or bring your own API key for unlimited.');
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
        }
      );
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Connection error';
      setChatErrorType('generic');
      setChatError(`Error: ${errMessage}`);
      setMessages((prev) => prev.filter((m) => !(m.streaming && m.content === '')));
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (typeof window !== 'undefined' && window.innerWidth < 768) return;
      e.preventDefault();
      sendMessage();
    }
  };

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
  const isNotActive = agent?.status === 'paused' || agent?.status === 'sleeping' || agent?.status === 'error' || agent?.status === 'stopped';

  const activeFeatureKeys = new Set(activeFeatures.map((f) => f.featureKey));

  const remaining = !hasUnlimitedChat ? Math.max(0, msgLimit - msgCount) : null;
  const isLimitReached = !hasUnlimitedChat && remaining !== null && remaining === 0;

  const llmProvider = config.configProvider || (() => {
    const char = agent?.config ?? {};
    const settings = (char as Record<string, unknown>).settings as Record<string, unknown> | undefined;
    return (settings?.modelProvider as string) ?? (char as Record<string, unknown>).provider as string ?? 'groq';
  })();
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
      messages, setMessages, input, setInput, sending,
      chatError, setChatError, chatErrorType, setChatErrorType,
      msgCount, hasUnlimitedChat, isByok, msgLimit, remaining, isLimitReached,
      bottomRef, inputRef, sendMessage, handleKeyDown, sendCooldown,
      wsConnected: wsChat.isConnected,
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
      saving: config.saving, saveMsg: config.saveMsg, setSaveMsg: config.setSaveMsg,
      saveConfig: config.saveConfig,
      llmProvider, currentProviderMeta, providerModels, hasApiKey: config.hasApiKey,
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
    messages, input, sending, sendCooldown, chatError, chatErrorType, msgCount, msgLimit, remaining, isLimitReached,
    config.configName, config.configDesc, config.configBio, config.configLore, config.configTopics,
    config.configStyle, config.configAdjectives, config.configSystemPrompt, config.configSkills,
    config.configModel, config.configProvider, config.customModelInput, config.useCustomModel,
    config.byokKeyInput, config.showByokKey, config.saving, config.saveMsg,
    integrations.integrationSecrets, integrations.expandedIntegrations, integrations.visibleFields,
    integrations.savingIntegration, integrations.integrationSaveMsg,
    activeFeatures, activeFeatureKeys, featuresLoading,
    actions.deleteConfirm, actions.deleting, actions.deleteError,
    actions.actionLoading, actions.actionError, actions.actionSuccess,
    llmProvider, currentProviderMeta, providerModels, config.hasApiKey,
    displayUptime, isLiveUptime, isActive, isNotActive, statusInfo, frameworkMeta,
    isAuthenticated, userTier, hasUnlimitedChat, viewMode]);

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
        <div className="text-4xl mb-4 text-[var(--color-accent)]">404</div>
        <h1 className="text-2xl font-bold mb-3">Agent Not Found</h1>
        <p className="mb-6 text-[var(--text-muted)]">
          The agent with ID &quot;{id}&quot; could not be found.
        </p>
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Agents
        </Link>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <AgentContext.Provider value={contextValue!}>
      <motion.div
        className="flex flex-col lg:flex-row"
        style={{ minHeight: 'calc(100dvh - 64px)' }}
        variants={pageEntranceVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ─── Sidebar (desktop) / Horizontal tabs (mobile) ── */}
        <AgentSidebar agent={agent} activeTab={tab} onTabChange={setTab} />

        {/* ─── Main Content ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top action bar */}
          <div className="px-4 sm:px-6 py-3 border-b border-[var(--border-default)] flex items-center gap-3 flex-wrap">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${statusInfo.classes}`}>
              {statusInfo.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusInfo.dotColor} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusInfo.dotColor}`} />
                </span>
              )}
              {statusInfo.label}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Easy / Advanced mode toggle */}
            <div className="flex items-center rounded-lg border border-[var(--border-default)] overflow-hidden text-xs flex-shrink-0">
              <button
                onClick={() => setViewMode('easy')}
                className={`px-2.5 py-1.5 transition-colors ${viewMode === 'easy' ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                Easy
              </button>
              <div className="w-px h-4 bg-[var(--border-default)]" aria-hidden="true" />
              <button
                onClick={() => setViewMode('advanced')}
                className={`px-2.5 py-1.5 transition-colors ${viewMode === 'advanced' ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                Advanced
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isActive && (
                <>
                  <button
                    onClick={() => actions.handleAction('restart')}
                    disabled={actions.actionLoading === 'restart'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/10 transition-all disabled:opacity-40"
                    title="Restart agent"
                  >
                    <RotateCcw size={13} className={actions.actionLoading === 'restart' ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">{actions.actionLoading === 'restart' ? 'Restarting...' : 'Restart'}</span>
                  </button>
                  <button
                    onClick={() => actions.handleAction('stop')}
                    disabled={actions.actionLoading === 'stop'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-40"
                    title="Stop agent"
                  >
                    {actions.actionLoading === 'stop' ? (
                      <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    ) : (
                      <Square size={13} />
                    )}
                    <span className="hidden sm:inline">{actions.actionLoading === 'stop' ? 'Stopping...' : 'Stop'}</span>
                  </button>
                </>
              )}
              {isNotActive && (
                <button
                  onClick={() => actions.handleAction('start')}
                  disabled={actions.actionLoading === 'start'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-40"
                  title="Start agent"
                >
                  {actions.actionLoading === 'start' ? (
                    <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  ) : (
                    <Play size={13} />
                  )}
                  <span className="hidden sm:inline">{actions.actionLoading === 'start' ? 'Starting...' : 'Start'}</span>
                </button>
              )}
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/10 transition-all"
                title="Share agent"
              >
                <Share2 size={13} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => setPortModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-300 transition-all"
                title="Clone to another framework"
              >
                <Copy size={13} />
                <span className="hidden sm:inline">Clone</span>
              </button>
              <button
                onClick={actions.handleDelete}
                disabled={actions.deleting}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all disabled:opacity-40 ${
                  actions.deleteConfirm
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                    : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                }`}
                title="Delete agent"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">{actions.deleting ? 'Deleting...' : actions.deleteConfirm ? 'Confirm' : 'Delete'}</span>
              </button>
              {actions.deleteConfirm && !actions.deleting && (
                <button
                  onClick={() => { actions.setDeleteConfirm(false); actions.setDeleteError(null); }}
                  className="text-xs px-2 py-1 transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {actions.deleteError && (
            <p className="text-xs text-red-400 px-6 py-2 border-b border-[rgba(46,43,74,0.2)]">{actions.deleteError}</p>
          )}

          {/* M4: "Restart required" banner for Milady agents with pendingRestart=true */}
          {agent?.framework === 'milady' && agent?.status === 'active' && <MiladyRestartBanner />}

          {/* ─── Tab Content ──────────────────────────────────── */}
          <div className={`flex-1 px-4 sm:px-6 py-6 min-w-0`}>
            <AnimatePresence mode="wait">
              {tab === 'overview' && <OverviewTab />}
              {tab === 'config' && (
                agent?.framework === 'hermes' ? <HermesConfigTab /> :
                agent?.framework === 'milady' ? <MiladyConfigTab /> :
                (agent?.framework === 'openclaw' && agent?.managementMode === 'managed') ? (
                  // Managed OpenClaw: stack the live PATCH editor on top of
                  // the legacy DB-backed form. Live editor handles runtime
                  // tweaks (tools profile, logging, session scope), the old
                  // form still owns model selection + rebuild-required settings.
                  <div className="space-y-6">
                    <OpenClawConfigTab />
                    <ConfigTab />
                  </div>
                ) : <ConfigTab />
              )}
              {tab === 'integrations' && <IntegrationsTab />}
              {(tab === 'skills' || tab === 'plugins') && <PluginsTab />}
              {tab === 'files' && <FilesTab />}
              {tab === 'workspace' && <WorkspaceTab />}
              {tab === 'logs' && <LogsTab />}
              {tab === 'terminal' && <TerminalTab />}
              {tab === 'memory' && (
                agent?.framework === 'elizaos' ? <ElizaosMemoryTab /> :
                agent?.framework === 'hermes' ? <HermesMemoryTab /> :
                <MemoryTab />
              )}
              {tab === 'sessions' && (
                agent?.framework === 'elizaos' ? <ElizaosSessionsTab /> :
                agent?.framework === 'openclaw' ? <OpenClawSessionsTab /> :
                null
              )}
              {tab === 'chat' && <ChatTab />}
              {tab === 'knowledge' && <KnowledgeTab />}
              {tab === 'stats' && <StatsTab />}
              {tab === 'schedules' && <SchedulesTab />}
              {tab === 'workflows' && <WorkflowsTab />}
            </AnimatePresence>
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
