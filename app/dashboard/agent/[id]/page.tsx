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
import { FRAMEWORKS, FREE_TIER_LIMITS, FEATURE_CATALOG, BUNDLES, BYOK_PROVIDERS, getBYOKProvider } from '@hatcher/shared';
import type { FeaturePricing } from '@hatcher/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { RobotMascot } from '@/components/ui/RobotMascot';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Trash2,
  MessageSquare,
  Clock,
  Cpu,
  Activity,
  Send,
  Lock,
  CheckCircle,
  Filter,
  Settings,
  Puzzle,
  ScrollText,
  LayoutDashboard,
  Zap,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Shield,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

type Tab = 'overview' | 'config' | 'integrations' | 'logs' | 'chat' | 'stats';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  timestamp?: Date;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

type LogFilter = 'all' | 'info' | 'warn' | 'error';

// ─── Helpers ─────────────────────────────────────────────────

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

const DEFAULT_PROMPTS = ['What can you do?', 'Tell me about yourself', 'Help me get started'];

// ─── Color constants ─────────────────────────────────────────

const COLORS = {
  bg: '#0D0B1A',
  card: 'rgba(26,23,48,0.6)',
  accent: '#f97316',
  textPrimary: '#FFFFFF',
  textSecondary: '#A5A1C2',
  textMuted: '#71717a',
} as const;

// ─── Animation variants ─────────────────────────────────────
const tabContentVariants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const pageEntranceVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const FRAMEWORK_BADGE: Record<string, string> = {
  openclaw: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const STATUS_STYLES: Record<string, { classes: string; label: string; pulse: boolean; dotColor: string }> = {
  active: { classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Active', pulse: true, dotColor: 'bg-emerald-400' },
  sleeping: { classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'Sleeping', pulse: false, dotColor: 'bg-blue-400' },
  paused: { classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Paused', pulse: false, dotColor: 'bg-amber-400' },
  error: { classes: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Error', pulse: false, dotColor: 'bg-red-400' },
  killed: { classes: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Killed', pulse: false, dotColor: 'bg-red-400' },
  restarting: { classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Restarting', pulse: true, dotColor: 'bg-amber-400' },
};

const LOG_LEVEL_COLORS: Record<string, string> = {
  info: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

// ─── Integration field definitions ──────────────────────────────

interface IntegrationField {
  key: string;
  label: string;
  type: 'password' | 'text' | 'select';
  placeholder?: string;
  helper?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

interface IntegrationDef {
  featureKey: string;
  name: string;
  description: string;
  secretPrefix: string;
  fields: IntegrationField[];
}

const OPENCLAW_INTEGRATIONS: IntegrationDef[] = [
  {
    featureKey: 'openclaw.platform.telegram',
    name: 'Telegram',
    description: 'Deploy your agent as a Telegram bot.',
    secretPrefix: 'TELEGRAM',
    fields: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: 'Bot token from @BotFather', helper: 'Message @BotFather on Telegram to create a bot and get the token', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.discord',
    name: 'Discord',
    description: 'Deploy your agent as a Discord bot.',
    secretPrefix: 'DISCORD',
    fields: [
      { key: 'DISCORD_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: 'Discord bot token', helper: 'From Discord Developer Portal > Bot > Token', required: true },
      { key: 'DISCORD_APPLICATION_ID', label: 'Application ID', type: 'text', placeholder: 'e.g. 123456789012345678', helper: 'From Discord Developer Portal > General Information' },
    ],
  },
  {
    featureKey: 'openclaw.platform.whatsapp',
    name: 'WhatsApp',
    description: 'Connect your agent to WhatsApp Business.',
    secretPrefix: 'WHATSAPP',
    fields: [
      { key: 'WHATSAPP_TOKEN', label: 'Business API Token', type: 'password', placeholder: 'WhatsApp Business API token', helper: 'From Meta Business Suite > WhatsApp > API Setup', required: true },
      { key: 'WHATSAPP_PHONE_NUMBER_ID', label: 'Phone Number ID', type: 'text', placeholder: 'e.g. 1234567890', helper: 'Phone Number ID from WhatsApp Business API', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.signal',
    name: 'Signal',
    description: 'Connect your agent to Signal messenger.',
    secretPrefix: 'SIGNAL',
    fields: [
      { key: 'SIGNAL_CLI_CONFIG', label: 'CLI Config Path', type: 'text', placeholder: '/home/user/.local/share/signal-cli', helper: 'Path to signal-cli config directory on your server', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.slack',
    name: 'Slack',
    description: 'Deploy your agent in Slack workspaces.',
    secretPrefix: 'SLACK',
    fields: [
      { key: 'SLACK_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...', helper: 'Bot User OAuth Token from Slack API', required: true },
      { key: 'SLACK_APP_TOKEN', label: 'App Token', type: 'password', placeholder: 'xapp-...', helper: 'App-Level Token for Socket Mode (from Slack API > Basic Information)' },
    ],
  },
  {
    featureKey: 'openclaw.platform.imessage',
    name: 'iMessage',
    description: 'Send and receive iMessages (requires macOS host).',
    secretPrefix: 'IMESSAGE',
    fields: [
      { key: 'IMESSAGE_APPLE_ID', label: 'Apple ID', type: 'text' as const, required: true, placeholder: 'your@icloud.com' },
      { key: 'IMESSAGE_PASSWORD', label: 'App-Specific Password', type: 'password' as const, required: true, placeholder: 'xxxx-xxxx-xxxx-xxxx' },
    ],
  },
  {
    featureKey: 'openclaw.feature.webhooks',
    name: 'Webhooks',
    description: 'Trigger your agent via external webhook events.',
    secretPrefix: 'WEBHOOK',
    fields: [
      { key: 'WEBHOOK_URL', label: 'Webhook URL', type: 'text', placeholder: 'https://your-service.com/webhook', helper: 'URL that will send events to your agent', required: true },
      { key: 'WEBHOOK_SECRET', label: 'Webhook Secret', type: 'password', placeholder: 'Shared secret for HMAC verification', helper: 'Used to verify incoming webhook payloads' },
    ],
  },
];

// ─── Skeleton shimmer component ──────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-[#71717a]/20 ${className}`} />
  );
}

// ─── Glass card wrapper ──────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card glass-noise p-5 ${className}`}>
      {children}
    </div>
  );
}

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
  const [stats, setStats] = useState<{
    messagesProcessed: number;
    uptimeSecs: number;
    lastActiveAt: string | null;
    containerId: string | null;
    status: string;
  } | null>(null);

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
      // Agent config
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
      // OpenClaw config
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
      // Check if the loaded model is a known model for the provider
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
      // Backend may return string[] (raw lines) or LogEntry[] — normalize
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

  // Used by logs and features effects below
  const agentStatus = agent?.status;

  // Load stats — depend on agent (not status) so stats load immediately
  // when the agent is first fetched, not only when status changes.
  useEffect(() => {
    if (!agent) return;
    api.getAgentStats(id).then((res) => {
      if (res.success) setStats(res.data);
    });
  }, [agent, id]);

  // Load logs: SSE streaming when agent is active, static fetch otherwise.
  // Depend on agentStatus (not the full agent object) to avoid tearing down
  // and re-creating SSE connections on unrelated agent object changes.
  useEffect(() => {
    if (!(tab === 'logs' || tab === 'overview') || !agentStatus) return;

    // Close any existing SSE connection when tab/agent changes
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const isActive = agentStatus === 'active';
    const wantsStream = tab === 'logs' && isActive;

    if (wantsStream) {
      // SSE streaming for live logs
      const token = getToken();
      const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
      const url = `${apiBase}/agents/${id}/logs?stream=true${token ? `&token=${token}` : ''}`;

      setLogsLoading(true);
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setLogsLoading(false);
      };

      es.onmessage = (event) => {
        try {
          const entry: LogEntry = JSON.parse(event.data);
          setLogs((prev) => {
            const next = [...prev, entry];
            // Keep max 200 entries
            return next.length > 200 ? next.slice(next.length - 200) : next;
          });
        } catch {
          // Ignore unparseable events
        }
      };

      es.onerror = () => {
        setLogsLoading(false);
        // On error, close and fall back to static fetch
        es.close();
        eventSourceRef.current = null;
        loadLogs();
      };
    } else {
      // Static fetch for overview tab or non-active agents
      loadLogs();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [tab, agentStatus, id, loadLogs]);

  // Load features when integrations or config tab (config needs to know unlocked features)
  useEffect(() => {
    if ((tab === 'integrations' || tab === 'config') && agentStatus) loadFeatures();
  }, [tab, agentStatus, loadFeatures]);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus chat input
  useEffect(() => {
    if (tab === 'chat' && !loading && agent) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [tab, loading, agent]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ─── Actions ─────────────────────────────────────────────

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!agent) return;
    setActionLoading(action);
    setActionError(null);
    setActionSuccess(null);

    try {
      let res;
      if (action === 'start') {
        res = await api.startAgent(id);
      } else if (action === 'stop') {
        res = await api.stopAgent(id);
      } else if (action === 'restart') {
        res = await api.restartAgent(id);
      }

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

    // Reload agent to reflect new status
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

  const saveIntegrationSecrets = async (integration: IntegrationDef) => {
    if (!agent) return;
    setSavingIntegration(integration.featureKey);
    setIntegrationSaveMsg((prev) => ({ ...prev, [integration.featureKey]: '' }));

    const secrets = integrationSecrets[integration.featureKey] ?? {};
    // Filter out empty values
    const filteredSecrets: Record<string, string> = {};
    for (const [k, v] of Object.entries(secrets)) {
      if (v && v.trim()) filteredSecrets[k] = v.trim();
    }

    // Check required fields
    const missingRequired = integration.fields
      .filter((f) => f.required && !filteredSecrets[f.key] && !hasExistingSecret(f.key))
      .map((f) => f.label);

    if (missingRequired.length > 0) {
      setSavingIntegration(null);
      setIntegrationSaveMsg((prev) => ({
        ...prev,
        [integration.featureKey]: `Missing required: ${missingRequired.join(', ')}`,
      }));
      setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [integration.featureKey]: '' })), 5000);
      return;
    }

    if (Object.keys(filteredSecrets).length === 0) {
      setSavingIntegration(null);
      setIntegrationSaveMsg((prev) => ({ ...prev, [integration.featureKey]: 'No new values to save' }));
      setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [integration.featureKey]: '' })), 3000);
      return;
    }

    const existingConfig = (agent.config ?? {}) as Record<string, unknown>;

    // OpenClaw: secrets go at config root level
    const updateData: Record<string, unknown> = {
      config: {
        ...existingConfig,
        ...filteredSecrets,
      },
    };

    const res = await api.updateAgent(id, updateData as Parameters<typeof api.updateAgent>[1]);
    setSavingIntegration(null);

    if (res.success) {
      setAgent(res.data);
      // Clear the form values after save (secrets should not be shown again)
      setIntegrationSecrets((prev) => ({ ...prev, [integration.featureKey]: {} }));
      const restartNote = (res.data as unknown as Record<string, unknown>)?.restarted
        ? ' — container restarting with new config'
        : '';
      setIntegrationSaveMsg((prev) => ({ ...prev, [integration.featureKey]: `Credentials saved and encrypted${restartNote}` }));
      setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [integration.featureKey]: '' })), 5000);
    } else {
      setIntegrationSaveMsg((prev) => ({ ...prev, [integration.featureKey]: 'Error: ' + res.error }));
    }
  };

  // Check if a secret key already exists in the agent config
  const hasExistingSecret = (secretKey: string): boolean => {
    if (!agent) return false;
    const config = (agent.config ?? {}) as Record<string, unknown>;
    return !!(config as Record<string, string>)[secretKey];
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

    // Validate: non-groq providers require an API key
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
      // Include BYOK key if the user entered a new one
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
      setByokKeyInput(''); // Clear key input after successful save
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

    // Send the last 40 messages as context (matches backend Zod schema max(40))
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
      const msg = err instanceof Error ? err.message : 'Connection error';
      setChatErrorType('generic');
      setChatError(`Error: ${msg}`);
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

  const gradient = stringToColor(agent.id);
  const initials = getInitials(agent.name);
  const statusInfo = STATUS_STYLES[agent.status] ?? STATUS_STYLES.paused;
  const frameworkMeta = FRAMEWORKS[agent.framework];
  const isActive = agent.status === 'active';
  const isNotActive = agent.status === 'paused' || agent.status === 'sleeping' || agent.status === 'error';

  // Features helpers
  const activeFeatureKeys = new Set(activeFeatures.map((f) => f.featureKey));
  const frameworkFeatures = FEATURE_CATALOG.filter((f) => f.framework === agent.framework);
  const featuresByCategory: Record<string, FeaturePricing[]> = {};
  for (const f of frameworkFeatures) {
    if (!featuresByCategory[f.category]) featuresByCategory[f.category] = [];
    featuresByCategory[f.category].push(f);
  }
  const frameworkBundles = BUNDLES.filter((b) => b.framework === agent.framework);

  // Chat helpers
  const remaining = !hasUnlimitedChat ? Math.max(0, msgLimit - msgCount) : null;
  const isLimitReached = !hasUnlimitedChat && remaining !== null && remaining === 0;

  // Filtered logs
  const filteredLogs = logFilter === 'all' ? logs : logs.filter((l) => l.level === logFilter);

  // LLM provider display
  const llmProvider = configProvider || (() => {
    const char = agent.config ?? {};
    const settings = (char as Record<string, unknown>).settings as Record<string, unknown> | undefined;
    return (settings?.modelProvider as string) ?? (char as Record<string, unknown>).provider as string ?? 'groq';
  })();
  const currentProviderMeta = getBYOKProvider(llmProvider);
  const providerModels = currentProviderMeta?.models ?? [];

  // BYOK key status
  const hasApiKey = (() => {
    const char = agent.config ?? {};
    const secrets = (char as Record<string, unknown>).secrets as Record<string, unknown> | undefined;
    return secrets && Object.keys(secrets).length > 0;
  })();

  // Uptime: prefer live container stats, fall back to time since creation
  const displayUptime = stats?.uptimeSecs && stats.uptimeSecs > 0
    ? stats.uptimeSecs
    : (agent.createdAt ? Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / 1000) : 0);
  const isLiveUptime = !!(stats?.uptimeSecs && stats.uptimeSecs > 0);

  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 py-8 min-h-screen"
      variants={pageEntranceVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ─── Header Area ──────────────────────────────────── */}
      <div className="mb-8">
        {/* Back button */}
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-1.5 text-sm mb-5 text-[#A5A1C2] transition-colors hover:text-[#FFFFFF]"
        >
          <ArrowLeft size={16} />
          Back to Agents
        </Link>

        {/* Agent header */}
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
                // Convert to base64 data URL for now (proper upload in v2)
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
              <h1 className="text-2xl font-bold text-[#FFFFFF]">
                {agent.name}
              </h1>

              {/* Status badge */}
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${statusInfo.classes}`}>
                {statusInfo.pulse && (
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusInfo.dotColor} opacity-75`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.dotColor}`} />
                  </span>
                )}
                {statusInfo.label}
              </span>

              {/* Framework tag */}
              <span className={`text-xs px-2.5 py-1 rounded-full border ${FRAMEWORK_BADGE[agent.framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                {frameworkMeta?.name ?? agent.framework}
              </span>
            </div>

            {agent.description && (
              <p className="text-sm mt-1 text-[#A5A1C2]">
                {agent.description}
              </p>
            )}

            <p className="text-xs mt-1.5 text-[#71717a]">
              Created {timeAgo(agent.createdAt)}
            </p>
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

      {/* ─── Overview Tab ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
      {tab === 'overview' && (
        <motion.div key="tab-overview" className="space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
                  <MessageSquare size={18} className="text-[#f97316]" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-[#FFFFFF] tabular-nums">
                    {stats?.messagesProcessed ?? 0}
                  </div>
                  <div className="text-xs text-[#71717a]">Messages</div>
                  <div className="text-[10px] text-[#6B6890] mt-0.5">Since last deploy</div>
                </div>
                {/* Mini bar chart indicator */}
                <div className="flex items-end gap-[2px] h-5 self-end">
                  {[0.4, 0.6, 0.3, 0.8, 0.5, 0.9, 0.7].map((h, i) => (
                    <div key={i} className="w-[2px] rounded-full bg-[#f97316]/30" style={{ height: `${h * 20}px` }} />
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Clock size={18} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-[#FFFFFF] tabular-nums">
                    {displayUptime < 3600
                      ? `${Math.floor(displayUptime / 60)}m`
                      : `${(displayUptime / 3600).toFixed(1)}h`}
                  </div>
                  <div className="text-xs text-[#71717a]">Uptime</div>
                  <div className="text-[10px] text-[#6B6890] mt-0.5">{isLiveUptime ? 'Live' : 'Since creation'}</div>
                </div>
                {/* Uptime ring */}
                <svg width="28" height="28" viewBox="0 0 28 28" className="progress-ring self-end">
                  <circle cx="14" cy="14" r="10" className="progress-ring-bg" strokeWidth="2.5" />
                  <circle
                    cx="14" cy="14" r="10"
                    className="progress-ring-fill"
                    strokeWidth="2.5"
                    stroke="#60a5fa"
                    strokeDasharray={`${Math.min(displayUptime / 86400, 1) * 62.8} 62.8`}
                  />
                </svg>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Cpu size={18} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold truncate text-[#FFFFFF]">
                    {llmProvider}
                  </div>
                  <div className="text-xs text-[#71717a]">LLM Provider</div>
                </div>
                {hasApiKey && (
                  <div className="self-end">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">BYOK</span>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                }`}>
                  <Activity size={18} className={isActive ? 'text-emerald-400' : 'text-amber-400'} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1.5 text-lg font-bold ${
                      isActive ? 'text-emerald-400' : 'text-[#FFFFFF]'
                    }`}>
                      {isActive && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                      )}
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="text-xs text-[#71717a]">Status</div>
                </div>
                {stats?.lastActiveAt && (
                  <div className="self-end text-[9px] text-[#71717a]">
                    {timeAgo(stats.lastActiveAt)}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Framework info */}
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4 text-[#A5A1C2]">
              Framework Details
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs block mb-1 text-[#71717a]">Framework</span>
                <span className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border ${FRAMEWORK_BADGE[agent.framework] ?? ''}`}>
                  {frameworkMeta?.name ?? agent.framework}
                </span>
              </div>
              <div>
                <span className="text-xs block mb-1 text-[#71717a]">Docker Image</span>
                <span className="text-sm font-mono text-[#FFFFFF]">
                  {frameworkMeta?.dockerImage ?? 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs block mb-1 text-[#71717a]">Chat Endpoint</span>
                <span className="text-sm font-mono text-[#FFFFFF]">
                  {frameworkMeta?.chatEndpoint ?? 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs block mb-1 text-[#71717a]">Container Port</span>
                <span className="text-sm font-mono text-[#FFFFFF]">
                  {frameworkMeta?.port ?? 'N/A'}
                </span>
              </div>
              {frameworkMeta?.bestFor && (
                <div className="sm:col-span-2">
                  <span className="text-xs block mb-1 text-[#71717a]">Best For</span>
                  <span className="text-sm text-[#A5A1C2]">
                    {frameworkMeta.bestFor}
                  </span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Live logs preview */}
          <GlassCard className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <ScrollText size={14} className="text-[#f97316]" />
                <h3 className="text-sm font-semibold text-[#A5A1C2]">Live Logs</h3>
                {isActive && (
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <button
                onClick={() => setTab('logs')}
                className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all text-[#71717a] hover:text-[#A5A1C2]"
              >
                View All
              </button>
            </div>
            <div className="log-viewer max-h-56 overflow-y-auto py-1">
              {logsLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#71717a]">No logs available yet.</p>
                </div>
              ) : (
                logs.slice(-10).map((log, i) => (
                  <div key={i} className={`log-line log-line-${log.level}`}>
                    <span className="log-timestamp">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`log-badge log-badge-${log.level}`}>
                      {log.level}
                    </span>
                    <span className={`truncate ${LOG_LEVEL_COLORS[log.level] ?? 'text-[#A5A1C2]'}`}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Quick action buttons */}
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTab('chat')}
              className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.06] hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all duration-200 text-sm text-[#A5A1C2] bg-[rgba(26,23,48,0.6)]"
            >
              <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center group-hover/btn:bg-[#f97316]/15 transition-colors">
                <MessageSquare size={16} className="text-[#f97316]" />
              </div>
              Chat
            </button>
            <button
              onClick={() => setTab('logs')}
              className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.06] hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all duration-200 text-sm text-[#A5A1C2] bg-[rgba(26,23,48,0.6)]"
            >
              <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center group-hover/btn:bg-[#f97316]/15 transition-colors">
                <ScrollText size={16} className="text-[#f97316]" />
              </div>
              Full Logs
            </button>
            <button
              onClick={() => setTab('config')}
              className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.06] hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all duration-200 text-sm text-[#A5A1C2] bg-[rgba(26,23,48,0.6)]"
            >
              <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center group-hover/btn:bg-[#f97316]/15 transition-colors">
                <Settings size={16} className="text-[#f97316]" />
              </div>
              Configure
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── Config Tab ───────────────────────────────────── */}
      {tab === 'config' && (
        <motion.div key="tab-config" className="max-w-2xl space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
          {/* Agent basic info */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#f97316]/10 flex items-center justify-center">
                <Settings size={14} className="text-[#f97316]" />
              </div>
              <h3 className="text-sm font-semibold text-[#A5A1C2]">Agent Info</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="config-name" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Name</label>
                <input
                  id="config-name"
                  type="text"
                  className="config-input"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div>
                <label htmlFor="config-description" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Description</label>
                <textarea
                  id="config-description"
                  className="config-input resize-none"
                  rows={2}
                  value={configDesc}
                  onChange={(e) => setConfigDesc(e.target.value)}
                  maxLength={500}
                />
                <div className="text-right mt-1">
                  <span className={`text-[10px] ${configDesc.length > 450 ? 'text-amber-400' : 'text-[#71717a]'}`}>
                    {configDesc.length}/500
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* OpenClaw Config */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Cpu size={14} className="text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-[#A5A1C2]">OpenClaw Config</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="config-system-prompt" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">System Prompt</label>
                <textarea
                  id="config-system-prompt"
                  className="config-textarea"
                  rows={6}
                  value={configSystemPrompt}
                  onChange={(e) => setConfigSystemPrompt(e.target.value)}
                  placeholder="You are a helpful AI assistant..."
                />
                <p className="text-[10px] mt-1 text-[#71717a]">
                  Define your agent's personality and behavior. Supports multi-line instructions.
                </p>
              </div>
              <div>
                {(() => {
                  const hasUnlimitedSkills = activeFeatureKeys.has('openclaw.skills.unlimited');
                  const hasPack10 = activeFeatureKeys.has('openclaw.skills.pack10');
                  const maxSkills = hasUnlimitedSkills ? Infinity : hasPack10 ? 10 : FREE_TIER_LIMITS.openclaw.maxSkills;
                  const parsedSkills = configSkills ? configSkills.split(',').map((s) => s.trim()).filter(Boolean) : [];
                  const overLimit = !hasUnlimitedSkills && parsedSkills.length > maxSkills;
                  return (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="config-skills" className="block text-[11px] font-medium uppercase tracking-wider text-[#71717a]">Skills (comma-separated)</label>
                        <span className={`text-[10px] font-medium ${overLimit ? 'text-amber-400' : 'text-[#71717a]'}`}>
                          {parsedSkills.length}/{hasUnlimitedSkills ? '∞' : maxSkills}
                          {!hasUnlimitedSkills && !hasPack10 && <span className="ml-1 text-[#71717a]">· Free tier</span>}
                          {hasPack10 && !hasUnlimitedSkills && <span className="ml-1 text-[#f97316]">· Pack 10</span>}
                          {hasUnlimitedSkills && <span className="ml-1 text-[#f97316]">· Unlimited</span>}
                        </span>
                      </div>
                      <input
                        id="config-skills"
                        type="text"
                        className="config-input"
                        value={configSkills}
                        onChange={(e) => setConfigSkills(e.target.value)}
                        placeholder="chat, search, calculator..."
                      />
                      {overLimit && (
                        <p className="text-[10px] mt-1 text-amber-400 flex items-center gap-1">
                          <AlertTriangle size={10} />
                          {parsedSkills.length - maxSkills} skill{parsedSkills.length - maxSkills > 1 ? 's' : ''} over limit — extra skills will be ignored at runtime
                        </p>
                      )}
                      {parsedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {parsedSkills.map((skill, i) => (
                            <span key={skill} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              !hasUnlimitedSkills && i >= maxSkills
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 line-through opacity-60'
                                : 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20'
                            }`}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </GlassCard>

          {/* LLM Configuration */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Zap size={14} className="text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-[#A5A1C2]">LLM Configuration</h3>
            </div>
            <div className="space-y-4">
              {/* 1. Provider selector */}
              <div>
                <label htmlFor="config-provider" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Provider</label>
                <div className="relative">
                  <select
                    id="config-provider"
                    className="config-input text-sm appearance-none pr-8 cursor-pointer"
                    value={configProvider}
                    onChange={(e) => {
                      const newProvider = e.target.value;
                      setConfigProvider(newProvider);
                      setUseCustomModel(false);
                      setCustomModelInput('');
                      // Auto-select the first model of the new provider
                      const meta = getBYOKProvider(newProvider);
                      setConfigModel(meta?.models[0]?.id ?? '');
                    }}
                  >
                    {BYOK_PROVIDERS.map((p) => (
                      <option key={p.key} value={p.key} style={{ background: '#0D0B1A' }}>{p.name} — {p.description}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                </div>
                {configProvider === 'groq' && (
                  <p className="text-[10px] mt-1.5 text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={10} />
                    Free tier — using Hatcher&apos;s default Groq key. No API key needed.
                  </p>
                )}
              </div>

              {/* 2. Model selector */}
              <div>
                <label htmlFor="config-model" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Model</label>
                {!useCustomModel ? (
                  <>
                    <div className="relative">
                      <select
                        id="config-model"
                        className="config-input text-sm font-mono appearance-none pr-8 cursor-pointer"
                        value={configModel}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setUseCustomModel(true);
                            setCustomModelInput(configModel);
                          } else {
                            setConfigModel(e.target.value);
                          }
                        }}
                      >
                        {providerModels.map((m) => (
                          <option key={m.id} value={m.id} style={{ background: '#0D0B1A' }}>
                            {m.name}{m.context ? ` (${m.context})` : ''}
                          </option>
                        ))}
                        <option value="__custom__" style={{ background: '#0D0B1A' }}>Custom model...</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                    </div>
                    <p className="text-[10px] mt-1 text-[#71717a]">
                      Select a model for {currentProviderMeta?.name ?? llmProvider}, or choose &quot;Custom model...&quot; to enter a model ID manually.
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      id="config-model-custom"
                      type="text"
                      className="config-input font-mono text-xs"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      placeholder="e.g. my-fine-tuned-model-v2"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-[#71717a]">
                        Enter a custom model ID for {currentProviderMeta?.name ?? llmProvider}.
                      </p>
                      <button
                        type="button"
                        className="text-[10px] text-[#A78BFA] hover:text-[#c4b5fd] transition-colors"
                        onClick={() => {
                          setUseCustomModel(false);
                          // Restore to first known model if custom input is empty
                          if (!customModelInput.trim()) {
                            setConfigModel(providerModels[0]?.id ?? '');
                          } else {
                            setConfigModel(customModelInput.trim());
                          }
                        }}
                      >
                        Back to model list
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 3. BYOK API Key — hidden for groq free tier */}
              {configProvider !== 'groq' && (
                <div>
                  <label htmlFor="config-byok-key" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">
                    API Key <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="config-byok-key"
                      type={showByokKey ? 'text' : 'password'}
                      className="config-input font-mono text-xs pr-10"
                      placeholder={hasApiKey ? '••••••••••••••• (already set)' : `Enter ${currentProviderMeta?.name ?? 'provider'} API key`}
                      value={byokKeyInput}
                      onChange={(e) => setByokKeyInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#A5A1C2] transition-colors"
                      onClick={() => setShowByokKey(!showByokKey)}
                    >
                      {showByokKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] mt-1 text-[#71717a]">
                    {hasApiKey
                      ? 'Key already set. Enter a new value to replace it. Your key is encrypted (AES-256) and never logged.'
                      : 'Your key is encrypted (AES-256) and never logged.'}
                  </p>

                  {/* Disclaimer warning */}
                  <div className="mt-3 flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs leading-relaxed text-amber-400">
                      Make sure your API key is correct and has sufficient credits. If the key is invalid or exhausted, your agent will stop responding. You can always revert to the free Groq tier.
                    </p>
                  </div>

                  {/* Revert to Free Tier button */}
                  <button
                    type="button"
                    className="mt-3 flex items-center gap-1.5 text-xs text-[#A5A1C2] hover:text-[#F0EEFC] border border-[rgba(46,43,74,0.6)] hover:border-[rgba(124,58,237,0.5)] bg-transparent hover:bg-[#2E2B4A] rounded-xl px-3 py-1.5 transition-all duration-200 font-medium"
                    onClick={() => {
                      const groqMeta = getBYOKProvider('groq');
                      setConfigProvider('groq');
                      setByokKeyInput('');
                      setUseCustomModel(false);
                      setCustomModelInput('');
                      setConfigModel(groqMeta?.models[0]?.id ?? '');
                    }}
                  >
                    <RefreshCw size={12} />
                    Revert to Free Tier (Groq)
                  </button>
                </div>
              )}
              {byokKeyInput.trim() && (
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white bg-[#f97316] hover:bg-[#ea580c] rounded-xl px-4 py-2 transition-all duration-200 disabled:opacity-40"
                >
                  {saving ? (
                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCircle size={13} /> Save API Key</>
                  )}
                </button>
              )}
            </div>
          </GlassCard>

          {/* Unlocked Integrations Config */}
          {activeFeatures.length > 0 && (() => {
            const integrations = OPENCLAW_INTEGRATIONS;
            const unlockedIntegrations = integrations.filter((ig) => activeFeatureKeys.has(ig.featureKey));
            const coveredKeys = new Set(integrations.map((ig) => ig.featureKey));
            const genericFeatures = activeFeatures.filter((f) => !coveredKeys.has(f.featureKey));

            if (unlockedIntegrations.length === 0 && genericFeatures.length === 0) return null;

            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-[#f97316]" />
                  <h3 className="text-sm font-semibold text-[#A5A1C2]">
                    Unlocked Integrations
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/20">
                    {unlockedIntegrations.length + genericFeatures.length} active
                  </span>
                </div>

                {/* Security warning */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed text-[#A5A1C2]">
                    API keys and tokens are encrypted with AES-256-GCM before storage. Once saved, secret values are never shown again -- only masked placeholders will appear.
                  </p>
                </div>

                {/* Integration cards */}
                {unlockedIntegrations.map((integration) => {
                  const isExpanded = expandedIntegrations.has(integration.featureKey);
                  const isSaving = savingIntegration === integration.featureKey;
                  const msg = integrationSaveMsg[integration.featureKey] ?? '';
                  const currentValues = integrationSecrets[integration.featureKey] ?? {};
                  const hasAnyConfigured = integration.fields.some((f) => hasExistingSecret(f.key));

                  return (
                    <GlassCard key={integration.featureKey} className="!p-0 overflow-hidden">
                      {/* Header - always visible */}
                      <button
                        type="button"
                        onClick={() => toggleIntegrationExpanded(integration.featureKey)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center">
                          <CheckCircle size={16} className="text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#FFFFFF]">
                              {integration.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                            {hasAnyConfigured && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/20">
                                Configured
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5 truncate text-[#71717a]">
                            {integration.description}
                          </p>
                        </div>
                        {isExpanded
                          ? <ChevronUp size={16} className="text-[#71717a]" />
                          : <ChevronDown size={16} className="text-[#71717a]" />
                        }
                      </button>

                      {/* Expanded form */}
                      {isExpanded && (
                        <div className="border-t border-white/[0.06] p-4 space-y-4">
                          {integration.fields.map((field) => {
                            const fieldId = `${integration.featureKey}.${field.key}`;
                            const isVisible = visibleFields.has(fieldId);
                            const existsAlready = hasExistingSecret(field.key);
                            const value = currentValues[field.key] ?? '';

                            return (
                              <div key={field.key}>
                                <label htmlFor={`field-${fieldId}`} className="flex items-center gap-1.5 text-xs mb-1.5 text-[#71717a]">
                                  {field.label}
                                  {field.required && <span className="text-[#f97316]">*</span>}
                                </label>

                                {field.type === 'select' ? (
                                  <div className="relative">
                                    <select
                                      id={`field-${fieldId}`}
                                      className="config-input text-sm appearance-none pr-8 cursor-pointer"
                                      value={value}
                                      onChange={(e) => setIntegrationField(integration.featureKey, field.key, e.target.value)}
                                    >
                                      <option value="" style={{ background: '#0D0B1A' }}>Select...</option>
                                      {field.options?.map((opt) => (
                                        <option key={opt.value} value={opt.value} style={{ background: '#0D0B1A' }}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <input
                                      id={`field-${fieldId}`}
                                      type={field.type === 'password' && !isVisible ? 'password' : 'text'}
                                      className="config-input text-sm pr-10"
                                      value={value}
                                      onChange={(e) => setIntegrationField(integration.featureKey, field.key, e.target.value)}
                                      placeholder={existsAlready ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (already configured)' : (field.placeholder ?? '')}
                                    />
                                    {field.type === 'password' && (
                                      <button
                                        type="button"
                                        onClick={() => toggleFieldVisibility(fieldId)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/5 rounded transition-colors"
                                      >
                                        {isVisible
                                          ? <EyeOff size={14} className="text-[#71717a]" />
                                          : <Eye size={14} className="text-[#71717a]" />
                                        }
                                      </button>
                                    )}
                                  </div>
                                )}

                                {field.helper && (
                                  <p className="text-[10px] mt-1 leading-relaxed text-[#71717a]">
                                    {field.helper}
                                  </p>
                                )}
                              </div>
                            );
                          })}

                          {/* Save button for this integration */}
                          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
                            <button
                              onClick={() => saveIntegrationSecrets(integration)}
                              disabled={isSaving}
                              className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40 hover:opacity-90 bg-[#f97316]"
                            >
                              {isSaving ? 'Saving...' : 'Save Credentials'}
                            </button>
                            {msg && (
                              <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                                {msg}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}

                {/* Generic unlocked features not covered by integration definitions */}
                {genericFeatures.length > 0 && (
                  <GlassCard>
                    <h4 className="text-xs font-semibold mb-3 text-[#71717a]">
                      Other Features
                    </h4>
                    <div className="space-y-2">
                      {genericFeatures.map((f) => {
                        const meta = FEATURE_CATALOG.find((fc) => fc.key === f.featureKey);
                        return (
                          <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5">
                            <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                            <span className="text-sm text-[#FFFFFF]">
                              {meta?.name ?? f.featureKey}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Active</span>
                            {f.expiresAt && (
                              <span className="text-[10px] ml-auto text-[#71717a]">
                                Expires: {new Date(f.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}
              </div>
            );
          })()}

          {/* No features unlocked hint */}
          {activeFeatures.length === 0 && !featuresLoading && (
            <div className="p-4 rounded-lg border border-white/[0.06] text-center bg-[rgba(26,23,48,0.6)]">
              <Lock size={20} className="mx-auto mb-2 text-[#71717a]" />
              <p className="text-sm mb-2 text-[#A5A1C2]">
                No integrations unlocked yet
              </p>
              <button
                onClick={() => setTab('integrations')}
                className="text-xs px-4 py-2 rounded-lg border border-[#f97316]/30 hover:bg-[#f97316]/10 transition-all text-[#f97316]"
              >
                Browse Integrations
              </button>
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle size={15} /> Save Configuration</>
              )}
            </button>
            {saveMsg && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-sm font-medium ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {saveMsg}
              </motion.span>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Integrations Tab ─────────────────────────────── */}
      {tab === 'integrations' && (
        <motion.div key="tab-integrations" className="space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
          {featuresLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <>
              {/* Security note shown when any features are unlocked */}
              {activeFeatures.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed text-[#A5A1C2]">
                    API keys and tokens are encrypted with AES-256-GCM before storage. Once saved, secret values are never shown again — only masked placeholders will appear.
                  </p>
                </div>
              )}

              {/* Feature categories */}
              {Object.entries(featuresByCategory).map(([category, features]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {features.map((feature) => {
                      const featureIsActive = activeFeatureKeys.has(feature.key);
                      const isUnlocking = unlocking === feature.key;
                      const activeData = activeFeatures.find((f) => f.featureKey === feature.key);
                      const integration = OPENCLAW_INTEGRATIONS.find((i) => i.featureKey === feature.key);
                      const isExpanded = expandedIntegrations.has(feature.key);
                      const isSaving = savingIntegration === feature.key;
                      const integrationMsg = integrationSaveMsg[feature.key] ?? '';
                      const currentValues = integrationSecrets[feature.key] ?? {};

                      return (
                        <GlassCard key={feature.key} className={`!p-0 overflow-hidden ${featureIsActive ? 'border-emerald-500/20' : ''}`}>
                          {/* Feature header row */}
                          <div className="flex items-start gap-3 p-5">
                            <motion.div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                featureIsActive ? 'bg-emerald-500/15' : 'bg-white/5'
                              }`}
                              animate={featureIsActive ? { rotate: [0, 360], scale: [0.8, 1.1, 1] } : {}}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            >
                              {featureIsActive ? (
                                <CheckCircle size={18} className="text-emerald-400" />
                              ) : isUnlocking ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                                  <Lock size={18} className="text-[#f97316]" />
                                </motion.div>
                              ) : (
                                <Lock size={18} className="text-[#71717a]" />
                              )}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-[#FFFFFF]">
                                  {feature.name}
                                </span>
                                {featureIsActive && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                    Active
                                  </span>
                                )}
                                {featureIsActive && integration && integration.fields.some((f) => hasExistingSecret(f.key)) && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/20">
                                    Configured
                                  </span>
                                )}
                              </div>
                              <p className="text-xs mb-2 text-[#71717a]">
                                {feature.description}
                              </p>
                              {featureIsActive && activeData?.expiresAt && (
                                <p className="text-[10px] text-[#71717a]">
                                  Expires: {new Date(activeData.expiresAt).toLocaleDateString()}
                                </p>
                              )}
                              {!featureIsActive && (
                                <button
                                  onClick={() => handleUnlockFeature(feature.key, feature.usdPrice)}
                                  disabled={isUnlocking || feature.free}
                                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#f97316]/30 text-[#f97316] transition-all disabled:opacity-40 hover:bg-[#f97316]/10"
                                >
                                  {isUnlocking ? (
                                    'Signing transaction...'
                                  ) : feature.free ? (
                                    'Included Free'
                                  ) : (
                                    <>
                                      <Lock size={12} />
                                      Unlock for ${feature.usdPrice} ({usdToSol(feature.usdPrice)} SOL)
                                    </>
                                  )}
                                </button>
                              )}
                              {/* Configure button for unlocked integrations with credential fields */}
                              {featureIsActive && integration && (
                                <button
                                  type="button"
                                  onClick={() => toggleIntegrationExpanded(feature.key)}
                                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all mt-1"
                                >
                                  <Settings size={12} />
                                  Configure
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                feature.type === 'one_time'
                                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                  : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                              }`}>
                                {feature.type === 'one_time' ? 'One-time' : 'Monthly'}
                              </span>
                            </div>
                          </div>

                          {/* Inline credential fields for unlocked integrations */}
                          {featureIsActive && integration && isExpanded && (
                            <div className="border-t border-white/[0.06] p-5 space-y-4 bg-white/[0.01]">
                              {integration.fields.map((field) => {
                                const fieldId = `integrations-tab.${integration.featureKey}.${field.key}`;
                                const isVisible = visibleFields.has(fieldId);
                                const existsAlready = hasExistingSecret(field.key);
                                const value = currentValues[field.key] ?? '';

                                return (
                                  <div key={field.key}>
                                    <label htmlFor={`field-${fieldId}`} className="flex items-center gap-1.5 text-xs mb-1.5 text-[#71717a]">
                                      {field.label}
                                      {field.required && <span className="text-[#f97316]">*</span>}
                                    </label>

                                    {field.type === 'select' ? (
                                      <div className="relative">
                                        <select
                                          id={`field-${fieldId}`}
                                          className="config-input text-sm appearance-none pr-8 cursor-pointer"
                                          value={value}
                                          onChange={(e) => setIntegrationField(integration.featureKey, field.key, e.target.value)}
                                        >
                                          <option value="" style={{ background: '#0D0B1A' }}>Select...</option>
                                          {field.options?.map((opt) => (
                                            <option key={opt.value} value={opt.value} style={{ background: '#0D0B1A' }}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                                      </div>
                                    ) : (
                                      <div className="relative">
                                        <input
                                          id={`field-${fieldId}`}
                                          type={field.type === 'password' && !isVisible ? 'password' : 'text'}
                                          className="config-input text-sm pr-10"
                                          value={value}
                                          onChange={(e) => setIntegrationField(integration.featureKey, field.key, e.target.value)}
                                          placeholder={existsAlready ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (already configured)' : (field.placeholder ?? '')}
                                        />
                                        {field.type === 'password' && (
                                          <button
                                            type="button"
                                            onClick={() => toggleFieldVisibility(fieldId)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/5 rounded transition-colors"
                                          >
                                            {isVisible
                                              ? <EyeOff size={14} className="text-[#71717a]" />
                                              : <Eye size={14} className="text-[#71717a]" />
                                            }
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {field.helper && (
                                      <p className="text-[10px] mt-1 leading-relaxed text-[#71717a]">
                                        {field.helper}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Save button */}
                              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
                                <button
                                  onClick={() => saveIntegrationSecrets(integration)}
                                  disabled={isSaving}
                                  className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40 hover:opacity-90 bg-[#f97316]"
                                >
                                  {isSaving ? 'Saving...' : 'Save Credentials'}
                                </button>
                                {integrationMsg && (
                                  <span className={`text-xs ${integrationMsg.startsWith('Error') || integrationMsg.startsWith('Missing') ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {integrationMsg}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </GlassCard>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Other Platforms section */}
              {(() => {
                const extraFeature = FEATURE_CATALOG.find((f) => f.key === 'openclaw.platform.extra');
                if (!extraFeature) return null;
                const extraIsActive = activeFeatureKeys.has('openclaw.platform.extra');
                const isUnlockingExtra = unlocking === 'openclaw.platform.extra';
                return (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
                      Other Platforms
                    </h3>
                    <GlassCard className={extraIsActive ? 'border-emerald-500/20' : ''}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${extraIsActive ? 'bg-emerald-500/15' : 'bg-white/5'}`}>
                          {extraIsActive ? (
                            <CheckCircle size={18} className="text-emerald-400" />
                          ) : (
                            <Lock size={18} className="text-[#71717a]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[#FFFFFF]">All Platforms</span>
                            {extraIsActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                Unlocked
                              </span>
                            )}
                          </div>
                          <p className="text-xs mb-2 text-[#71717a]">
                            Unlock 15+ additional platforms including Twitch, Matrix, IRC, Line, WeChat, and more.
                          </p>
                          {extraIsActive ? (
                            <p className="text-xs text-emerald-400/80">
                              All platforms enabled. Configure additional platform credentials via your agent&apos;s openclaw.json config.
                            </p>
                          ) : (
                            <button
                              onClick={() => handleUnlockFeature('openclaw.platform.extra', extraFeature.usdPrice)}
                              disabled={isUnlockingExtra}
                              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#f97316]/30 text-[#f97316] transition-all disabled:opacity-40 hover:bg-[#f97316]/10"
                            >
                              {isUnlockingExtra ? (
                                'Signing transaction...'
                              ) : (
                                <>
                                  <Lock size={12} />
                                  Unlock for ${extraFeature.usdPrice} ({usdToSol(extraFeature.usdPrice)} SOL)
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                            One-time
                          </span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                );
              })()}

              {/* Bundles section */}
              {frameworkBundles.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
                    Bundles (Save More)
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {frameworkBundles.map((bundle) => {
                      const allUnlocked = bundle.features.every((fk) => activeFeatureKeys.has(fk));
                      return (
                        <GlassCard key={bundle.key} className={allUnlocked ? 'border-emerald-500/20' : ''}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Zap size={16} className="text-[#f97316]" />
                              <h4 className="font-semibold text-sm text-[#FFFFFF]">
                                {bundle.name}
                              </h4>
                            </div>
                            {allUnlocked ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                All Unlocked
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-[#f97316]">
                                ${bundle.usdPrice}
                              </span>
                            )}
                          </div>
                          <p className="text-xs mb-3 text-[#71717a]">
                            {bundle.description}
                          </p>
                          <div className="space-y-1.5 mb-3">
                            {bundle.features.map((fk) => {
                              const feat = FEATURE_CATALOG.find((f) => f.key === fk);
                              const isUnlocked = activeFeatureKeys.has(fk);
                              return (
                                <div key={fk} className="flex items-center gap-2 text-xs">
                                  {isUnlocked ? (
                                    <CheckCircle size={12} className="text-emerald-400" />
                                  ) : (
                                    <div className="w-3 h-3 rounded-full border border-white/20" />
                                  )}
                                  <span className={isUnlocked ? 'text-[#A5A1C2]' : 'text-[#71717a]'}>
                                    {feat?.name ?? fk}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          {!allUnlocked && (
                            <button
                              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 bg-[#f97316]"
                              onClick={async () => {
                                const solAmt = usdToSol(bundle.usdPrice);
                                if (!confirm(`Unlock ${bundle.name} bundle for $${bundle.usdPrice} (${solAmt} SOL)?`)) return;
                                if (!wallet.publicKey) { setActionError('Please connect your wallet first.'); return; }
                                try {
                                  const txSig = await sendSolPayment({ wallet, connection, solAmount: solAmt });
                                  const res = await api.unlockBundle({ agentId: agent.id, bundleKey: bundle.key, paymentToken: 'sol', amount: solAmt, txSignature: txSig });
                                  if (res.success) {
                                    const featRes = await api.getAgentFeatures(agent.id);
                                    if (featRes.success) setActiveFeatures(featRes.data);
                                  } else {
                                    setActionError((res as {error: string}).error || 'Bundle unlock failed');
                                  }
                                } catch (err) {
                                  setActionError(err instanceof Error ? err.message : 'Payment failed');
                                }
                              }}
                            >
                              Unlock Bundle - ${bundle.usdPrice} ({usdToSol(bundle.usdPrice)} SOL)
                            </button>
                          )}
                        </GlassCard>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price note */}
              <p className="text-center text-xs text-[#71717a]">
                All prices in USD, paid in $HATCH at live market rate via Jupiter
              </p>
            </>
          )}
        </motion.div>
      )}

      {/* ─── Logs Tab ─────────────────────────────────────── */}
      {tab === 'logs' && (
        <motion.div key="tab-logs" className="space-y-4" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-[#71717a]" />
            {(['all', 'info', 'warn', 'error'] as LogFilter[]).map((f) => {
              const filterColors: Record<string, string> = {
                all: '',
                info: logFilter === f ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : '',
                warn: logFilter === f ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : '',
                error: logFilter === f ? 'border-red-500/40 bg-red-500/10 text-red-400' : '',
              };
              const counts = { all: logs.length, info: logs.filter(l => l.level === 'info').length, warn: logs.filter(l => l.level === 'warn').length, error: logs.filter(l => l.level === 'error').length };
              return (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                    logFilter === f
                      ? (filterColors[f] || 'border-[#f97316]/40 bg-[#f97316]/10 text-[#FFFFFF]')
                      : 'border-[rgba(46,43,74,0.4)] text-[#71717a] hover:border-[rgba(46,43,74,0.6)] hover:text-[#A5A1C2]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="text-[10px] opacity-60">{counts[f]}</span>
                </button>
              );
            })}

            {/* SSE live indicator */}
            {isActive && tab === 'logs' && (
              <span className="flex items-center gap-1.5 ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                Live
              </span>
            )}

            <button
              onClick={loadLogs}
              disabled={logsLoading}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-[rgba(46,43,74,0.4)] text-[#71717a] hover:border-[rgba(46,43,74,0.6)] hover:text-[#A5A1C2] transition-all flex items-center gap-1.5"
            >
              <RotateCcw size={12} className={logsLoading ? 'animate-spin' : ''} />
              {logsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Log viewer */}
          <GlassCard className="!p-0 overflow-hidden">
            {/* Terminal-style header bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-black/20">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[10px] font-mono text-[#71717a]">
                {agent.name} -- {filteredLogs.length} entries
              </span>
            </div>
            <div className="log-viewer overflow-y-auto max-h-[calc(100vh-340px)] min-h-[400px] py-2">
              {logsLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <ScrollText size={24} className="text-[#71717a]/50" />
                  <p className="text-sm text-[#71717a]">
                    {logs.length === 0 ? 'No logs available yet.' : `No ${logFilter} logs found.`}
                  </p>
                </div>
              ) : (
                filteredLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`log-line log-line-${log.level}`}
                  >
                    <span className="log-timestamp">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2 } as Intl.DateTimeFormatOptions)}
                    </span>
                    <span className={`log-badge log-badge-${log.level}`}>
                      {log.level}
                    </span>
                    <span className={`break-all flex-1 ${LOG_LEVEL_COLORS[log.level] ?? 'text-[#A5A1C2]'}`}>{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ─── Chat Tab ─────────────────────────────────────── */}
      {tab === 'chat' && (
        <motion.div key="tab-chat" className="flex flex-col h-[calc(100vh-300px)] min-h-[400px]" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
            {messages.length === 0 && (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <RobotMascot size="lg" mood="happy" className="mx-auto mb-4" />
                <p className="text-sm mb-1 text-[#A5A1C2]">
                  Start a conversation with <span className="font-medium text-[#f97316]">{agent.name}</span>
                </p>
                <p className="text-xs mb-1 text-[#71717a]">
                  Streaming support enabled
                </p>

                {/* Suggested prompts */}
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {DEFAULT_PROMPTS.map((prompt, i) => (
                    <motion.button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-xs px-4 py-2 rounded-full border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 mt-1">
                    <RobotMascot size="sm" mood={msg.streaming ? 'thinking' : 'happy'} animate={false} />
                  </div>
                )}
                <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`} style={{ maxWidth: '75%' }}>
                  <div
                    className={`chat-bubble text-[#FFFFFF] ${
                      msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                    }`}
                  >
                    {msg.content ? (
                      <p className="whitespace-pre-wrap">
                        {msg.content}
                        {msg.streaming && (
                          <span className="inline-block w-[2px] h-4 ml-0.5 align-text-bottom bg-[#f97316] animate-pulse rounded-full" />
                        )}
                      </p>
                    ) : msg.streaming ? (
                      <div className="flex gap-2 items-center h-5 px-1">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    ) : null}
                  </div>
                  {msg.timestamp && !msg.streaming && (
                    <span className={`text-[10px] px-1.5 text-[#71717a] select-none`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Chat error */}
          {chatError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-4 py-2.5 mb-3 flex items-center gap-3">
              <span className="flex-1">
                {chatErrorType === 'ratelimit' ? (
                  <>
                    Daily limit reached.{' '}
                    <button
                      className="underline hover:opacity-80 transition-opacity text-[#f97316]"
                      onClick={() => setTab('integrations')}
                    >
                      Unlock features
                    </button>
                  </>
                ) : chatError}
              </span>
              {(chatErrorType === 'timeout' || chatErrorType === 'generic' || chatErrorType === 'network') && (
                <button
                  className="text-xs border border-white/20 px-2 py-0.5 rounded hover:bg-white/5 transition-colors text-[#71717a]"
                  onClick={() => {
                    setChatError(null);
                    setChatErrorType(null);
                    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                    if (lastUser) {
                      setMessages((prev) => prev.filter((m) => m.id !== lastUser.id));
                      void sendMessage(lastUser.content);
                    }
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Input bar */}
          {!isAuthenticated ? (
            <GlassCard className="text-center">
              <p className="text-sm text-[#71717a]">
                Connect your wallet to chat with this agent.
              </p>
            </GlassCard>
          ) : isLimitReached ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-center">
              <p className="text-sm text-amber-400">
                Daily limit reached.{' '}
                <button
                  className="underline hover:opacity-80 transition-opacity text-[#f97316]"
                  onClick={() => setTab('integrations')}
                >
                  Unlock more features
                </button>
              </p>
            </div>
          ) : (
            <div>
              {/* Message counter */}
              {!hasUnlimitedChat && (
                <div className="text-right text-[10px] mb-1.5 pr-1 text-[#71717a]">
                  {msgCount}/{msgLimit} messages today
                </div>
              )}

              <div className="flex gap-2 items-end rounded-2xl p-3 border border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.6)] backdrop-blur-xl focus-within:border-[#f97316]/40 focus-within:shadow-[0_0_20px_rgba(249,115,22,0.06)] transition-all duration-200">
                <textarea
                  ref={inputRef}
                  className="flex-1 bg-transparent border-none outline-none resize-none min-h-[36px] max-h-32 text-sm text-[#FFFFFF] placeholder:text-[#71717a] leading-relaxed"
                  rows={1}
                  placeholder={`Message ${agent.name}...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }}
                  disabled={sending}
                />
                <button
                  className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    input.trim() && !sending
                      ? 'bg-[#f97316] hover:bg-[#ea580c] shadow-[0_0_12px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                      : 'bg-[#f97316]/30 opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || sending}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={15} className="text-white translate-x-[1px]" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between mt-1.5 px-1">
                <span className="text-[10px] text-[#71717a]">
                  Powered by {llmProvider} | {frameworkMeta?.name ?? agent.framework}
                </span>
                <span className="text-[10px] text-[#71717a]">
                  Enter to send, Shift+Enter for new line
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}
      {tab === 'stats' && (
        <motion.div
          key="stats"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="space-y-6"
        >
          {/* Agent Info */}
          <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="text-[#f97316]" />
              <h3 className="text-base font-semibold text-[#fafafa]">Agent Info</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Created</p>
                <p className="text-sm font-medium text-[#fafafa]">
                  {agent ? new Date(agent.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '--'}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Framework</p>
                <p className="text-sm font-medium text-[#f97316] capitalize">{agent?.framework ?? '--'}</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Container ID</p>
                <p className="text-sm font-medium text-[#fafafa] font-mono">
                  {stats?.containerId ? stats.containerId.substring(0, 12) + '...' : 'None'}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Status</p>
                {(() => {
                  const currentStatus = stats?.status ?? agent?.status ?? 'paused';
                  const si = STATUS_STYLES[currentStatus] ?? STATUS_STYLES.paused;
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${si.classes}`}>
                      {si.pulse && (
                        <span className={`w-1.5 h-1.5 rounded-full ${si.dotColor} animate-pulse`} />
                      )}
                      {si.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-[#f97316]" />
              <h3 className="text-base font-semibold text-[#fafafa]">Activity Summary</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Messages Processed</p>
                {stats?.messagesProcessed && stats.messagesProcessed > 0 ? (
                  <p className="text-2xl font-bold text-[#fafafa]">{stats.messagesProcessed.toLocaleString()}</p>
                ) : (
                  <p className="text-sm text-[#6B6890] mt-1">No messages yet</p>
                )}
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Uptime</p>
                <p className="text-2xl font-bold text-[#fafafa]">
                  {displayUptime < 60
                    ? `${displayUptime}s`
                    : displayUptime < 3600
                    ? `${Math.floor(displayUptime / 60)}m ${displayUptime % 60}s`
                    : displayUptime < 86400
                    ? `${Math.floor(displayUptime / 3600)}h ${Math.floor((displayUptime % 3600) / 60)}m`
                    : `${Math.floor(displayUptime / 86400)}d ${Math.floor((displayUptime % 86400) / 3600)}h`}
                </p>
                <p className="text-[10px] text-[#6B6890] mt-1">{isLiveUptime ? 'Live' : 'Since creation'}</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Last Active</p>
                {stats?.lastActiveAt ? (
                  <p className="text-2xl font-bold text-[#fafafa]">{timeAgo(stats.lastActiveAt)}</p>
                ) : (
                  <p className="text-sm text-[#6B6890] mt-1">Not yet active</p>
                )}
              </div>
            </div>
          </div>

          {/* LLM Configuration */}
          <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-[#f97316]" />
              <h3 className="text-base font-semibold text-[#fafafa]">LLM Configuration</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Provider</p>
                <p className="text-sm font-medium text-[#fafafa] capitalize">{currentProviderMeta?.name ?? llmProvider}</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Model</p>
                <p className="text-sm font-medium text-[#fafafa] font-mono">
                  {(() => {
                    const cfg = (agent?.config ?? {}) as Record<string, unknown>;
                    const byok = cfg.byok as Record<string, unknown> | undefined;
                    return (byok?.model as string) ?? (cfg.model as string) ?? 'Default';
                  })()}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">API Key</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  hasApiKey
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {hasApiKey ? (
                    <><Shield size={12} /> BYOK Active</>
                  ) : (
                    <>Free Tier (Groq)</>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Active Features */}
          <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-[#f97316]" />
              <h3 className="text-base font-semibold text-[#fafafa]">Active Features</h3>
              <span className="ml-auto text-xs text-[#71717a]">{activeFeatures.length} unlocked</span>
            </div>
            {activeFeatures.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <Lock size={24} className="mx-auto mb-2 text-[#71717a]" />
                <p className="text-sm text-[#71717a]">No features unlocked yet.</p>
                <p className="text-xs text-[#71717a] mt-1">Unlock features in the Integrations tab to power up your agent.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeFeatures.map((feat) => {
                  const parts = feat.featureKey.split('.');
                  const category = parts.length >= 2 ? parts[parts.length - 2] : '';
                  const name = parts[parts.length - 1];
                  const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
                  const displayName = name.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return (
                    <div
                      key={feat.id}
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: 'rgba(46,43,74,0.3)' }}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-[#fafafa]">{displayCategory}: {displayName}</p>
                          <p className="text-xs text-[#71717a]">{feat.type === 'subscription' ? 'Subscription' : 'One-time'}</p>
                        </div>
                      </div>
                      {feat.expiresAt && (
                        <span className="text-xs text-[#A5A1C2]">
                          Expires {new Date(feat.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      </AnimatePresence>
    </motion.div>
  );
}
