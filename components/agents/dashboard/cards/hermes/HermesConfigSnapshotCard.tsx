'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Sliders } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

/**
 * Walk a dot-path into a record, returning undefined if any segment
 * is missing or not an object. Handles the nested shape returned by
 * `getHermesConfig`.
 */
function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.length > 0 ? v : '—';
  return JSON.stringify(v);
}

// The seven config keys the PATCH allowlist accepts (same ones the
// existing ConfigTab PATCH UI touches). See
// apps/api/src/services/container-lifecycle/hermes-config-snapshot.ts.
const CONFIG_KEYS: Array<{ path: string; label: string; color: string }> = [
  { path: 'model.default', label: 'Model', color: 'text-purple-400' },
  { path: 'agent.max_turns', label: 'Max Turns', color: 'text-blue-400' },
  { path: 'agent.reasoning_effort', label: 'Reasoning Effort', color: 'text-emerald-400' },
  { path: 'compression.threshold', label: 'Compression Threshold', color: 'text-amber-400' },
  { path: 'memory.memory_enabled', label: 'Memory', color: 'text-rose-400' },
  { path: 'streaming.enabled', label: 'Streaming', color: 'text-cyan-400' },
  { path: 'display.personality', label: 'Personality', color: 'text-indigo-400' },
];

/**
 * Hermes live config snapshot card — read-only view of the 7 keys
 * the Hatcher config UI can PATCH. If a user needs to change one,
 * they click "Edit" to jump to the Config tab. Reading is free;
 * writing requires going through the allowlist-enforced PATCH route.
 *
 * Only rendered for managed-mode Hermes agents. Legacy agents hit
 * AgentNotRunningError (409) on this endpoint and the card surfaces
 * a friendly "not available" notice.
 */
export function HermesConfigSnapshotCard() {
  const { agent, setTab } = useAgentContext();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.getHermesConfig(agent.id);
      if (res.success) {
        setConfig(res.data.config);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load config');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (loading && !config) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error || !config) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Live config unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Live Config</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            read-only
          </span>
        </div>
        <button
          onClick={() => setTab('config')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CONFIG_KEYS.map(({ path, label, color }) => {
          const value = getPath(config, path);
          return (
            <div
              key={path}
              className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]"
              title={path}
            >
              <div className={`text-sm font-semibold truncate ${color}`}>{formatValue(value)}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
