'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getToken } from '@/lib/api';
import { API_URL } from '@/lib/config';
import type { Agent, AgentFeature } from '@/lib/api';
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
  Copy,
} from 'lucide-react';
import {
  AgentContext,
  type Tab,
  type Message,
  type LogEntry,
  type LogFilter,
  type AgentStats,
  type IntegrationDef,
  type AgentContextValue,
  genId,
  integrationStateKey,
  Skeleton,
  STATUS_STYLES,
  pageEntranceVariants,
} from '@/components/agents/AgentContext';
import { AgentSidebar } from '@/components/agents/AgentSidebar';
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

const WorkflowsTab = dynamic(
  () => import('@/components/agents/tabs/WorkflowsTab').then(mod => ({ default: mod.WorkflowsTab })),
  { loading: () => <TabSkeleton /> }
);

const TerminalTab = dynamic(
  () => import('@/components/agents/tabs/TerminalTab').then(mod => ({ default: mod.TerminalTab })),
  { loading: TabSkeleton },
);
// ─── Tab definitions ─────────────────────────────────────────

// ─── Main Component ─────────────────────────────────────────

export default function AgentManagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  // Core state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const validTabs: Tab[] = ['overview','config','integrations','skills','files','logs','memory','knowledge','versions','chat','stats'];
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const rawTab = searchParams.get('tab') as Tab;
  // Redirect legacy tab names to stats
  const normalizeTab = (t: Tab | null): Tab => {
    if (!t) return 'overview';
    if (t === 'analytics' || t === 'usage' || t === 'health') return 'stats';
    return validTabs.includes(t) ? t : 'overview';
  };
  const initialTab = normalizeTab(rawTab);
  const [tab, setTabRaw] = useState<Tab>(initialTab);
  const setTab = useCallback((t: Tab) => {
    setTabRaw(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  // Reset tab when agent ID changes (fixes navigation between agents keeping stale tab)
  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      const params = new URLSearchParams(window.location.search);
      setTab(normalizeTab(params.get('tab') as Tab));
      // Reset chat and other per-agent state
      setMessages([]);
      setLogs([]);
      setStats(null);
      setAgent(null);
      setLoading(true);
      historyLoadedRef.current = false;
      lastSavedCountRef.current = 0;
    }
  }, [id]);

  // Stats
  const [stats, setStats] = useState<AgentStats | null>(null);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<LogFilter>('all');
  const [logSearch, setLogSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsLogsRef = useRef<WebSocket | null>(null);

  // Chat state — restore from localStorage so history survives tab switches and soft navs
  const chatKey = `hatcher-chat-${id}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(false);
  const sendCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatErrorType, setChatErrorType] = useState<'timeout' | 'ratelimit' | 'network' | 'llm_down' | 'generic' | null>(null);
  const [msgCount, setMsgCount] = useState(0);

  // Track whether history has been loaded from server (to avoid saving during load)
  const historyLoadedRef = useRef(false);
  // Track the last saved message count to avoid redundant saves
  const lastSavedCountRef = useRef(0);

  // Load chat history from server on mount
  useEffect(() => {
    if (!id) return;
    historyLoadedRef.current = false;
    api.getChatHistory(id).then(res => {
      if (res.success && res.data.messages.length > 0) {
        // Deduplicate: skip consecutive messages with same role+content
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

  // Save full chat history to server after new messages arrive (debounced).
  // Only triggers when new messages are added (not on initial load).
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (messages.length === 0 || !id) return;
    // Don't save if history hasn't finished loading from server yet
    if (!historyLoadedRef.current) return;
    // Only save non-streaming complete messages
    const complete = messages.filter(m => !m.streaming && m.content);
    if (complete.length === 0) return;
    // Skip if no new messages since last save (prevents re-save on load)
    if (complete.length <= lastSavedCountRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      lastSavedCountRef.current = complete.length;
      // Deduplicate before saving: skip consecutive same role+content
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── WebSocket streaming chat ──────────────────────────────
  // Refs used by WS callbacks to avoid stale closures
  const wsStreamingMsgRef = useRef(false);

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
            // Empty response — remove the bubble instead of showing empty
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

  // Config state
  const [configName, setConfigName] = useState('');
  const [configDesc, setConfigDesc] = useState('');
  const [configBio, setConfigBio] = useState('');
  const [configLore, setConfigLore] = useState('');
  const [configTopics, setConfigTopics] = useState('');
  const [configStyle, setConfigStyle] = useState('');
  const [configAdjectives, setConfigAdjectives] = useState('');
  const [configSystemPrompt, setConfigSystemPrompt] = useState('');
  const [configSkills, setConfigSkills] = useState('');
  const [configModel, setConfigModel] = useState('');
  const [configProvider, setConfigProvider] = useState('groq');
  const [customModelInput, setCustomModelInput] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [byokKeyInput, setByokKeyInput] = useState('');
  const [showByokKey, setShowByokKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Integration secrets config
  const [integrationSecrets, setIntegrationSecrets] = useState<Record<string, Record<string, string>>>({});
  const [expandedIntegrations, setExpandedIntegrations] = useState<Set<string>>(new Set());
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [savingIntegration, setSavingIntegration] = useState<string | null>(null);
  const [integrationSaveMsg, setIntegrationSaveMsg] = useState<Record<string, string>>({});

  // Features / integrations
  const [activeFeatures, setActiveFeatures] = useState<AgentFeature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  // unlocking state removed — features are now tier-based

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const userTier = (user?.tier ?? 'free') as UserTierKey;
  const [hasUnlimitedChat, setHasUnlimitedChat] = useState(false);
  const [isByok, setIsByok] = useState(false);
  const [msgLimit, setMsgLimit] = useState(TIERS[userTier]?.messagesPerDay ?? TIERS.free.messagesPerDay);

  // Keep msgLimit in sync with userTier when it changes (e.g. after profile loads)
  useEffect(() => {
    const tierLimit = TIERS[userTier]?.messagesPerDay ?? TIERS.free.messagesPerDay;
    setMsgLimit(tierLimit);
    // messagesPerDay === 0 means unlimited for this tier
    if (tierLimit === 0) setHasUnlimitedChat(true);
  }, [userTier]);

  // Fetch actual usage data from the usage endpoint (authoritative source for limits + BYOK)
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
      // Usage endpoint failed — fall back to tier-based limit from user profile
    }
  }, [id]);

  // ─── Data loaders ────────────────────────────────────────

  const loadAgent = useCallback(async () => {
    const res = await api.getAgent(id);
    setLoading(false);
    if (res.success) {
      setAgent(res.data);
      // Use chat usage/limit from the agent response if available
      const agentData = res.data as any;
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
      setConfigName(res.data.name);
      setConfigDesc(res.data.description ?? '');
      const char = res.data.config ?? {};
      setConfigBio((char as Record<string, unknown>).bio as string ?? '');
      setConfigLore(Array.isArray((char as Record<string, unknown>).lore) ? ((char as Record<string, unknown>).lore as string[]).join('\n') : '');
      setConfigTopics(Array.isArray((char as Record<string, unknown>).topics) ? ((char as Record<string, unknown>).topics as string[]).join(', ') : '');
      setConfigAdjectives(Array.isArray((char as Record<string, unknown>).adjectives) ? ((char as Record<string, unknown>).adjectives as string[]).join(', ') : '');
      const styleObj = (char as Record<string, unknown>).style as Record<string, string[]> | undefined;
      setConfigStyle(
        styleObj?.all?.length ? styleObj.all.join('\n')
          : styleObj?.chat?.length ? styleObj.chat.join('\n')
          : ''
      );
      setConfigSystemPrompt((char as Record<string, unknown>).systemPrompt as string ?? '');
      setConfigSkills(Array.isArray((char as Record<string, unknown>).skills) ? ((char as Record<string, unknown>).skills as string[]).join(', ') : '');
      const loadedModel =
        ((char as Record<string, unknown>).settings as Record<string, unknown>)?.model as string ??
        (char as Record<string, unknown>).model as string ?? '';
      setConfigModel(loadedModel);
      const loadedProvider =
        ((char as Record<string, unknown>).settings as Record<string, unknown>)?.modelProvider as string ??
        (char as Record<string, unknown>).provider as string ?? 'groq';
      setConfigProvider(loadedProvider.toLowerCase());
      const providerMeta = getBYOKProvider(loadedProvider.toLowerCase());
      if (loadedModel && providerMeta && !providerMeta.models.some(m => m.id === loadedModel)) {
        setUseCustomModel(true);
        setCustomModelInput(loadedModel);
      }
    }
  }, [id]);

  const loadFeatures = useCallback(async () => {
    setFeaturesLoading(true);
    const res = await api.getAgentFeatures(id);
    setFeaturesLoading(false);
    if (res.success) setActiveFeatures(res.data);
  }, [id]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    const res = await api.getAgentLogs(id);
    setLogsLoading(false);
    if (res.success) {
      const raw = res.data.logs;
      const parsed: LogEntry[] = raw.map((entry: string | LogEntry) => {
        if (typeof entry === 'object' && entry.message) return entry;
        const line = String(entry);
        let timestamp = new Date().toISOString();
        let level: LogEntry['level'] = 'info';
        let message = line;
        const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s+(.*)/);
        if (tsMatch) { timestamp = tsMatch[1]!; message = tsMatch[2]!; }
        if (/\[?error\]?/i.test(message)) level = 'error';
        else if (/\[?warn(ing)?\]?/i.test(message)) level = 'warn';
        return { timestamp, level, message };
      });
      setLogs(parsed);
    }
  }, [id]);

  // Initial load
  useEffect(() => { loadAgent(); loadUsage(); }, [loadAgent, loadUsage]);

  // Poll agent status every 5s while agent is starting up (not yet active/error)
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
  }, [agent?.status, id]);

  // Guided onboarding for newly created agents (?new=1 query param)
  useEffect(() => {
    if (typeof window === 'undefined' || !id) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') return;
    const onboardKey = `hatcher-onboarded-${id}`;
    if (localStorage.getItem(onboardKey)) return;

    // Switch to chat tab and inject welcome message
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

    // Mark as onboarded and clean URL
    localStorage.setItem(onboardKey, '1');
    const url = new URL(window.location.href);
    url.searchParams.delete('new');
    window.history.replaceState({}, '', url.pathname + (url.search || ''));
  }, [id]);

  const agentStatus = agent?.status;

  // Load stats
  useEffect(() => {
    if (!agent) return;
    api.getAgentStats(id).then((res) => {
      if (res.success) setStats(res.data);
    });
  }, [agent, id]);

  // Load logs: WebSocket streaming when agent is active + Pro, static fetch otherwise
  useEffect(() => {
    if (!(tab === 'logs' || tab === 'overview') || !agentStatus) return;
    if (wsLogsRef.current) {
      wsLogsRef.current.close();
      wsLogsRef.current = null;
    }
    const isActiveStatus = agentStatus === 'active';
    const wantsStream = tab === 'logs' && isActiveStatus && (userTier === 'pro' || userTier === 'business' || userTier === 'founding_member');
    if (wantsStream) {
      const token = getToken();
      const apiBase = API_URL;
      const wsBase = apiBase.replace(/^http/, 'ws');
      const url = `${wsBase}/agents/${id}/logs/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      setLogsLoading(true);
      const ws = new WebSocket(url);
      wsLogsRef.current = ws;
      ws.onopen = () => { /* auth sent via query param */ };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string; timestamp?: string; level?: string; message?: string };
          if (msg.type === 'connected') {
            setLogsLoading(false);
          } else if (msg.type === 'log' && msg.timestamp && msg.message) {
            const entry: LogEntry = {
              timestamp: msg.timestamp,
              level: (msg.level as LogEntry['level']) ?? 'info',
              message: msg.message,
            };
            setLogs((prev) => {
              const next = [...prev, entry];
              return next.length > 200 ? next.slice(next.length - 200) : next;
            });
          } else if (msg.type === 'disconnected') {
            setLogsLoading(false);
          } else if (msg.type === 'error') {
            setLogsLoading(false);
          }
        } catch { /* Ignore unparseable messages */ }
      };
      ws.onerror = () => {
        setLogsLoading(false);
        wsLogsRef.current = null;
        loadLogs();
      };
      ws.onclose = () => {
        setLogsLoading(false);
        wsLogsRef.current = null;
      };
    } else {
      loadLogs();
      // Poll every 10s for non-Pro users (Pro gets WebSocket streaming)
      if (tab === 'logs' && isActiveStatus) {
        const interval = setInterval(loadLogs, 10_000);
        return () => clearInterval(interval);
      }
    }
    return () => {
      if (wsLogsRef.current) {
        wsLogsRef.current.close();
        wsLogsRef.current = null;
      }
    };
  }, [tab, agentStatus, id, loadLogs, userTier]);

  // Load features when integrations or config tab
  useEffect(() => {
    if ((tab === 'integrations' || tab === 'config') && agentStatus) loadFeatures();
  }, [tab, agentStatus, loadFeatures]);

  // Pre-populate channel settings from agent config (dmPolicy, groupPolicy, streaming)
  // Maps channelSettings.telegram → openclaw.platform.telegram state key
  const CHANNEL_TO_FEATURE: Record<string, string> = {
    telegram: 'openclaw.platform.telegram',
    discord: 'openclaw.platform.discord',
    slack: 'openclaw.platform.slack',
    whatsapp: 'openclaw.platform.whatsapp',
    twitter: 'openclaw.platform.twitter',
    xurl: 'openclaw.platform.twitter',
    signal: 'openclaw.platform.signal',
    irc: 'openclaw.platform.irc',
    matrix: 'openclaw.platform.matrix',
  };
  useEffect(() => {
    if (!agent) return;
    const config = (agent.config ?? {}) as Record<string, unknown>;
    const cs = config.channelSettings as Record<string, Record<string, unknown>> | undefined;
    if (!cs || typeof cs !== 'object') return;
    setIntegrationSecrets((prev) => {
      const next = { ...prev };
      for (const [channel, settings] of Object.entries(cs)) {
        if (!settings || typeof settings !== 'object') continue;
        const sk = CHANNEL_TO_FEATURE[channel.toLowerCase()] ?? channel.toLowerCase();
        const mapped: Record<string, string> = {};
        if (settings.dmPolicy) mapped._CS_DM_POLICY = String(settings.dmPolicy);
        if (settings.groupPolicy) mapped._CS_GROUP_POLICY = String(settings.groupPolicy);
        if (settings.streaming) mapped._CS_STREAMING = String(settings.streaming);
        if (Array.isArray(settings.allowFrom)) mapped._CS_DM_ALLOWLIST = settings.allowFrom.join(', ');
        if (Array.isArray(settings.groupAllowFrom)) mapped._CS_GROUP_ALLOWLIST = settings.groupAllowFrom.join(', ');
        if (Object.keys(mapped).length > 0) {
          next[sk] = { ...(next[sk] ?? {}), ...mapped };
        }
      }
      return next;
    });
  }, [agent]);

  // Auto-scroll chat — handled by ChatTab's MutationObserver (no page-level scroll)

  // Auto-focus chat input
  useEffect(() => {
    if (tab === 'chat' && !loading && agent) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [tab, loading, agent]);

  // Auto-scroll logs — only scroll within the log viewer container, not the page
  useEffect(() => {
    if (!autoScroll || tab !== 'logs') return;
    const el = logsEndRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs.length, autoScroll, tab]);

  // ─── Actions ─────────────────────────────────────────────

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!agent) return;
    setActionLoading(action);
    setActionError(null);
    setActionSuccess(null);
    try {
      let res;
      if (action === 'start') res = await api.startAgent(id);
      else if (action === 'stop') res = await api.stopAgent(id);
      else if (action === 'restart') res = await api.restartAgent(id);
      if (res && !res.success) {

        toast.error(`Failed to ${action} agent: ${res.error ?? 'Unknown error'}`);
      } else if (res?.success) {

        const labels = { start: 'started', stop: 'stopped', restart: 'restarted' };
        toast.success(`Agent ${labels[action]} successfully`);
      }
    } catch {
      toast.error(`Failed to ${action} agent. Check your connection.`);
    }
    await loadAgent();
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    setDeleteError(null);
    const res = await api.deleteAgent(id);
    if (res.success) {
      router.push('/dashboard/agents');
    } else {
      setDeleting(false);
      setDeleteConfirm(false);
      setDeleteError(res.error ?? 'Failed to delete agent. Please try again.');
    }
  };

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

  // handleUnlockFeature removed — features are now tier-based

  // ─── Integration config helpers ─────────────────────────────

  const toggleIntegrationExpanded = (featureKey: string) => {
    setExpandedIntegrations((prev) => {
      const next = new Set(prev);
      if (next.has(featureKey)) next.delete(featureKey);
      else next.add(featureKey);
      return next;
    });
  };

  const toggleFieldVisibility = (fieldKey: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey);
      else next.add(fieldKey);
      return next;
    });
  };

  const setIntegrationField = (featureKey: string, fieldKey: string, value: string) => {
    setIntegrationSecrets((prev) => ({
      ...prev,
      [featureKey]: {
        ...(prev[featureKey] ?? {}),
        [fieldKey]: value,
      },
    }));
  };

  const hasExistingSecret = (secretKey: string): boolean => {
    if (!agent) return false;
    const config = (agent.config ?? {}) as Record<string, unknown>;
    return !!(config as Record<string, string>)[secretKey];
  };

  const saveIntegrationSecrets = async (integration: IntegrationDef) => {
    if (!agent) return;
    const sk = integrationStateKey(integration);
    setSavingIntegration(sk);
    setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' }));

    const secrets = integrationSecrets[sk] ?? {};
    const filteredSecrets: Record<string, string> = {};
    const channelSettingsUpdate: Record<string, string> = {};
    for (const [k, v] of Object.entries(secrets)) {
      if (!v || !v.trim()) continue;
      if (k.startsWith('_CS_')) {
        channelSettingsUpdate[k] = v.trim();
      } else {
        filteredSecrets[k] = v.trim();
      }
    }

    const missingRequired = integration.fields
      .filter((f) => f.required && !filteredSecrets[f.key] && !hasExistingSecret(f.key))
      .map((f) => f.label);

    if (missingRequired.length > 0) {
      setSavingIntegration(null);
      setIntegrationSaveMsg((prev) => ({
        ...prev,
        [sk]: `Missing required: ${missingRequired.join(', ')}`,
      }));
      setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' })), 5000);
      return;
    }

    const hasSecrets = Object.keys(filteredSecrets).length > 0;
    const hasSettings = Object.keys(channelSettingsUpdate).length > 0;

    if (!hasSecrets && !hasSettings) {
      setSavingIntegration(null);
      setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: 'No new values to save' }));
      setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' })), 3000);
      return;
    }

    let channelSettingsMerge: Record<string, unknown> = {};
    if (hasSettings) {
      const channelName = integration.secretPrefix.toLowerCase();
      const mapped: Record<string, unknown> = {};
      if (channelSettingsUpdate._CS_DM_POLICY) mapped.dmPolicy = channelSettingsUpdate._CS_DM_POLICY;
      if (channelSettingsUpdate._CS_GROUP_POLICY) mapped.groupPolicy = channelSettingsUpdate._CS_GROUP_POLICY;
      if (channelSettingsUpdate._CS_STREAMING) mapped.streaming = channelSettingsUpdate._CS_STREAMING;
      if (channelSettingsUpdate._CS_DM_ALLOWLIST) {
        mapped.allowFrom = channelSettingsUpdate._CS_DM_ALLOWLIST.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (channelSettingsUpdate._CS_GROUP_ALLOWLIST) {
        mapped.groupAllowFrom = channelSettingsUpdate._CS_GROUP_ALLOWLIST.split(',').map((s) => s.trim()).filter(Boolean);
      }
      channelSettingsMerge = {
        channelSettings: {
          [channelName]: mapped,
        },
      };
    }

    // Only send new secrets and channel settings — do NOT send existingConfig back.
    // The API's deepMerge handles merging with the existing decrypted config on the
    // server side. Sending existingConfig would re-send masked '***' values which
    // would overwrite real encrypted secrets and can also cause Zod validation errors.
    const updateData: Record<string, unknown> = {
      config: {
        ...filteredSecrets,
        ...channelSettingsMerge,
      },
    };

    try {
      const res = await api.updateAgent(id, updateData as Parameters<typeof api.updateAgent>[1]);
      setSavingIntegration(null);
      if (res.success) {
        setAgent(res.data);
        setIntegrationSecrets((prev) => ({ ...prev, [sk]: {} }));
        const restartNote = (res.data as unknown as Record<string, unknown>)?.restarted
          ? ' — container restarting with new config'
          : '';
        setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: `Credentials saved and encrypted${restartNote}` }));
        setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' })), 5000);
      } else {
        setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: 'Error: ' + res.error }));
      }
    } catch {
      setSavingIntegration(null);
      setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: 'Failed to save credentials. Check your connection.' }));
      setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' })), 5000);
    }
  };

  const saveConfig = async (commitMessage?: string) => {
    if (!agent) return;
    const trimmedName = configName.trim() || agent.name;
    if (trimmedName.length < 3 || trimmedName.length > 50) {
      setSaveMsg('Error: Agent name must be 3-50 characters');
      return;
    }
    if (!/^[a-zA-Z0-9 \-]+$/.test(trimmedName)) {
      setSaveMsg('Error: Name can only contain letters, numbers, spaces, and hyphens');
      return;
    }
    if (configProvider !== 'groq') {
      const hasExistingKey = hasApiKey;
      const hasNewKey = byokKeyInput.trim().length > 0;
      if (!hasExistingKey && !hasNewKey) {
        const providerName = getBYOKProvider(configProvider)?.name ?? configProvider;
        setSaveMsg(`Error: API key is required for ${providerName}. Enter your key or revert to the free Groq tier.`);
        return;
      }
    }
    setSaving(true);
    setSaveMsg(null);
    const updateData: Record<string, unknown> = {
      name: trimmedName,
      description: configDesc.trim() || undefined,
      ...(commitMessage?.trim() ? { commitMessage: commitMessage.trim() } : {}),
    };
    updateData.config = {
      systemPrompt: configSystemPrompt,
      skills: configSkills.split(',').map((s) => s.trim()).filter(Boolean),
      model: (useCustomModel ? customModelInput.trim() : configModel) || undefined,
      provider: configProvider || undefined,
      ...(agent.framework === 'elizaos' ? {
        bio: configBio.trim() || undefined,
        lore: configLore.trim() || undefined,
        topics: configTopics.split(',').map(s => s.trim()).filter(Boolean),
        adjectives: configAdjectives.split(',').map(s => s.trim()).filter(Boolean),
        style: configStyle.trim() ? {
          all: configStyle.split('\n').map(s => s.trim()).filter(Boolean),
        } : undefined,
      } : {}),
      ...(byokKeyInput.trim() ? {
        byok: {
          provider: configProvider as 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'openrouter',
          apiKey: byokKeyInput.trim(),
          model: (useCustomModel ? customModelInput.trim() : configModel) || undefined,
        },
      } : {}),
    };
    const res = await api.updateAgent(id, updateData as Parameters<typeof api.updateAgent>[1]);
    setSaving(false);
    if (res.success) {
      setAgent(res.data);
      setByokKeyInput('');
      const restartNote = (res.data as unknown as Record<string, unknown>)?.restarted
        ? ' — container restarting with new config'
        : '';
      setSaveMsg(`Configuration saved successfully${restartNote}`);
      setTimeout(() => setSaveMsg(null), 5000);
    } else {
      setSaveMsg('Error: ' + res.error);
    }
  };

  // ─── Chat ────────────────────────────────────────────────

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending || sendCooldown) return;
    if (agent?.status !== 'active') return; // block until agent is running
    if (!hasUnlimitedChat && msgCount >= msgLimit) {
      setChatErrorType('ratelimit');
      setChatError('Daily message limit reached. Upgrade to Pro for more, or bring your own key for unlimited.');
      toast.warning('Daily limit reached. Upgrade to Pro or bring your own API key for unlimited.');
      return;
    }
    setInput('');
    setChatError(null);
    setChatErrorType(null);


    // 2-second send cooldown to prevent rapid-fire
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

    // Try WebSocket first (real-time streaming), fall back to HTTP SSE
    if (wsChat.isConnected) {
      wsStreamingMsgRef.current = true;
      const sent = wsChat.send(text, history);
      if (sent) {
        // WS callbacks (onToken, onDone, onError) handle the rest
        return;
      }
      // WS send failed — fall through to HTTP SSE
      wsStreamingMsgRef.current = false;
    }

    // HTTP SSE fallback
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
      // On mobile (small screen), Enter inserts a newline — send via button only
      if (typeof window !== 'undefined' && window.innerWidth < 768) return;
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Derived values (must be before early returns to respect Rules of Hooks) ──

  const statusInfo = agent ? (STATUS_STYLES[agent.status] ?? STATUS_STYLES.paused) : STATUS_STYLES.paused;
  const frameworkMeta = agent ? FRAMEWORKS[agent.framework] : undefined;
  const isActive = agent?.status === 'active';
  const isNotActive = agent?.status === 'paused' || agent?.status === 'sleeping' || agent?.status === 'error' || agent?.status === 'stopped';

  const activeFeatureKeys = new Set(activeFeatures.map((f) => f.featureKey));

  const remaining = !hasUnlimitedChat ? Math.max(0, msgLimit - msgCount) : null;
  const isLimitReached = !hasUnlimitedChat && remaining !== null && remaining === 0;
  const filteredLogs = useMemo(
    () =>
      logs
        .filter((l) => logFilter === 'all' || l.level === logFilter)
        .filter((l) => !logSearch || l.message.toLowerCase().includes(logSearch.toLowerCase())),
    [logs, logFilter, logSearch],
  );

  const llmProvider = configProvider || (() => {
    const char = agent?.config ?? {};
    const settings = (char as Record<string, unknown>).settings as Record<string, unknown> | undefined;
    return (settings?.modelProvider as string) ?? (char as Record<string, unknown>).provider as string ?? 'groq';
  })();
  const currentProviderMeta = getBYOKProvider(llmProvider);
  const providerModels = currentProviderMeta?.models ?? [];

  const hasApiKey = (() => {
    const char = agent?.config ?? {};
    const secrets = (char as Record<string, unknown>).secrets as Record<string, unknown> | undefined;
    return !!(secrets && Object.keys(secrets).length > 0);
  })();

  const displayUptime = stats?.uptimeSecs && stats.uptimeSecs > 0
    ? stats.uptimeSecs
    : 0;
  const isLiveUptime = !!(stats?.uptimeSecs && stats.uptimeSecs > 0);

  // ─── Build context value ───────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contextValue: AgentContextValue | null = useMemo(() => {
    if (!agent) return null;
    return {
      agent, id, stats, isActive, isNotActive, statusInfo, frameworkMeta,
      tab, setTab,
      logs, logsLoading, logFilter, setLogFilter, logSearch, setLogSearch, autoScroll, setAutoScroll, filteredLogs, logsEndRef, loadLogs,
      messages, setMessages, input, setInput, sending,
      chatError, setChatError, chatErrorType, setChatErrorType,
      msgCount, hasUnlimitedChat, isByok, msgLimit, remaining, isLimitReached,
      bottomRef, inputRef, sendMessage, handleKeyDown, sendCooldown,
      wsConnected: wsChat.isConnected,
      configName, setConfigName, configDesc, setConfigDesc,
      configBio, setConfigBio, configLore, setConfigLore,
      configTopics, setConfigTopics, configStyle, setConfigStyle,
      configAdjectives, setConfigAdjectives,
      configSystemPrompt, setConfigSystemPrompt,
      configSkills, setConfigSkills,
      configModel, setConfigModel, configProvider, setConfigProvider,
      customModelInput, setCustomModelInput,
      useCustomModel, setUseCustomModel,
      byokKeyInput, setByokKeyInput,
      showByokKey, setShowByokKey,
      saving, saveMsg, setSaveMsg, saveConfig,
      llmProvider, currentProviderMeta, providerModels, hasApiKey,
      displayUptime, isLiveUptime,
      activeFeatures, activeFeatureKeys, featuresLoading,
      unlocking: null, handleUnlockFeature: async () => {},
      integrationSecrets, expandedIntegrations, visibleFields,
      savingIntegration, integrationSaveMsg,
      toggleIntegrationExpanded, toggleFieldVisibility,
      setIntegrationField, saveIntegrationSecrets, hasExistingSecret,
      actionLoading, actionError, actionSuccess, setActionError,
      handleAction, handleDelete,
      deleteConfirm, setDeleteConfirm, deleting, deleteError, setDeleteError,
      loadAgent, loadFeatures,
      isAuthenticated,
      userTier,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, agent, stats, tab, logs, logsLoading, logFilter, logSearch, autoScroll, filteredLogs,
    messages, input, sending, sendCooldown, chatError, chatErrorType, msgCount, msgLimit, remaining, isLimitReached,
    configName, configDesc, configBio, configLore, configTopics, configStyle, configAdjectives,
    configSystemPrompt, configSkills, configModel, configProvider, customModelInput, useCustomModel,
    byokKeyInput, showByokKey, saving, saveMsg, integrationSecrets, expandedIntegrations,
    visibleFields, savingIntegration, integrationSaveMsg, activeFeatures, activeFeatureKeys,
    featuresLoading, deleteConfirm, deleting, deleteError, actionLoading, actionError, actionSuccess,
    llmProvider, currentProviderMeta, providerModels, hasApiKey, displayUptime, isLiveUptime,
    isActive, isNotActive, statusInfo, frameworkMeta, isAuthenticated, userTier, hasUnlimitedChat]);

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
        style={{ minHeight: 'calc(100vh - 64px)' }}
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

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isActive && (
                <>
                  <button
                    onClick={() => handleAction('restart')}
                    disabled={actionLoading === 'restart'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/10 transition-all disabled:opacity-40"
                    title="Restart agent"
                  >
                    <RotateCcw size={13} className={actionLoading === 'restart' ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">{actionLoading === 'restart' ? 'Restarting...' : 'Restart'}</span>
                  </button>
                  <button
                    onClick={() => handleAction('stop')}
                    disabled={actionLoading === 'stop'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-40"
                    title="Stop agent"
                  >
                    {actionLoading === 'stop' ? (
                      <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    ) : (
                      <Square size={13} />
                    )}
                    <span className="hidden sm:inline">{actionLoading === 'stop' ? 'Stopping...' : 'Stop'}</span>
                  </button>
                </>
              )}
              {isNotActive && (
                <button
                  onClick={() => handleAction('start')}
                  disabled={actionLoading === 'start'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-40"
                  title="Start agent"
                >
                  {actionLoading === 'start' ? (
                    <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  ) : (
                    <Play size={13} />
                  )}
                  <span className="hidden sm:inline">{actionLoading === 'start' ? 'Starting...' : 'Start'}</span>
                </button>
              )}
              {/* Clone disabled — re-enable with proper agent limit enforcement */}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all disabled:opacity-40 ${
                  deleteConfirm
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                    : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                }`}
                title="Delete agent"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">{deleting ? 'Deleting...' : deleteConfirm ? 'Confirm' : 'Delete'}</span>
              </button>
              {deleteConfirm && !deleting && (
                <button
                  onClick={() => { setDeleteConfirm(false); setDeleteError(null); }}
                  className="text-xs px-2 py-1 transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {deleteError && (
            <p className="text-xs text-red-400 px-6 py-2 border-b border-[rgba(46,43,74,0.2)]">{deleteError}</p>
          )}

          {/* ─── Tab Content ──────────────────────────────────── */}
          <div className={`flex-1 px-4 sm:px-6 py-6 min-w-0`}>
            <AnimatePresence mode="wait">
              {tab === 'overview' && <OverviewTab />}
              {tab === 'config' && <ConfigTab />}
              {tab === 'integrations' && <IntegrationsTab />}
              {tab === 'skills' && <SkillsTab />}
              {tab === 'files' && <FilesTab />}
              {tab === 'logs' && <LogsTab />}
              {tab === 'terminal' && <TerminalTab />}
              {tab === 'memory' && <MemoryTab />}
              {tab === 'chat' && <ChatTab />}
              {tab === 'stats' && <StatsTab />}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AgentContext.Provider>
  );
}
