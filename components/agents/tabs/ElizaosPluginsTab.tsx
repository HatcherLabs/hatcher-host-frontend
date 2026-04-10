'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Puzzle, RotateCcw, Info, Check, AlertCircle, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';

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
    // M-3 fix: for stopped agents the live /elizaos/agent call returns 503.
    // Fall back to the plugin list in agent.configJson so the user can still
    // edit (changes will apply on next start). The DB is the source of truth
    // for "what the next start will use" anyway.
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
        // H-3 fix: only claim "applied live" when the backend confirms
        // the PATCH reached the running container. Otherwise say "saved"
        // and hint at a restart.
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
    </motion.div>
  );
}
