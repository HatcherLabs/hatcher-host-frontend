'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Cpu, Clock, Power, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface MiladyStatusData {
  state: string;
  agentName: string;
  model: string;
  uptime: number;
  startup: { phase: string; attempt: number };
  pendingRestart: boolean;
  pendingRestartReasons: string[];
}

// Milady's /api/status returns uptime in MILLISECONDS. Convert here —
// a 3-minute agent was being rendered as "50h 32m" because we were
// treating ms as seconds.
function formatUptime(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * State/readiness strip for Milady agents. Calls
 * `GET /agents/:id/milady/status` every 30s and surfaces:
 *   - Agent name + current runtime state
 *   - Startup phase (when booting)
 *   - Active model + uptime
 *   - Pending-restart banner with reasons when the live config and
 *     persisted config diverge (Milady sets this after a PATCH)
 *
 * The pending-restart banner is the reason this card is Milady-specific
 * — Milady's live /api/config hot-reload flow is the only framework
 * that exposes pendingRestart + reasons. OpenClaw / Hermes don't.
 */
export function MiladyReadinessCard({ agentId }: { agentId: string }) {
  const { agent } = useAgentContext();
  const isActive = agent.status === 'active';
  const [data, setData] = useState<MiladyStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getMiladyStatus(agentId);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load Milady status');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agentId, isActive]);

  useEffect(() => {
    fetchStatus();
    if (!isActive) return;
    intervalRef.current = setInterval(fetchStatus, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus, isActive]);

  useEffect(() => {
    if (!isActive) return;
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchStatus();
        intervalRef.current = setInterval(fetchStatus, 30_000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchStatus, isActive]);

  if (!isActive) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-rose-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Milady Runtime</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Power size={12} />
          Agent is {agent.status}. Start it to see live runtime status.
        </div>
      </GlassCard>
    );
  }

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
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
          <AlertTriangle size={14} className="text-amber-400" />
          Milady status unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  const isRunning = data.state === 'running' || data.state === 'active' || data.state === 'ready';
  const stateStyle = isRunning
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : data.state === 'starting'
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-rose-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Milady Runtime</h3>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchStatus();
          }}
          className="text-[11px] px-2 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={10} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* State */}
        <div className={`rounded-xl px-3 py-2.5 border ${stateStyle}`}>
          <div className="text-sm font-semibold capitalize mb-1">{data.state}</div>
          <div className="text-[10px] opacity-80">Runtime State</div>
        </div>

        {/* Startup phase (only useful when non-idle) */}
        <div className="rounded-xl px-3 py-2.5 border border-[var(--border-default)] bg-[var(--bg-card)]">
          <div className="text-sm font-semibold text-[var(--text-primary)] capitalize mb-1">
            {data.startup.phase || 'ready'}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            Startup Phase
            {data.startup.attempt > 1 ? ` (try ${data.startup.attempt})` : ''}
          </div>
        </div>

        {/* Model */}
        <div className="rounded-xl px-3 py-2.5 border border-[var(--border-default)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-1.5">
            <Cpu size={12} className="text-rose-400" />
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate" title={data.model}>
              {data.model || '—'}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Active Model</div>
        </div>

        {/* Uptime */}
        <div className="rounded-xl px-3 py-2.5 border border-[var(--border-default)] bg-blue-500/10">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-blue-400" />
            <span className="text-sm font-semibold text-blue-400 tabular-nums">
              {formatUptime(data.uptime)}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Uptime</div>
        </div>
      </div>

      {/* Pending-restart banner */}
      {data.pendingRestart && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-amber-400 mb-1">
                Restart required to apply config changes
              </div>
              {data.pendingRestartReasons.length > 0 && (
                <ul className="text-[11px] text-[var(--text-secondary)] space-y-0.5">
                  {data.pendingRestartReasons.slice(0, 4).map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
