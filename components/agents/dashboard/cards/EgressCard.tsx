'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Globe2, Network, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { AgentEgressEventsResponse } from '@/lib/api';
import { GlassCard, Skeleton } from '../../AgentContext';

function timeAgo(timestamp: string): string {
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function EgressCard({ agentId }: { agentId: string }) {
  const [data, setData] = useState<AgentEgressEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    const res = await api.getAgentEgressEvents(agentId, 30);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error ?? 'Could not load egress events');
    }
    setLoading(false);
    setRefreshing(false);
  }, [agentId]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const recentEvents = useMemo(() => data?.events.slice(0, 6) ?? [], [data]);
  const hosts = data?.summary.hosts.slice(0, 5) ?? [];

  return (
    <GlassCard className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <Network size={14} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Web Access</h3>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-white/10 px-2.5 py-1 text-[11px] text-[var(--text-muted)] transition-colors hover:border-[var(--color-accent)]/30 hover:text-[var(--text-secondary)] disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                <CheckCircle2 size={12} className="text-emerald-400" />
                Allowed
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {data?.summary.allowed ?? 0}
              </div>
            </div>
            <div className="rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                <AlertTriangle size={12} className="text-amber-400" />
                Blocked
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {data?.summary.blocked ?? 0}
              </div>
            </div>
            <div className="rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                <Globe2 size={12} className="text-sky-400" />
                Hosts
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {data?.summary.hosts.length ?? 0}
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-[3px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          ) : null}

          {hosts.length > 0 ? (
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Top hosts
              </div>
              <div className="space-y-1.5">
                {hosts.map((host) => (
                  <div key={host.host} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-mono text-[var(--text-secondary)]">{host.host}</span>
                    <span className="shrink-0 text-[var(--text-muted)]">
                      <span className="text-emerald-400">{host.allowed}</span> / {host.blocked} blocked
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Recent decisions
            </div>
            {recentEvents.length > 0 ? (
              <div className="space-y-1.5">
                {recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[var(--text-secondary)]">
                        {event.host}:{event.port}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {timeAgo(event.timestamp)} · {event.reason ?? 'public_https'}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      event.allowed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {event.allowed ? 'Allowed' : 'Blocked'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No web access decisions recorded yet.</p>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
