'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, RotateCcw, Info, Search, Check, Key, ChevronDown, ChevronRight, X, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

interface MiladyPlugin {
  id: string;
  name: string;
  description: string;
  tags: string[];
  enabled: boolean;
  configured: boolean;
  envKey: string | null;
  category: string;
}

const PRIMARY_CATEGORIES = ['connector', 'feature', 'ai-provider', 'app'] as const;
const SECONDARY_CATEGORIES = ['streaming', 'database'] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  connector: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
  feature: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' },
  'ai-provider': { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
  app: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30' },
  streaming: { bg: 'bg-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/30' },
  database: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

type StatusFilter = 'all' | 'enabled' | 'configured' | 'needs-key';

export function MiladyPluginsTab() {
  const { agent } = useAgentContext();
  const { toast } = useToast();
  const [plugins, setPlugins] = useState<MiladyPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(true);
  // M5: smart enable flow — modal for plugins that need env keys
  const [modalPlugin, setModalPlugin] = useState<MiladyPlugin | null>(null);
  const [modalValue, setModalValue] = useState('');
  const [modalShowValue, setModalShowValue] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMiladyPlugins(agent.id);
      if (res.success) {
        setPlugins(res.data.plugins);
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

  // Close the modal and clear state when the agent changes — otherwise the
  // modal persists with stale data and saveEnvKey would target the wrong agent.
  useEffect(() => {
    setModalPlugin(null);
    setModalValue('');
    setModalShowValue(false);
    setModalSaving(false);
  }, [agent?.id]);

  const filtered = useMemo(() => {
    let out = plugins;
    if (statusFilter === 'enabled') out = out.filter((p) => p.enabled);
    else if (statusFilter === 'configured') out = out.filter((p) => p.configured && !p.enabled);
    else if (statusFilter === 'needs-key') out = out.filter((p) => !p.configured && p.envKey);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    return out;
  }, [plugins, search, statusFilter]);

  const byCategory = useMemo(() => {
    const groups: Record<string, MiladyPlugin[]> = {};
    for (const p of filtered) {
      (groups[p.category] ??= []).push(p);
    }
    return groups;
  }, [filtered]);

  const counts = useMemo(() => {
    return {
      total: plugins.length,
      enabled: plugins.filter((p) => p.enabled).length,
      configured: plugins.filter((p) => p.configured && !p.enabled).length,
      needsKey: plugins.filter((p) => !p.configured && p.envKey).length,
    };
  }, [plugins]);

  const openEnvModal = (plugin: MiladyPlugin) => {
    setModalPlugin(plugin);
    setModalValue('');
    setModalShowValue(false);
  };

  const closeEnvModal = () => {
    if (modalSaving) return;
    setModalPlugin(null);
    setModalValue('');
  };

  const saveEnvKey = async () => {
    if (!agent?.id || !modalPlugin?.envKey || !modalValue.trim()) return;
    setModalSaving(true);
    try {
      // Persist the env var into agent.configJson via the standard updateAgent
      // endpoint. crud.ts PATCH handler will trigger an automatic container
      // restart because `config` changed (see crud.ts:626), so we don't need
      // to call hot-reload here — it would race with the async restart.
      await api.updateAgent(agent.id, {
        config: { [modalPlugin.envKey]: modalValue.trim() },
      } as Parameters<typeof api.updateAgent>[1]);
      toast.success(
        `${modalPlugin.envKey} saved — ${modalPlugin.id} will activate after the restart completes`,
      );
      closeEnvModal();
      // Refresh the plugin list after a short delay
      setTimeout(() => load(), 1000);
    } catch (e) {
      toast.error(`Failed to save: ${(e as Error).message}`);
    } finally {
      setModalSaving(false);
    }
  };

  const renderPlugin = (p: MiladyPlugin) => {
    const colors = CATEGORY_COLORS[p.category] ?? {
      bg: 'bg-slate-500/10',
      text: 'text-slate-300',
      border: 'border-slate-500/30',
    };
    const clickable = !p.configured && Boolean(p.envKey);
    return (
      <GlassCard
        key={p.id}
        className={`!p-4 ${clickable ? 'cursor-pointer hover:border-rose-500/40 transition-all' : ''}`}
      >
        <div
          className="flex items-start gap-3"
          onClick={clickable ? () => openEnvModal(p) : undefined}
          onKeyDown={
            clickable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEnvModal(p);
                  }
                }
              : undefined
          }
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
        >
          <div className="shrink-0 mt-0.5">
            {p.enabled ? (
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Check size={12} className="text-emerald-300" />
              </div>
            ) : p.configured ? (
              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40" title="Configured but disabled" />
            ) : p.envKey ? (
              <div className="w-6 h-6 rounded-full bg-slate-500/20 border border-slate-500/40 flex items-center justify-center" title={`Click to set ${p.envKey}`}>
                <Key size={10} className="text-slate-400" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border border-[var(--border-default)]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white">{p.id}</p>
              <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                {p.category}
              </span>
              {!p.configured && p.envKey && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 font-mono">
                  Click to set {p.envKey}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{p.description}</p>
          </div>
        </div>
      </GlassCard>
    );
  };

  return (
    <motion.div
      key="tab-plugins-milady"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Puzzle size={16} className="text-rose-400" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Milady Plugins</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all flex items-center gap-1.5"
        >
          <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 flex items-start gap-3">
        <Info size={16} className="text-rose-400/70 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed text-rose-400">
          Milady ships with 100+ plugins organized by category. Plugins that need an API key show the required env var — set it in the Env Vars tab and the plugin will become configured automatically.
        </p>
      </div>

      {!loading && !error && plugins.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                statusFilter === 'all'
                  ? 'border-rose-500/40 bg-rose-500/10'
                  : 'border-[var(--border-default)] hover:border-rose-500/30'
              }`}
            >
              <p className="text-[10px] uppercase text-[var(--text-muted)]">Total</p>
              <p className="text-lg font-bold text-white">{counts.total}</p>
            </button>
            <button
              onClick={() => setStatusFilter('enabled')}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                statusFilter === 'enabled'
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-[var(--border-default)] hover:border-emerald-500/30'
              }`}
            >
              <p className="text-[10px] uppercase text-[var(--text-muted)]">Enabled</p>
              <p className="text-lg font-bold text-emerald-300">{counts.enabled}</p>
            </button>
            <button
              onClick={() => setStatusFilter('configured')}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                statusFilter === 'configured'
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-[var(--border-default)] hover:border-amber-500/30'
              }`}
            >
              <p className="text-[10px] uppercase text-[var(--text-muted)]">Ready</p>
              <p className="text-lg font-bold text-amber-300">{counts.configured}</p>
            </button>
            <button
              onClick={() => setStatusFilter('needs-key')}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                statusFilter === 'needs-key'
                  ? 'border-slate-500/40 bg-slate-500/10'
                  : 'border-[var(--border-default)] hover:border-slate-500/30'
              }`}
            >
              <p className="text-[10px] uppercase text-[var(--text-muted)]">Needs key</p>
              <p className="text-lg font-bold text-slate-300">{counts.needsKey}</p>
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plugins..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
        </>
      )}

      {loading ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : error ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Puzzle size={24} className="text-red-400/50" />
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-[var(--text-muted)]">Is the agent running?</p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* Primary categories */}
          {PRIMARY_CATEGORIES.map((cat) => {
            const items = byCategory[cat] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] px-1">
                  {cat} <span className="text-[var(--text-muted)]">({items.length})</span>
                </h3>
                <div className="space-y-2">{items.map(renderPlugin)}</div>
              </div>
            );
          })}

          {/* Secondary categories (collapsible) */}
          {SECONDARY_CATEGORIES.some((c) => (byCategory[c]?.length ?? 0) > 0) && (
            <div className="space-y-2">
              <button
                onClick={() => setSecondaryCollapsed(!secondaryCollapsed)}
                className="flex items-center gap-1 text-xs uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all"
              >
                {secondaryCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                Advanced (streaming / database)
              </button>
              {!secondaryCollapsed &&
                SECONDARY_CATEGORIES.map((cat) => {
                  const items = byCategory[cat] ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-2 ml-4">
                      <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] px-1">
                        {cat} ({items.length})
                      </h3>
                      <div className="space-y-2">{items.map(renderPlugin)}</div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* M5: Smart plugin enable modal */}
      <AnimatePresence>
        {modalPlugin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={closeEnvModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl border border-rose-500/30 bg-[var(--bg-card)] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Enable {modalPlugin.id}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{modalPlugin.description}</p>
                </div>
                <button
                  onClick={closeEnvModal}
                  disabled={modalSaving}
                  className="text-[var(--text-muted)] hover:text-white transition-colors shrink-0 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                    <span className="font-mono text-rose-300">{modalPlugin.envKey}</span>
                  </label>
                  <div className="relative">
                    <input
                      type={modalShowValue ? 'text' : 'password'}
                      value={modalValue}
                      onChange={(e) => setModalValue(e.target.value)}
                      placeholder={`Paste your ${modalPlugin.envKey} here`}
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--border-default)] bg-black/30 text-sm text-white placeholder:text-[var(--text-muted)] outline-none focus:border-rose-500/40"
                      autoFocus
                      disabled={modalSaving}
                    />
                    <button
                      type="button"
                      onClick={() => setModalShowValue(!modalShowValue)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
                    >
                      {modalShowValue ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  The value is saved to your agent&apos;s encrypted config and will be available to the plugin on the next restart. Click Restart in the banner above when ready.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  onClick={closeEnvModal}
                  disabled={modalSaving}
                  className="text-xs px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEnvKey}
                  disabled={modalSaving || !modalValue.trim()}
                  className="text-xs px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 transition-all disabled:opacity-50"
                >
                  {modalSaving ? 'Saving...' : 'Save & Apply'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
