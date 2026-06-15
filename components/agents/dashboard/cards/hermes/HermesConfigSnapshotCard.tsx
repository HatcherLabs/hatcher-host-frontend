'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Sliders } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';
import { timeAgo } from '@/lib/utils';

interface HermesConfigSnapshot {
  source: 'live' | 'snapshot' | 'none';
  config: Record<string, unknown> | null;
  snapshotAt: string | null;
  liveReadError?: string;
}

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
  if (typeof v === 'string') {
    if (!v) return '—';
    if (v === 'hatcher') return 'Hatcher Hosted';
    return v;
  }
  return JSON.stringify(v);
}

// Runtime config keys worth surfacing on the overview. See
// apps/api/src/services/container-lifecycle/hermes-config-snapshot.ts.
const CONFIG_KEYS: Array<{ path: string; label: string; color: string }> = [
  { path: 'model.default', label: 'Model', color: 'text-[var(--text-primary)]' },
  { path: 'model.provider', label: 'Provider', color: 'text-[var(--text-primary)]' },
  { path: 'agent.max_turns', label: 'Max Turns', color: 'text-[var(--mineral)]' },
  { path: 'agent.reasoning_effort', label: 'Reasoning Effort', color: 'text-[var(--text-muted)]' },
  { path: 'compression.threshold', label: 'Compression Threshold', color: 'text-[var(--accent)]' },
  { path: 'memory.memory_enabled', label: 'Memory', color: 'text-[var(--danger)]' },
  { path: 'streaming.enabled', label: 'Streaming', color: 'text-[var(--mineral)]' },
];

/**
 * Hermes config snapshot card — read-only view of the core runtime keys.
 * The API returns live config when the
 * container is running, otherwise the last DB snapshot when available.
 */
export function HermesConfigSnapshotCard() {
  const { agent, setTab } = useAgentContext();
  const [data, setData] = useState<HermesConfigSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getHermesConfig(agent.id);
      if (res.success) {
        setData({
          source: res.data.source,
          config: res.data.config,
          snapshotAt: res.data.snapshotAt ?? null,
          liveReadError: res.data.liveReadError,
        });
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

  if (loading && !data) {
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

  if (error || !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-[var(--color-warning)]" />
          Live config unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  const snapshotRelative =
    data.source === 'snapshot' && data.snapshotAt
      ? timeAgo(data.snapshotAt, { switchToDateAfterDays: 7, dateFormat: 'short-month' })
      : null;

  if (!data.config) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Sliders size={14} className="text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Config</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)]">
            {data.source === 'live' ? 'live' : data.source === 'snapshot' ? 'snapshot' : 'n/a'}
          </span>
        </div>
        <div className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
          <AlertTriangle size={12} className="text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
          <span>
            {data.liveReadError
              ? `Live config unavailable: ${data.liveReadError}`
              : 'No config snapshot available yet. Start the agent once to capture config.yaml.'}
          </span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Config</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(74,119,139,0.08)] text-[var(--accent)] border border-[rgba(74,119,139,0.22)]">
            read-only
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)]">
            {data.source === 'live' ? 'live' : data.source === 'snapshot' ? 'snapshot' : 'n/a'}
          </span>
          {snapshotRelative && (
            <span className="text-[10px] text-[var(--text-muted)]" title={data.snapshotAt ?? undefined}>
              · {snapshotRelative}
            </span>
          )}
        </div>
        <button
          onClick={() => setTab('config')}
          className="text-[11px] px-3 py-1 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--tech-accent-soft)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CONFIG_KEYS.map(({ path, label, color }) => {
          const value = getPath(data.config, path);
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
