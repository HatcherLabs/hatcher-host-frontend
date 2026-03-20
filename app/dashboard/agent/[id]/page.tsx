'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { api, getToken } from '@/lib/api';
import type { Agent, AgentFeature } from '@/lib/api';
import { sendSolPayment, usdToSol } from '@/lib/solana-pay';
import { useAuth } from '@/lib/auth-context';
import { getInitials, stringToColor, timeAgo } from '@/lib/utils';
import { FRAMEWORKS, FREE_TIER_LIMITS, FEATURE_CATALOG, BUNDLES, getBYOKProvider } from '@hatcher/shared';
import type { FeaturePricing } from '@hatcher/shared';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Trash2,
  MessageSquare,
  Settings,
  Puzzle,
  ScrollText,
  LayoutDashboard,
  BarChart3,
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
  FRAMEWORK_BADGE,
  pageEntranceVariants,
} from '@/components/agents/AgentContext';
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

const LogsTab = dynamic(
  () => import('@/components/agents/tabs/LogsTab').then(mod => ({ default: mod.LogsTab })),
  { loading: () => <TabSkeleton /> }
);

const ChatTab = dynamic(
  () => import('@/components/agents/tabs/ChatTab').then(mod => ({ default: mod.ChatTab })),
  { loading: () => <TabSkeleton /> }
);

const StatsTab = dynamic(
  () => import('@/components/agents/tabs/StatsTab').then(mod => ({ default: mod.StatsTab })),
  { loading: () => <TabSkeleton /> }
);

// ─── Tab definitions ─────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'config', label: 'Config', icon: <Settings size={16} /> },
  { id: 'integrations', label: 'Integrations', icon: <Puzzle size={16} /> },
  { id: 'logs', label: 'Logs', icon: <ScrollText size={16} /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
  { id: 'stats', label: 'Stats', icon: <BarChart3 size={16} /> },
];

// ─── Main Component ─────────────────────────────────────────

export default function AgentManagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const wallet = useWallet();
  const { connection } = useConnection();

  // Core state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initialTab = (['overview','config','integrations','logs','chat'] as Tab[]).includes(searchParams.get('tab') as Tab)
    ? (searchParams.get('tab') as Tab)
    : 'chat';
  const [tab, setTab] = useState<Tab>(initialTab);

  // Stats
  const [stats, setStats] = useState<AgentStats | null>(null);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<LogFilter>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Chat state — restore from localStorage so history survives tab switches and soft navs
  const chatKey = `hatcher-chat-${id}`;
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(chatKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Message[];
        return parsed.map(m => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp) : undefined }));
      }
    } catch { /* ignore */ }
    return [];
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatErrorType, setChatErrorType] = useState<'timeout' | 'ratelimit' | 'network' | 'generic' | null>(null);
  const [msgCount, setMsgCount] = useState(0);

  // Persist chat to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(chatKey, JSON.stringify(messages.slice(-100)));
    }
  }, [messages, chatKey]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Config state
  const [configName, setConfigName] = useState('');
  const [configDesc, setConfigDesc] = useState('');
  const [configBio, setConfigBio] = useState('');
  const [configLore, setConfigLore] = useState('');
  const [configTopics, setConfigTopics] = useState('');
  const [configStyle, setConfigStyle] = useState('');
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
  const [unlocking, setUnlocking] = useState<string | null>(null);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const hasUnlimitedChat = agent?.features?.some(
    (f: { featureKey: string; expiresAt?: string | null }) =>
      f.featureKey === 'openclaw.feature.unlimited_chat' &&
      (!f.expiresAt || new Date(f.expiresAt) > new Date())
  ) ?? false;
  const msgLimit = FREE_TIER_LIMITS.chatMessagesPerDay;

  // ─── Data loaders ────────────────────────────────────────

  const loadAgent = useCallback(async () => {
    const res = await api.getAgent(id);
    setLoading(false);
    if (res.success) {
      setAgent(res.data);
      setConfigName(res.data.name);
      setConfigDesc(res.data.description ?? '');
      const char = res.data.config ?? {};
      setConfigBio((char as Record<string, unknown>).bio as string ?? '');
      setConfigLore(Array.isArray((char as Record<string, unknown>).lore) ? ((char as Record<string, unknown>).lore as string[]).join('\n') : '');
      setConfigTopics(Array.isArray((char as Record<string, unknown>).topics) ? ((char as Record<string, unknown>).topics as string[]).join(', ') : '');
      setConfigStyle(
        Array.isArray((char as Record<string, unknown>).style?.valueOf())
          ? ''
          : ((char as Record<string, unknown>).style as Record<string, unknown>)?.chat
            ? (((char as Record<string, unknown>).style as Record<string, unknown>).chat as string[]).join('\n')
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
  useEffect(() => { loadAgent(); }, [loadAgent]);

  const agentStatus = agent?.status;

  // Load stats
  useEffect(() => {
    if (!agent) return;
    api.getAgentStats(id).then((res) => {
      if (res.success) setStats(res.data);
    });
  }, [agent, id]);

  // Load logs: SSE streaming when agent is active, static fetch otherwise
  useEffect(() => {
    if (!(tab === 'logs' || tab === 'overview') || !agentStatus) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    const isActiveStatus = agentStatus === 'active';
    const wantsStream = tab === 'logs' && isActiveStatus;
    if (wantsStream) {
      const token = getToken();
      const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
      const url = `${apiBase}/agents/${id}/logs?stream=true${token ? `&token=${token}` : ''}`;
      setLogsLoading(true);
      const es = new EventSource(url);
      eventSourceRef.current = es;
      es.onopen = () => { setLogsLoading(false); };
      es.onmessage = (event) => {
        try {
          const entry: LogEntry = JSON.parse(event.data);
          setLogs((prev) => {
            const next = [...prev, entry];
            return next.length > 200 ? next.slice(next.length - 200) : next;
          });
        } catch { /* Ignore unparseable events */ }
      };
      es.onerror = () => {
        setLogsLoading(false);
        es.close();
        eventSourceRef.current = null;
        loadLogs();
      };
    } else {
      loadLogs();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [tab, agentStatus, id, loadLogs]);

  // Load features when integrations or config tab
  useEffect(() => {
    if ((tab === 'integrations' || tab === 'config') && agentStatus) loadFeatures();
  }, [tab, agentStatus, loadFeatures]);

  // Auto-scroll chat
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Auto-focus chat input
  useEffect(() => {
    if (tab === 'chat' && !loading && agent) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [tab, loading, agent]);

  // Auto-scroll logs
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

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
        setActionError(`Failed to ${action} agent: ${res.error ?? 'Unknown error'}`);
        setTimeout(() => setActionError(null), 5000);
      } else if (res?.success) {
        const labels = { start: 'started', stop: 'stopped', restart: 'restarted' };
        setActionSuccess(`Agent ${labels[action]} successfully`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {
      setActionError(`Failed to ${action} agent. Check your connection.`);
      setTimeout(() => setActionError(null), 5000);
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

  const handleUnlockFeature = async (featureKey: string, usdPrice: number) => {
    if (!wallet.publicKey) {
      setActionError('Please connect your wallet first.');
      return;
    }
    setUnlocking(featureKey);
    setActionError(null);
    try {
      const solAmount = usdToSol(usdPrice);
      const txSignature = await sendSolPayment({ wallet, connection, solAmount });
      const res = await api.unlockFeature(id, featureKey, {
        paymentToken: 'sol',
        amount: solAmount,
        txSignature,
      });
      setUnlocking(null);
      if (res.success) {
        loadFeatures();
        loadAgent();
        setActionSuccess('Feature unlocked!');
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError((res as { error?: string }).error ?? 'Failed to unlock feature');
      }
    } catch (err) {
      setUnlocking(null);
      setActionError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

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

    const existingConfig = (agent.config ?? {}) as Record<string, unknown>;

    let channelSettingsMerge: Record<string, unknown> = {};
    if (hasSettings) {
      const channelName = integration.secretPrefix.toLowerCase();
      const existing = (existingConfig.channelSettings ?? {}) as Record<string, Record<string, unknown>>;
      const existingChannel = existing[channelName] ?? {};
      const mapped: Record<string, string> = {};
      if (channelSettingsUpdate._CS_DM_POLICY) mapped.dmPolicy = channelSettingsUpdate._CS_DM_POLICY;
      if (channelSettingsUpdate._CS_GROUP_POLICY) mapped.groupPolicy = channelSettingsUpdate._CS_GROUP_POLICY;
      if (channelSettingsUpdate._CS_STREAMING) mapped.streaming = channelSettingsUpdate._CS_STREAMING;
      channelSettingsMerge = {
        channelSettings: {
          ...existing,
          [channelName]: { ...existingChannel, ...mapped },
        },
      };
    }

    const updateData: Record<string, unknown> = {
      config: {
        ...existingConfig,
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

  const saveConfig = async () => {
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
    };
    updateData.config = {
      systemPrompt: configSystemPrompt,
      skills: configSkills.split(',').map((s) => s.trim()).filter(Boolean),
      model: (useCustomModel ? customModelInput.trim() : configModel) || undefined,
      provider: configProvider || undefined,
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
    if (!text || sending) return;
    if (!hasUnlimitedChat && msgCount >= msgLimit) {
      setChatErrorType('ratelimit');
      setChatError('Daily message limit reached. Unlock more features with $HATCH.');
      return;
    }
    setInput('');
    setChatError(null);
    setChatErrorType(null);
    const userMsg: Message = { id: genId(), role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setMsgCount((c) => c + 1);
    const history = messages
      .filter((m) => !m.streaming)
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { id: genId(), role: 'assistant', content: '', streaming: true, timestamp: new Date() }]);
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
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        },
        () => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.streaming) {
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
            setChatError('Daily limit reached. Unlock more features with $HATCH.');
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
      e.preventDefault();
      sendMessage();
    }
  };

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
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="w-full h-48" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-[#FFFFFF]">
        <div className="text-4xl mb-4 text-[#f97316]">404</div>
        <h1 className="text-2xl font-bold mb-3">Agent Not Found</h1>
        <p className="mb-6 text-[#71717a]">
          The agent with ID &quot;{id}&quot; could not be found.
        </p>
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[#f97316]/40 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Agents
        </Link>
      </div>
    );
  }

  // ─── Derived values ────────────────────────────────────────

  const gradient = stringToColor(agent.id);
  const initials = getInitials(agent.name);
  const statusInfo = STATUS_STYLES[agent.status] ?? STATUS_STYLES.paused;
  const frameworkMeta = FRAMEWORKS[agent.framework];
  const isActive = agent.status === 'active';
  const isNotActive = agent.status === 'paused' || agent.status === 'sleeping' || agent.status === 'error';

  const activeFeatureKeys = new Set(activeFeatures.map((f) => f.featureKey));
  const frameworkFeatures = FEATURE_CATALOG.filter((f) => f.framework === agent.framework);
  const featuresByCategory: Record<string, FeaturePricing[]> = {};
  for (const f of frameworkFeatures) {
    if (!featuresByCategory[f.category]) featuresByCategory[f.category] = [];
    featuresByCategory[f.category].push(f);
  }
  const frameworkBundles = BUNDLES.filter((b) => b.framework === agent.framework);

  const remaining = !hasUnlimitedChat ? Math.max(0, msgLimit - msgCount) : null;
  const isLimitReached = !hasUnlimitedChat && remaining !== null && remaining === 0;
  const filteredLogs = logFilter === 'all' ? logs : logs.filter((l) => l.level === logFilter);

  const llmProvider = configProvider || (() => {
    const char = agent.config ?? {};
    const settings = (char as Record<string, unknown>).settings as Record<string, unknown> | undefined;
    return (settings?.modelProvider as string) ?? (char as Record<string, unknown>).provider as string ?? 'groq';
  })();
  const currentProviderMeta = getBYOKProvider(llmProvider);
  const providerModels = currentProviderMeta?.models ?? [];

  const hasApiKey = (() => {
    const char = agent.config ?? {};
    const secrets = (char as Record<string, unknown>).secrets as Record<string, unknown> | undefined;
    return !!(secrets && Object.keys(secrets).length > 0);
  })();

  const displayUptime = stats?.uptimeSecs && stats.uptimeSecs > 0
    ? stats.uptimeSecs
    : (agent.createdAt ? Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / 1000) : 0);
  const isLiveUptime = !!(stats?.uptimeSecs && stats.uptimeSecs > 0);

  // ─── Build context value ───────────────────────────────────

  const contextValue: AgentContextValue = {
    agent, id, stats, isActive, isNotActive, statusInfo, frameworkMeta,
    tab, setTab,
    logs, logsLoading, logFilter, setLogFilter, filteredLogs, logsEndRef, loadLogs,
    messages, setMessages, input, setInput, sending,
    chatError, setChatError, chatErrorType, setChatErrorType,
    msgCount, hasUnlimitedChat, msgLimit, remaining, isLimitReached,
    bottomRef, inputRef, sendMessage, handleKeyDown,
    configName, setConfigName, configDesc, setConfigDesc,
    configBio, setConfigBio, configLore, setConfigLore,
    configTopics, setConfigTopics, configStyle, setConfigStyle,
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
    unlocking, handleUnlockFeature,
    featuresByCategory, frameworkBundles,
    integrationSecrets, expandedIntegrations, visibleFields,
    savingIntegration, integrationSaveMsg,
    toggleIntegrationExpanded, toggleFieldVisibility,
    setIntegrationField, saveIntegrationSecrets, hasExistingSecret,
    actionLoading, actionError, actionSuccess, setActionError,
    handleAction, handleDelete,
    deleteConfirm, setDeleteConfirm, deleting, deleteError, setDeleteError,
    loadAgent, loadFeatures,
    isAuthenticated, wallet, connection,
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <AgentContext.Provider value={contextValue}>
      <motion.div
        className="mx-auto max-w-5xl px-4 py-8 min-h-screen"
        variants={pageEntranceVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ─── Header Area ──────────────────────────────────── */}
        <div className="mb-8">
          <Link
            href="/dashboard/agents"
            className="inline-flex items-center gap-1.5 text-sm mb-5 text-[#A5A1C2] transition-colors hover:text-[#FFFFFF]"
          >
            <ArrowLeft size={16} />
            Back to Agents
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              {agent.avatarUrl ? (
                <img
                  src={agent.avatarUrl}
                  alt={agent.name}
                  className="w-16 h-16 rounded-full object-cover border border-[rgba(46,43,74,0.3)]"
                />
              ) : (
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl border border-[rgba(46,43,74,0.3)]`}
                >
                  {initials}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Change avatar"
              >
                <Settings size={18} className="text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || file.size > 2 * 1024 * 1024) {
                    setSaveMsg(file ? 'Error: Avatar must be under 2MB' : null);
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const dataUrl = reader.result as string;
                    const res = await api.updateAgent(id, { avatarUrl: dataUrl } as Parameters<typeof api.updateAgent>[1]);
                    if (res.success) {
                      setAgent(res.data);
                      setSaveMsg('Avatar updated');
                      setTimeout(() => setSaveMsg(null), 3000);
                    } else {
                      setSaveMsg('Error: ' + res.error);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-[#FFFFFF]">{agent.name}</h1>
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${statusInfo.classes}`}>
                  {statusInfo.pulse && (
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusInfo.dotColor} opacity-75`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.dotColor}`} />
                    </span>
                  )}
                  {statusInfo.label}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${FRAMEWORK_BADGE[agent.framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                  {frameworkMeta?.name ?? agent.framework}
                </span>
              </div>
              {agent.description && (
                <p className="text-sm mt-1 text-[#A5A1C2]">{agent.description}</p>
              )}
              <p className="text-xs mt-1.5 text-[#71717a]">Created {timeAgo(agent.createdAt)}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isActive && (
                <>
                  <button
                    onClick={() => handleAction('restart')}
                    disabled={actionLoading === 'restart'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[#f97316]/40 hover:bg-[#f97316]/10 transition-all disabled:opacity-40"
                    title="Restart agent"
                  >
                    <RotateCcw size={14} className={actionLoading === 'restart' ? 'animate-spin' : ''} />
                    Restart
                  </button>
                  <button
                    onClick={() => handleAction('stop')}
                    disabled={actionLoading === 'stop'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-40"
                    title="Stop agent"
                  >
                    <Square size={14} />
                    Stop
                  </button>
                </>
              )}
              {isNotActive && (
                <button
                  onClick={() => handleAction('start')}
                  disabled={actionLoading === 'start'}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-40"
                  title="Start agent"
                >
                  <Play size={14} />
                  Start
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-all disabled:opacity-40 ${
                  deleteConfirm
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                    : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                }`}
                title="Delete agent"
              >
                <Trash2 size={14} />
                {deleting ? 'Deleting...' : deleteConfirm ? 'Confirm Delete' : 'Delete'}
              </button>
              {deleteConfirm && !deleting && (
                <button
                  onClick={() => { setDeleteConfirm(false); setDeleteError(null); }}
                  className="text-xs px-2 py-1 transition-colors text-[#71717a] hover:text-[#A5A1C2]"
                >
                  Cancel
                </button>
              )}
            </div>
            {deleteError && (
              <p className="text-xs text-red-400 mt-2">{deleteError}</p>
            )}
            {actionError && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{actionError}</p>
              </div>
            )}
            {actionSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20"
              >
                <p className="text-xs text-green-400">{actionSuccess}</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* ─── Tab Bar ──────────────────────────────────────── */}
        <div className="flex items-center gap-0 mb-8 border-b border-[rgba(46,43,74,0.3)] relative" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-5 py-3 text-sm transition-all duration-300 -mb-px ${
                tab === t.id
                  ? 'text-[#FFFFFF]'
                  : 'text-[#71717a] hover:text-[#A5A1C2]'
              }`}
            >
              {t.icon}
              {t.label}
              {tab === t.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f97316] to-[#f97316] rounded-full"
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ──────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'config' && <ConfigTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'logs' && <LogsTab />}
          {tab === 'chat' && <ChatTab />}
          {tab === 'stats' && <StatsTab />}
        </AnimatePresence>
      </motion.div>
    </AgentContext.Provider>
  );
}
