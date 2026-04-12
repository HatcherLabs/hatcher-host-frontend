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
  type: 'skill' | 'plugin';
  source: string;
  description: string | null;
  status: 'installed' | 'pending_restart' | 'failed';
  error?: string;
  requiresRestart?: boolean;
}

interface AvailableItem {
  name: string;
  description: string | null;
  source: string;
  requiresRestart?: boolean;
}

interface PluginLimits {
  installed: number;
  max: number;
  tierName: string;
}

type SubTab = 'skills' | 'plugins';

// ─── Helpers ─────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  clawhub:          { bg: 'bg-amber-500/10', text: 'text-amber-400' },
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
  if (status === 'pending_restart') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Restart Required
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

// ─── Main Component ──────────────────────────────────────────

export function PluginsTab() {
  const { agent } = useAgentContext();
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

  // ElizaOS has no skills concept in v1.7.x
  const hasSkills = agent?.framework !== 'elizaos';
  const [subTab, setSubTab] = useState<SubTab>(hasSkills ? 'skills' : 'plugins');

  // ─── Load data ──────────────────────────────────────────────

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

  useEffect(() => {
    load();
  }, [load]);

  // Reset sub-tab when framework changes
  useEffect(() => {
    setSubTab(hasSkills ? 'skills' : 'plugins');
  }, [hasSkills]);

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
      if (fw === 'openclaw') source = 'clawhub-plugin';
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

  const filteredAvailable = useMemo(() => {
    const items = subTab === 'skills' ? availableSkills : availablePlugins;
    if (!search.trim()) return items.filter(i => !installedNames.has(i.name));
    const q = search.toLowerCase();
    return items.filter(i =>
      !installedNames.has(i.name) &&
      (i.name.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q) ?? false))
    );
  }, [subTab, availableSkills, availablePlugins, search, installedNames]);

  const installedForSubTab = useMemo(() => {
    return installed.filter(i => i.type === (subTab === 'skills' ? 'skill' : 'plugin'));
  }, [installed, subTab]);

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

  const atLimit = limits ? limits.installed >= limits.max : false;

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
              {limits.installed}/{limits.max} installed
            </span>
          )}
        </div>
        <button
          onClick={load}
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
            You've reached the {limits.tierName} limit of {limits.max} plugins.{' '}
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

      {/* Installed section */}
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
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
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

      {/* Available section */}
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
              placeholder={`Search ${subTab}...`}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-white/[0.04] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]/40"
            />
          </div>
        </div>

        {/* Manual install form */}
        <GlassCard className="!p-4">
          <p className="text-xs text-[var(--text-muted)] mb-2">
            Install by name — paste a {subTab === 'skills' ? 'skill' : 'plugin'} name
            {agent?.framework === 'openclaw' && subTab === 'plugins' ? ' from ClawHub' : ''}
            {agent?.framework === 'hermes' && subTab === 'plugins' ? ' (user/repo from GitHub)' : ''}
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
                      ? 'e.g. oh-my-browser'
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

        {filteredAvailable.length === 0 ? (
          <GlassCard className="text-center py-6">
            <p className="text-sm text-[var(--text-muted)]">
              {search.trim()
                ? `No ${subTab} matching "${search}"`
                : `Browse available ${subTab} above or install by name`}
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredAvailable.map((item) => (
              <GlassCard key={item.name} className="!p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
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
        )}
      </div>
    </motion.div>
  );
}
