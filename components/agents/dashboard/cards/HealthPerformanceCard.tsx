'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart,
  AlertTriangle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ResourceChart, ResourceAlertBadge } from '@/components/agents/ResourceChart';
import { GlassCard, Skeleton } from '../../AgentContext';
import { ResourceBar } from '../primitives/ResourceBar';

/**
 * Shape of `/agents/:id/monitoring` — container health, resource usage,
 * recent response times, error count, and a short history buffer for the
 * sparkline.
 */
export interface MonitoringData {
  health: 'healthy' | 'unhealthy' | 'stopped';
  uptime: { seconds: number; since: string | null };
  restarts: number;
  resources: { cpuPercent: number; memoryUsageMb: number; memoryLimitMb: number };
  responseTimes: { avg: number; p95: number; last: number };
  errors: { last24h: number; lastError: string | null };
  history: Array<{ ts: number; cpu: number; mem: number }>;
}

/**
 * Dashboard health & performance card. Polls `/agents/:id/monitoring`
 * every 30s when the tab is visible, pauses on document.hidden, and
 * renders a compact status strip + resource bars + sparkline chart.
 *
 * Extracted verbatim from the legacy OverviewTab.tsx during the Etapa 1
 * dashboard refactor — kept identical so GenericDashboard still renders
 * the same content and per-framework dashboards can drop the card in.
 */
export function HealthPerformanceCard({
  agentId,
  isActive,
}: {
  agentId: string;
  isActive: boolean;
}) {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMonitoring = useCallback(async () => {
    try {
      const res = await api.getAgentMonitoring(agentId);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    } catch {
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchMonitoring();

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(fetchMonitoring, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMonitoring]);

  // Pause auto-refresh when tab is not visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchMonitoring();
        intervalRef.current = setInterval(fetchMonitoring, 30_000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchMonitoring]);

  if (loading) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (error && !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Monitoring unavailable
        </div>
      </GlassCard>
    );
  }

  if (!data) return null;

  const healthConfig = {
    healthy: {
      dot: 'bg-emerald-400',
      text: 'text-emerald-400',
      label: 'Healthy',
      bg: 'bg-emerald-500/10',
    },
    unhealthy: {
      dot: 'bg-amber-400',
      text: 'text-amber-400',
      label: 'Degraded',
      bg: 'bg-amber-500/10',
    },
    stopped: {
      dot: 'bg-red-400',
      text: 'text-red-400',
      label: 'Down',
      bg: 'bg-red-500/10',
    },
  }[data.health];

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart size={14} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
            Health & Performance
          </h3>
          <ResourceAlertBadge
            cpuPercent={data.resources.cpuPercent}
            memPercent={
              data.resources.memoryLimitMb > 0
                ? (data.resources.memoryUsageMb / data.resources.memoryLimitMb) * 100
                : 0
            }
          />
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchMonitoring();
          }}
          className="text-[11px] px-2 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={10} />
          Refresh
        </button>
      </div>

      {/* Top row: health, uptime, restarts, errors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {/* Health */}
        <div
          className={`rounded-xl px-3 py-2.5 ${healthConfig.bg} border border-[var(--border-default)]`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full ${healthConfig.dot} ${
                data.health === 'healthy' && isActive ? 'animate-pulse' : ''
              }`}
            />
            <span className={`text-sm font-semibold ${healthConfig.text}`}>
              {healthConfig.label}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Container Health</div>
        </div>

        {/* Uptime */}
        <div className="rounded-xl px-3 py-2.5 bg-blue-500/10 border border-[var(--border-default)]">
          <div className="text-sm font-semibold text-blue-400 mb-1 tabular-nums">
            {data.uptime.seconds > 0 ? formatUptime(data.uptime.seconds) : '--'}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Uptime</div>
        </div>

        {/* Restarts */}
        <div
          className={`rounded-xl px-3 py-2.5 border border-[var(--border-default)] ${
            data.restarts > 0 ? 'bg-amber-500/10' : 'bg-[var(--bg-card)]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <RefreshCw
              size={12}
              className={data.restarts > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]'}
            />
            <span
              className={`text-sm font-semibold tabular-nums ${
                data.restarts > 0 ? 'text-amber-400' : 'text-[var(--text-primary)]'
              }`}
            >
              {data.restarts}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Restarts</div>
        </div>

        {/* Errors */}
        <div
          className={`rounded-xl px-3 py-2.5 border border-[var(--border-default)] ${
            data.errors.last24h > 0 ? 'bg-red-500/10' : 'bg-[var(--bg-card)]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle
              size={12}
              className={data.errors.last24h > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}
            />
            <span
              className={`text-sm font-semibold tabular-nums ${
                data.errors.last24h > 0 ? 'text-red-400' : 'text-[var(--text-primary)]'
              }`}
            >
              {data.errors.last24h}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Errors (24h)</div>
        </div>
      </div>

      {/* Resource usage bars */}
      <div className="space-y-3 mb-5">
        <ResourceBar
          label="CPU Usage"
          value={data.resources.cpuPercent}
          max={100}
          unit="%"
          color="bg-[var(--color-accent)]"
        />
        <ResourceBar
          label="Memory"
          value={data.resources.memoryUsageMb}
          max={data.resources.memoryLimitMb}
          unit="MB"
          color="bg-blue-500"
        />
      </div>

      {/* Historical sparkline charts */}
      <ResourceChart
        history={data.history ?? []}
        currentCpu={data.resources.cpuPercent}
        currentMem={data.resources.memoryUsageMb}
        memLimitMb={data.resources.memoryLimitMb}
      />

      {/* Response times — hidden until actual duration tracking is implemented */}
      {(data.responseTimes.avg > 0 || data.responseTimes.last > 0) && (
        <div className="border-t border-[var(--border-default)] pt-3">
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-[var(--color-accent)]" />
            <span className="text-xs text-[var(--text-muted)]">Response Times</span>
            <span className="text-[10px] text-[var(--text-muted)] ml-auto">
              Tracking coming soon
            </span>
          </div>
        </div>
      )}

      {/* Last error preview */}
      {data.errors.lastError && (
        <div className="border-t border-[var(--border-default)] pt-3 mt-3">
          <div className="text-[10px] text-red-400 mb-1">Last Error</div>
          <div className="text-xs text-[var(--text-secondary)] font-mono bg-red-500/5 rounded-lg px-3 py-2 border border-red-500/10 truncate">
            {data.errors.lastError}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
