'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  Puzzle,
  Sparkles,
  Download,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Check,
  ArrowUpRight,
  Package,
  RefreshCw,
  Star,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

// ─── Types ───────────────────────────────────────────────────

interface InstalledItem {
  name: string;
  displayName?: string;
  type: 'skill' | 'plugin';
  source: string;
  description: string | null;
  status: 'installed' | 'pending' | 'pending_restart' | 'failed';
  error?: string;
  requiresRestart?: boolean;
}

interface AvailableItem {
  name: string;            // install identifier (slug)
  displayName?: string;    // human-readable label
  description: string | null;
  source: string;
  requiresRestart?: boolean;
}

interface PluginLimits {
  used: number;
  max: number;
}

interface BundledSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  enabled: boolean;
}

type SubTab = 'skills' | 'plugins';

// ─── Recommended Items ──────────────────────────────────────

const RECOMMENDED: Record<string, Array<{ name: string; displayName?: string; type: 'skill' | 'plugin'; source: string; description: string }>> = {
  openclaw: [
    // Top 10 skills — verified slugs, no external binary deps
    { name: 'github', displayName: 'GitHub', type: 'skill', source: 'clawhub', description: 'Manage repos, PRs, issues, CI runs via gh CLI' },
    { name: 'in-depth-research', displayName: 'Deep Research', type: 'skill', source: 'clawhub', description: 'Multi-source investigation with methodology tracking' },
    { name: 'crypto-market-data', displayName: 'Crypto Market Data', type: 'skill', source: 'clawhub', description: 'Real-time prices, company profiles — no API key needed' },
    { name: 'code-quality', displayName: 'Code Quality', type: 'skill', source: 'clawhub', description: 'Coding style standards, security guidelines, accessibility' },
    { name: 'human-writing', displayName: 'Human Writing', type: 'skill', source: 'clawhub', description: 'Write naturally human content — no AI tells, no fluff' },
    { name: 'notion-skill', displayName: 'Notion', type: 'skill', source: 'clawhub', description: 'Work with Notion pages and databases via official API' },
    { name: 'todoist-task-manager', displayName: 'Todoist', type: 'skill', source: 'clawhub', description: 'Manage tasks via todoist CLI — list, add, complete, delete' },
    { name: 'desearch-web-search', displayName: 'Web Search', type: 'skill', source: 'clawhub', description: 'Real-time SERP-style search results with URLs and snippets' },
    { name: 'neural-memory', displayName: 'Neural Memory', type: 'skill', source: 'clawhub', description: 'Associative memory with spreading activation for recall' },
    { name: 'market-research-agent', displayName: 'Market Research', type: 'skill', source: 'clawhub', description: 'Structured market research — size, trends, competitors' },
    // Top 10 plugins — npm packages
    { name: '@openclaw/openviking', displayName: 'OpenViking Memory', type: 'plugin', source: 'npm', description: 'Long-term memory with auto-recall and context engine' },
    { name: '@sonicbotman/lobster-press', displayName: 'Lobster Press', type: 'plugin', source: 'npm', description: 'Cognitive memory system for AI agents' },
    { name: '@memwyre/openclaw-plugin', displayName: 'MemWyre', type: 'plugin', source: 'npm', description: 'Persistent memory integration for OpenClaw' },
    { name: 'openclaw-engram', displayName: 'Engram Memory', type: 'plugin', source: 'npm', description: 'Persistent memory service connection' },
    { name: '@echomem/echo-memory-cloud-openclaw-plugin', displayName: 'Echo Memory', type: 'plugin', source: 'npm', description: 'Sync local markdown memory to Echo Memory Cloud' },
    { name: '@waiaas/openclaw-plugin', displayName: 'WAIaaS Wallet', type: 'plugin', source: 'npm', description: 'AI agent wallet tools for OpenClaw' },
    { name: '@agentrux/agentrux-openclaw-plugin', displayName: 'AgenTrux', type: 'plugin', source: 'npm', description: 'Agent-to-Agent authenticated communication' },
    { name: '@artflo-ai/artflo-openclaw-plugin', displayName: 'Artflo Canvas', type: 'plugin', source: 'npm', description: 'Connect to Artflo canvas for visual AI' },
    { name: 'clawsocial-plugin', displayName: 'ClawSocial', type: 'plugin', source: 'npm', description: 'Social discovery for AI agents' },
    { name: '@clawchatsai/connector', displayName: 'ClawChats', type: 'plugin', source: 'npm', description: 'P2P tunnel and local API bridge' },
  ],
  hermes: [
    // Recommended ClawHub skills for Hermes
    { name: 'in-depth-research', displayName: 'Deep Research', type: 'skill', source: 'clawhub', description: 'Multi-source investigation with methodology tracking' },
    { name: 'crypto-market-data', displayName: 'Crypto Market Data', type: 'skill', source: 'clawhub', description: 'Real-time prices, company profiles — no API key needed' },
    { name: 'code-quality', displayName: 'Code Quality', type: 'skill', source: 'clawhub', description: 'Coding style standards, security guidelines, accessibility' },
    { name: 'human-writing', displayName: 'Human Writing', type: 'skill', source: 'clawhub', description: 'Write naturally human content — no AI tells, no fluff' },
    { name: 'notion-skill', displayName: 'Notion', type: 'skill', source: 'clawhub', description: 'Work with Notion pages and databases via official API' },
    { name: 'todoist-task-manager', displayName: 'Todoist', type: 'skill', source: 'clawhub', description: 'Manage tasks via todoist CLI — list, add, complete, delete' },
    { name: 'desearch-web-search', displayName: 'Web Search', type: 'skill', source: 'clawhub', description: 'Real-time SERP-style search results with URLs and snippets' },
    { name: 'neural-memory', displayName: 'Neural Memory', type: 'skill', source: 'clawhub', description: 'Associative memory with spreading activation for recall' },
    { name: 'market-research-agent', displayName: 'Market Research', type: 'skill', source: 'clawhub', description: 'Structured market research — size, trends, competitors' },
    { name: 'elite-longterm-memory', displayName: 'Elite Memory', type: 'skill', source: 'clawhub', description: 'WAL protocol + vector search + cloud backup memory system' },
    // Plugin
    { name: '42-evey/hermes-plugins', type: 'plugin', source: 'github', description: '23 plugins: autonomy, telemetry, safety, memory' },
  ],
  elizaos: [
    { name: '@elizaos/plugin-image', type: 'plugin', source: 'elizaos-registry', description: 'AI image generation' },
    { name: '@elizaos/plugin-video', type: 'plugin', source: 'elizaos-registry', description: 'Video generation and processing' },
    { name: '@elizaos/plugin-tts', type: 'plugin', source: 'elizaos-registry', description: 'Text to speech synthesis' },
  ],
  milady: [
    { name: 'milady-development', type: 'skill', source: 'milady-skills', description: 'Agent self-modification skill' },
    { name: '@elizaos/plugin-image', type: 'plugin', source: 'elizaos-registry', description: 'AI image generation' },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  clawhub:          { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'clawhub-plugin': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  github:           { bg: 'bg-slate-500/10', text: 'text-slate-300' },
  npm:              { bg: 'bg-red-500/10', text: 'text-red-400' },
  'elizaos-registry': { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  'milady-skills':  { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  bundled:          { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
};

function SourceBadge({ source }: { source: string }) {
  const colors = SOURCE_COLORS[source] ?? { bg: 'bg-zinc-500/10', text: 'text-zinc-400' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-white/5 ${colors.bg} ${colors.text}`}>
      {source}
    </span>
  );
}

function TypeBadge({ type }: { type: 'skill' | 'plugin' }) {
  const isSkill = type === 'skill';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-white/5 ${
      isSkill ? 'bg-violet-500/10 text-violet-400' : 'bg-blue-500/10 text-blue-400'
    }`}>
      {isSkill ? <Sparkles size={10} /> : <Puzzle size={10} />}
      {isSkill ? 'Skill' : 'Plugin'}
    </span>
  );
}

function StatusIndicator({ status, error }: { status: InstalledItem['status']; error?: string }) {
  if (status === 'installed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Installed
      </span>
    );
  }
  if (status === 'pending' || status === 'pending_restart') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        {status === 'pending' ? 'Pending — Restart to Install' : 'Restart Required'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-red-400" title={error}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Failed
    </span>
  );
}

// ─── Toggle Switch ──────────────────────────────────────────

function ToggleSwitch({
  enabled,
  loading,
  onChange,
}: {
  enabled: boolean;
  loading?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`
        relative flex-shrink-0 rounded-full transition-all duration-200
        w-11 h-6
        ${enabled
          ? 'bg-[var(--color-accent)] border border-[var(--color-accent)]/60 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
          : 'bg-[var(--bg-hover)] border border-[var(--border-hover)]'
        }
        ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-[var(--border-hover)]'}
      `}
      aria-label={enabled ? 'Disable' : 'Enable'}
    >
      <span
        className={`
          absolute top-[3px] rounded-full transition-all duration-200 shadow-sm
          w-[18px] h-[18px]
          ${enabled ? 'left-[21px] bg-white' : 'left-[3px] bg-[#71717a]'}
        `}
      />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={10} className="animate-spin text-white" />
        </span>
      )}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function PluginsTab() {
  const { agent, loadAgent } = useAgentContext();
  const { toast } = useToast();

  const [installed, setInstalled] = useState<InstalledItem[]>([]);
  const [availableSkills, setAvailableSkills] = useState<AvailableItem[]>([]);
  const [availablePlugins, setAvailablePlugins] = useState<AvailableItem[]>([]);
  const [limits, setLimits] = useState<PluginLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');

  // Bundled skills state
  const [bundledSkills, setBundledSkills] = useState<BundledSkill[]>([]);
  const [bundledLoading, setBundledLoading] = useState(true);
  const [bundledExpanded, setBundledExpanded] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // ElizaOS has no skills concept in v1.7.x
  const hasSkills = agent?.framework !== 'elizaos';
  const [subTab, setSubTab] = useState<SubTab>(hasSkills ? 'skills' : 'plugins');

  // ─── Load plugins data ─────────────────────────────────────

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentPlugins(agent.id);
      if (res.success) {
        setInstalled(res.data.installed);
        setAvailableSkills(res.data.available.skills);
        setAvailablePlugins(res.data.available.plugins);
        setLimits(res.data.limits);
      } else {
        setError(res.error || 'Failed to load plugins');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load plugins');
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  // ─── Load bundled skills ───────────────────────────────────

  const loadBundled = useCallback(async () => {
    if (!agent?.id) return;
    setBundledLoading(true);
    try {
      const res = await api.getAgentSkills(agent.id);
      if (res.success) {
        setBundledSkills(res.data.skills);
      }
    } catch {
      // Silently fail — bundled is supplementary
    } finally {
      setBundledLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    load();
    loadBundled();
  }, [load, loadBundled]);

  // Reset sub-tab when framework changes
  useEffect(() => {
    setSubTab(hasSkills ? 'skills' : 'plugins');
  }, [hasSkills]);

  // ─── Toggle bundled skill ──────────────────────────────────

  const handleToggleBundled = useCallback(async (skillId: string, enabled: boolean) => {
    if (!agent?.id) return;
    setToggling(skillId);
    try {
      const res = await api.toggleAgentSkill(agent.id, skillId, enabled);
      if (res.success) {
        setBundledSkills(prev =>
          prev.map(s => (s.id === skillId ? { ...s, enabled } : s))
        );
        // Auto-restart if agent is running
        if (agent.status === 'active') {
          try {
            await api.restartAgent(agent.id);
            await loadAgent();
            toast.success(`${skillId} ${enabled ? 'enabled' : 'disabled'} — agent restarting`);
          } catch {
            toast('warning', `${skillId} ${enabled ? 'enabled' : 'disabled'} — restart agent to apply`);
          }
        } else {
          toast.success(`${skillId} ${enabled ? 'enabled' : 'disabled'} — start agent to apply`);
        }
      } else {
        toast.error(`Failed to toggle ${skillId}`);
      }
    } catch (e) {
      toast.error((e as Error).message || `Failed to toggle ${skillId}`);
    } finally {
      setToggling(null);
    }
  }, [agent?.id, agent?.status, loadAgent, toast]);

  // ─── Install handler ────────────────────────────────────────

  const handleInstall = useCallback(async (name: string, type: 'skill' | 'plugin', source: string) => {
    if (!agent?.id) return;
    setInstalling(name);
    try {
      const res = await api.installAgentPlugin(agent.id, name, type, source);
      if (res.success) {
        toast(
          res.data.requiresRestart ? 'warning' : 'success',
          res.data.note || `${name} installed successfully`,
        );
        await load();
      } else {
        toast.error(res.error || `Failed to install ${name}`);
      }
    } catch (e) {
      toast.error((e as Error).message || `Failed to install ${name}`);
    } finally {
      setInstalling(null);
    }
  }, [agent?.id, load, toast]);

  // ─── Uninstall handler ──────────────────────────────────────

  const handleUninstall = useCallback(async (name: string) => {
    if (!agent?.id) return;
    setUninstalling(name);
    setConfirmUninstall(null);
    try {
      const res = await api.uninstallAgentPlugin(agent.id, name);
      if (res.success) {
        toast.success(res.data.note || `${name} has been removed.`);
        await load();
      } else {
        toast.error(res.error || `Failed to uninstall ${name}`);
      }
    } catch (e) {
      toast.error((e as Error).message || `Failed to uninstall ${name}`);
    } finally {
      setUninstalling(null);
    }
  }, [agent?.id, load, toast]);

  // ─── Manual install handler ─────────────────────────────────

  const handleManualInstall = useCallback(async () => {
    if (!manualName.trim() || !agent?.id) return;
    const name = manualName.trim();
    const fw = agent.framework ?? 'openclaw';
    // Determine type and source from framework + sub-tab
    let type: 'skill' | 'plugin' = subTab === 'skills' ? 'skill' : 'plugin';
    let source = 'clawhub';
    if (type === 'plugin') {
      if (fw === 'openclaw') source = 'npm';
      else if (fw === 'hermes') source = 'github';
      else source = 'elizaos-registry';
    } else if (fw === 'milady') {
      source = 'milady-skills';
    }
    setManualName('');
    await handleInstall(name, type, source);
  }, [manualName, agent?.id, agent?.framework, subTab, handleInstall]);

  // ─── Filtered available lists ───────────────────────────────

  const installedNames = useMemo(() => new Set(installed.map(i => i.name)), [installed]);

  // Search results: only populated when user is actively searching
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const items = subTab === 'skills' ? availableSkills : availablePlugins;
    const q = search.toLowerCase();
    return items.filter(i =>
      !installedNames.has(i.name) &&
      (i.name.toLowerCase().includes(q) ||
       (i.displayName?.toLowerCase().includes(q) ?? false) ||
       (i.description?.toLowerCase().includes(q) ?? false))
    );
  }, [subTab, availableSkills, availablePlugins, search, installedNames]);

  const installedForSubTab = useMemo(() => {
    return installed.filter(i => i.type === (subTab === 'skills' ? 'skill' : 'plugin'));
  }, [installed, subTab]);

  // ─── Filtered bundled skills ────────────────────────────────

  const filteredBundled = useMemo(() => {
    if (!search.trim()) return bundledSkills;
    const q = search.toLowerCase();
    return bundledSkills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }, [bundledSkills, search]);

  // ─── Recommended items for current framework ───────────────

  const recommendedItems = useMemo(() => {
    const fw = agent?.framework ?? 'openclaw';
    const items = RECOMMENDED[fw] ?? [];
    // Filter by current subTab type
    return items.filter(i => {
      if (subTab === 'skills') return i.type === 'skill';
      return i.type === 'plugin';
    }).filter(i => !installedNames.has(i.name));
  }, [agent?.framework, subTab, installedNames]);

  const bundledEnabledCount = bundledSkills.filter(s => s.enabled).length;

  // ─── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <motion.div key="plugins" variants={tabContentVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </motion.div>
    );
  }

  // ─── Error state ────────────────────────────────────────────

  if (error) {
    return (
      <motion.div key="plugins" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
        <GlassCard className="text-center py-12">
          <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
          <p className="text-[var(--text-secondary)] mb-4">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </GlassCard>
      </motion.div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  const atLimit = limits ? limits.used >= limits.max : false;

  return (
    <motion.div key="plugins" variants={tabContentVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
      {/* Header with limits */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={20} className="text-[var(--color-accent)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Plugins & Skills</h2>
          {limits && (
            <span className={`text-sm px-2.5 py-0.5 rounded-full border ${
              atLimit
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/30'
            }`}>
              {limits.used}/{limits.max} installed
            </span>
          )}
        </div>
        <button
          onClick={() => { load(); loadBundled(); }}
          className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Upgrade banner */}
      {atLimit && limits && (
        <GlassCard className="!p-3 flex items-center gap-3 border-amber-500/20">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-[var(--text-secondary)]">
            You've reached the limit of {limits.max} plugins.{' '}
            <a href="/dashboard/settings/billing" className="text-[var(--color-accent)] hover:underline inline-flex items-center gap-0.5">
              Upgrade <ArrowUpRight size={12} />
            </a>
          </p>
        </GlassCard>
      )}

      {/* Sub-tabs (hide skills tab for ElizaOS) */}
      {hasSkills && (
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/5 w-fit">
          <button
            onClick={() => setSubTab('skills')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              subTab === 'skills'
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={14} />
              Skills
            </span>
          </button>
          <button
            onClick={() => setSubTab('plugins')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              subTab === 'plugins'
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Puzzle size={14} />
              Plugins
            </span>
          </button>
        </div>
      )}

      {/* ─── 1. Bundled Skills Section (only on Skills sub-tab) ──── */}
      {bundledSkills.length > 0 && subTab === 'skills' && (
        <div className="space-y-3">
          <button
            onClick={() => setBundledExpanded(!bundledExpanded)}
            className="flex items-center gap-2.5 w-full group text-left"
          >
            <Sparkles size={16} className="text-emerald-400" />
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider flex-1">
              Bundled
            </h3>
            {bundledEnabledCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                {bundledEnabledCount} active
              </span>
            )}
            <span className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
              {bundledExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {bundledExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden"
              >
                {bundledLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-9 w-9 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                          <Skeleton className="h-6 w-11 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredBundled.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-2">
                    {search.trim() ? `No bundled skills matching "${search}"` : 'No bundled skills found'}
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-2">
                    {filteredBundled.map((skill) => (
                      <div
                        key={skill.id}
                        className={`
                          relative p-4 rounded-xl border transition-all duration-300
                          ${skill.enabled
                            ? 'bg-[var(--color-accent)]/[0.06] border-[var(--color-accent)]/25 shadow-[0_0_20px_rgba(6,182,212,0.06)]'
                            : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--border-hover)]'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0 pt-0.5">
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                              {skill.name}
                            </h4>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                              {skill.description || 'No description available'}
                            </p>
                            {skill.category && (
                              <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-[var(--text-muted)] border border-white/5">
                                {skill.category}
                              </span>
                            )}
                          </div>
                          <div className="flex-shrink-0 pt-0.5">
                            <ToggleSwitch
                              enabled={skill.enabled}
                              loading={toggling === skill.id}
                              onChange={() => handleToggleBundled(skill.id, !skill.enabled)}
                            />
                          </div>
                        </div>
                        {skill.enabled && (
                          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─── 2. Installed Section ───────────────────────────── */}
      {installedForSubTab.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Installed {subTab === 'skills' ? 'Skills' : 'Plugins'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {installedForSubTab.map((item) => (
              <GlassCard key={item.name} className="!p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.displayName || item.name}</p>
                    {item.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  {confirmUninstall === item.name ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleUninstall(item.name)}
                        disabled={uninstalling === item.name}
                        className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {uninstalling === item.name ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmUninstall(null)}
                        className="px-2 py-1 text-xs rounded bg-white/5 text-[var(--text-muted)] hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmUninstall(item.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors shrink-0"
                      title="Uninstall"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeBadge type={item.type} />
                  <SourceBadge source={item.source} />
                  <StatusIndicator status={item.status} error={item.error} />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ─── 3. Available / Recommended Section ─────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Available {subTab === 'skills' ? 'Skills' : 'Plugins'}
          </h3>
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ClawHub ${subTab}...`}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-white/[0.04] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]/40"
            />
          </div>
        </div>

        {search.trim() ? (
          /* Search results from full ClawHub catalog */
          searchResults.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {searchResults.map((item) => (
                <GlassCard key={item.name} className="!p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.displayName || item.name}</p>
                      {item.description && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleInstall(item.name, subTab === 'skills' ? 'skill' : 'plugin', item.source)}
                      disabled={!!installing || atLimit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      title={atLimit ? 'Plugin limit reached' : `Install ${item.name}`}
                    >
                      {installing === item.name ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      Install
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={subTab === 'skills' ? 'skill' : 'plugin'} />
                    <SourceBadge source={item.source} />
                    {item.requiresRestart && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                        <RotateCcw size={10} /> Needs restart
                      </span>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="text-center py-6">
              <p className="text-sm text-[var(--text-muted)]">
                No {subTab} matching &ldquo;{search}&rdquo; &mdash; try installing by name below
              </p>
            </GlassCard>
          )
        ) : recommendedItems.length > 0 ? (
          /* Recommended section — default view when not searching */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-amber-400" />
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Recommended</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {recommendedItems.map((item) => (
                <GlassCard key={item.name} className="!p-4 flex flex-col gap-2 border-amber-500/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.displayName || item.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{item.description}</p>
                    </div>
                    <button
                      onClick={() => handleInstall(item.name, item.type, item.source)}
                      disabled={!!installing || atLimit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      title={atLimit ? 'Plugin limit reached' : `Install ${item.name}`}
                    >
                      {installing === item.name ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      Install
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={item.type} />
                    <SourceBadge source={item.source} />
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        ) : (
          <GlassCard className="text-center py-6">
            <p className="text-sm text-[var(--text-muted)]">
              Search ClawHub or install by name below
            </p>
          </GlassCard>
        )}

        {/* ─── 4. Manual Install Form ───────────────────────── */}
        <GlassCard className="!p-4">
          <p className="text-xs text-[var(--text-muted)] mb-2">
            {agent?.framework === 'openclaw'
              ? `Install by name — paste a ${subTab === 'skills' ? 'skill' : 'plugin'} slug from ClawHub`
              : agent?.framework === 'hermes' && subTab === 'plugins'
                ? 'Install by name — paste a GitHub user/repo'
                : `Install by name — paste a ${subTab === 'skills' ? 'skill' : 'plugin'} name`}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualInstall()}
              placeholder={
                subTab === 'skills'
                  ? 'e.g. hello-world'
                  : agent?.framework === 'hermes'
                    ? 'e.g. 42-evey/hermes-plugins'
                    : agent?.framework === 'openclaw'
                      ? 'e.g. @openclaw/openviking'
                      : 'e.g. @elizaos/plugin-image'
              }
              className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-white/[0.04] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]/40"
            />
            <button
              onClick={handleManualInstall}
              disabled={!manualName.trim() || !!installing || atLimit}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {installing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Install
            </button>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
