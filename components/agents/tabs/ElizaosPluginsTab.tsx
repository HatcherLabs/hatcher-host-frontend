'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Puzzle, RotateCcw, Info, Check, AlertCircle, Lock, Star, Search, ExternalLink, Library } from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';

interface RegistryEntry {
  name: string;
  gitRepo: string | null;
  description: string | null;
  homepage: string | null;
  topics: string[];
  stars: number;
  language: string | null;
  hasNpm: boolean;
  installed: boolean;
  installable: boolean;
}

const CORE_PLUGINS = new Set(['@elizaos/plugin-sql', '@elizaos/plugin-bootstrap']);

const PLUGIN_META: Record<string, { label: string; description: string; category: string }> = {
  '@elizaos/plugin-openai': { label: 'OpenAI', description: 'OpenAI / LLM proxy / Groq / xAI / OpenRouter — OpenAI-compatible providers', category: 'Models' },
  '@elizaos/plugin-anthropic': { label: 'Anthropic', description: 'Claude models via the Anthropic API', category: 'Models' },
  '@elizaos/plugin-groq': { label: 'Groq', description: 'Ultra-fast inference on Groq LPU hardware', category: 'Models' },
  '@elizaos/plugin-ollama': { label: 'Ollama', description: 'Run local LLMs via Ollama for BYOK users', category: 'Models' },
  '@elizaos/plugin-discord': { label: 'Discord', description: 'Listen and respond on Discord servers', category: 'Integrations' },
  '@elizaos/plugin-telegram': { label: 'Telegram', description: 'Telegram bot integration', category: 'Integrations' },
  '@elizaos/plugin-web-search': { label: 'Web Search', description: 'Tavily-backed web search (routed through Hatcher LLM proxy by default)', category: 'Tools' },
  '@elizaos/plugin-solana': { label: 'Solana', description: 'On-chain Solana interactions — wallet, balance, transfer', category: 'Blockchain' },
};

const ALL_BUNDLED_PLUGINS = Object.keys(PLUGIN_META);

export function ElizaosPluginsTab() {
  const { agent } = useAgentContext();
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [source, setSource] = useState<'live' | 'saved' | null>(null);

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    // For stopped agents, the live /elizaos/agent call returns 503. Fall back
    // to agent.configJson — the DB is the source of truth for the next start.
    if (agent.status !== 'active') {
      const config = (agent.config ?? {}) as Record<string, unknown>;
      const dbPlugins = Array.isArray(config['plugins'])
        ? (config['plugins'] as string[])
        : [];
      setEnabled(new Set(dbPlugins));
      setSource('saved');
      setLoading(false);
      return;
    }
    try {
      const res = await api.getElizaosAgent(agent.id);
      if (res.success) {
        setEnabled(new Set(res.data.plugins));
        setSource('live');
      } else {
        setError(res.error || 'Failed to load plugins');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load plugins');
    } finally {
      setLoading(false);
    }
  }, [agent?.id, agent?.status, agent?.config]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (pluginId: string) => {
    if (CORE_PLUGINS.has(pluginId)) return; // locked
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(pluginId)) next.delete(pluginId);
      else next.add(pluginId);
      return next;
    });
  };

  const save = async () => {
    if (!agent?.id) return;
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      // Send only non-core (backend adds core back)
      const toSend = Array.from(enabled).filter((p) => !CORE_PLUGINS.has(p));
      const res = await api.setElizaosPlugins(agent.id, toSend);
      if (res.success) {
        setEnabled(new Set(res.data.plugins));
        // Only claim "applied live" when the backend confirms the PATCH
        // reached the running container — otherwise say "saved" + restart hint.
        if (res.data.liveApplied) {
          setSaveMsg('Plugins updated — changes applied live to the running agent');
        } else {
          setSaveMsg('Plugins saved — restart the agent to apply (live update was skipped)');
        }
        setTimeout(() => setSaveMsg(null), 5000);
      } else {
        setError(res.error || 'Failed to save plugin list');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to save plugin list');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      key="tab-plugins-elizaos"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Puzzle size={16} className="text-cyan-400" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Plugins</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading || saving}
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all flex items-center gap-1.5"
          >
            <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={save}
            disabled={loading || saving}
            className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-3 flex items-start gap-3">
        <Info size={16} className="text-cyan-400/70 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed text-cyan-400">
          ElizaOS loads plugins from this list on startup. Changes apply live to the running container (no restart needed). Core plugins (plugin-sql, plugin-bootstrap) are always on and can&apos;t be toggled off.
        </p>
      </div>

      {source === 'saved' && !loading && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 flex items-start gap-3">
          <Info size={16} className="text-amber-400/80 mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed text-amber-300">
            Agent is stopped — showing the last saved plugin list from the database. Start the agent to see the live state. Changes you save here will apply on the next start.
          </p>
        </div>
      )}

      {saveMsg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <p className="text-xs text-emerald-300">{saveMsg}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {/* Core plugins — locked */}
          {Array.from(CORE_PLUGINS).map((pluginId) => (
            <GlassCard key={pluginId} className="!p-4 opacity-80">
              <div className="flex items-center gap-3">
                <Lock size={14} className="text-[var(--text-muted)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{pluginId.replace('@elizaos/plugin-', '')}</p>
                  <p className="text-xs text-[var(--text-muted)]">Core plugin — always enabled</p>
                </div>
              </div>
            </GlassCard>
          ))}

          {/* Bundled toggleable plugins */}
          {ALL_BUNDLED_PLUGINS.map((pluginId) => {
            const meta = PLUGIN_META[pluginId]!;
            const isEnabled = enabled.has(pluginId);
            return (
              <GlassCard key={pluginId} className="!p-4">
                <button
                  onClick={() => toggle(pluginId)}
                  className="flex items-center gap-3 w-full text-left"
                  disabled={saving}
                >
                  <div
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
                      isEnabled ? 'bg-cyan-500' : 'bg-[var(--border-default)]'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{meta.label}</p>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                        {meta.category}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{meta.description}</p>
                  </div>
                </button>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Plugins that are enabled but we don't have metadata for — probably
          user-installed via CLI, or future bundled plugins */}
      {!loading && !error && (
        (() => {
          const unknown = Array.from(enabled).filter(
            (p) => !CORE_PLUGINS.has(p) && !(p in PLUGIN_META),
          );
          if (unknown.length === 0) return null;
          return (
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Additional plugins (unknown):</p>
              {unknown.map((p) => (
                <GlassCard key={p} className="!p-3">
                  <p className="text-xs font-mono text-[var(--text-secondary)]">{p}</p>
                </GlassCard>
              ))}
            </div>
          );
        })()
      )}

      {/* ─── Raw character JSON viewer (power users) ─── */}
      <ElizaosRawCharacterViewer agentId={agent?.id ?? ''} />

      {/* ─── Community plugin browser ─── */}
      <ElizaosRegistryBrowser agentId={agent?.id ?? ''} />
    </motion.div>
  );
}

/**
 * Read-only raw character JSON viewer. Fetches the live character
 * via /elizaos/agent and shows it as formatted JSON inside a
 * collapsible card. `settings.secrets.*` is already redacted
 * server-side. Useful for debugging config drift: what did Hatcher
 * persist vs what did elizaos actually load?
 *
 * Why not a full editor: free-form JSON editing would need a JSON
 * validator + schema check against ElizaOS's Character type + a
 * safe hot-reload path. The existing Config + Plugins tabs cover
 * the editable fields; this view is for inspection only.
 */
function ElizaosRawCharacterViewer({ agentId }: { agentId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getElizaosAgent(agentId);
      if (res.success) {
        setCharacter(res.data as unknown as Record<string, unknown>);
      } else {
        setError('error' in res ? res.error : 'Failed to load character');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Lazy-load on first expansion so we don't pay the API cost for
  // users who never open the viewer.
  useEffect(() => {
    if (expanded && !character && !loading) {
      void load();
    }
  }, [expanded, character, loading, load]);

  return (
    <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Library size={16} className="text-cyan-400" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Raw character JSON
          </span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all"
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] px-4 py-3 flex items-start gap-3 mb-3">
          <Info size={14} className="text-cyan-400/70 mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed text-cyan-400/90">
            Live character from the running container. Secrets
            (settings.secrets.*) are already redacted server-side. For
            debugging — edit config via the tabs above, not this view.
          </p>
        </div>
      )}

      {expanded && loading && (
        <GlassCard>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
            <RotateCcw size={12} className="animate-spin text-cyan-400" />
            Loading character…
          </div>
        </GlassCard>
      )}

      {expanded && error && (
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={14} />
            {error}
          </div>
        </GlassCard>
      )}

      {expanded && character && !loading && !error && (
        <GlassCard className="!p-0 overflow-hidden">
          <pre className="text-[11px] font-mono text-[var(--text-secondary)] p-4 overflow-auto max-h-[500px] whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(character, null, 2)}
          </pre>
        </GlassCard>
      )}
    </div>
  );
}

/**
 * Community plugin registry browser. Read-only discovery view sourced
 * from github.com/elizaos-plugins/registry (the v1-compatible subset).
 *
 * Phase 6 scope: browse, search, filter by topic, see "installed" status,
 * link out to the GitHub repo. NO install button — installing from the
 * registry is a follow-up flow that needs per-tier gating + confirmation
 * UX + sandboxing since `npm install <git-url>` runs arbitrary postinstall
 * scripts. See apps/api/docs/research/elizaos-reference.md section 10.
 */
function ElizaosRegistryBrowser({ agentId }: { agentId: string }) {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getElizaosRegistry(agentId);
      if (res.success) {
        setEntries(res.data.entries);
        setFetchedAt(res.data.fetchedAt);
      } else {
        setError(res.error || 'Failed to load registry');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load registry');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  // Top 10 topics by frequency — used for filter chips
  const topTopics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.topics) {
        // Ignore noisy meta-topics that every plugin has
        if (t === 'elizaos' || t === 'elizaos-plugin' || t === 'elizaos-plugins') continue;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = entries;
    if (topicFilter) {
      list = list.filter((e) => e.topics.includes(topicFilter));
    }
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q) ||
          e.topics.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [entries, query, topicFilter]);

  // Show first 20 by default — the list is long and most users just want
  // to browse the top-starred plugins. "Show all" reveals the rest.
  const visible = showAll ? filtered : filtered.slice(0, 20);

  return (
    <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Library size={16} className="text-cyan-400" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Community plugin registry
          </span>
          {entries.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
              {filtered.length}{filtered.length !== entries.length ? ` / ${entries.length}` : ''}
            </span>
          )}
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

      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] px-4 py-3 flex items-start gap-3 mb-4">
        <Info size={14} className="text-cyan-400/70 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed text-cyan-400/90">
          Read-only browser from github.com/elizaos-plugins/registry — shows
          every v1-compatible community plugin. One-click install isn&apos;t
          available yet (needs per-tier gating + sandbox); use &quot;View on
          GitHub&quot; to read the source and check compatibility before
          requesting it.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plugins by name, description, or topic…"
          className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-cyan-500/40"
        />
      </div>

      {/* Topic filter chips */}
      {topTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setTopicFilter(null)}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              topicFilter === null
                ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            All
          </button>
          {topTopics.map((t) => (
            <button
              key={t.name}
              onClick={() => setTopicFilter(topicFilter === t.name ? null : t.name)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                topicFilter === t.name
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                  : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t.name} <span className="opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-2 mb-4">
          <AlertCircle size={14} className="text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <GlassCard>
          <p className="text-xs text-[var(--text-muted)] text-center py-4">
            No plugins match &quot;{query}&quot;
            {topicFilter ? ` in topic "${topicFilter}"` : ''}.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {visible.map((entry) => (
            <GlassCard key={entry.name} className="!p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">
                      {entry.name}
                    </p>
                    {entry.installed && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                        installed
                      </span>
                    )}
                    {entry.installable ? (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                        title="Baked into the ElizaOS image — safe to enable from the plugins tab above"
                      >
                        bundled
                      </span>
                    ) : (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/[0.07] text-amber-300/80"
                        title="Not baked into the image. Enabling from the tab above is rejected until we rebuild the image with this package."
                      >
                        image rebuild required
                      </span>
                    )}
                    {entry.hasNpm && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-muted)]">
                        npm
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                      <Star size={10} />
                      {entry.stars}
                    </div>
                  </div>
                  {entry.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                      {entry.description}
                    </p>
                  )}
                  {entry.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {entry.topics.slice(0, 5).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] px-1.5 py-0.5 rounded-full border border-[var(--border-default)]/50 text-[var(--text-muted)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {entry.gitRepo && (
                  <a
                    href={`https://github.com/${entry.gitRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${entry.name} on GitHub`}
                    className="text-xs px-2 py-1 rounded border border-[var(--border-default)] text-[var(--text-muted)] hover:text-cyan-400 hover:border-cyan-500/40 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink size={11} />
                    GitHub
                  </a>
                )}
              </div>
            </GlassCard>
          ))}
          {!showAll && filtered.length > 20 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-xs py-2.5 rounded-lg border border-dashed border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-cyan-500/30 transition-colors"
            >
              Show {filtered.length - 20} more
            </button>
          )}
        </div>
      )}

      {fetchedAt && !loading && (
        <p className="text-[10px] text-[var(--text-muted)] mt-3 text-center">
          Registry cached {Math.floor((Date.now() - fetchedAt) / 1000 / 60)} min ago
        </p>
      )}
    </div>
  );
}
