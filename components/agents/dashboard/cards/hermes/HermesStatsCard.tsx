'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Clock, MessageSquare, Wrench, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';
import { timeAgo } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────

interface HermesStats {
  sessions: { total: number };
  messages: { total: number; today: number };
  toolCalls: { total: number; byType: Record<string, number> };
  tokens: {
    input: number;
    output: number;
    total: number;
    today: { input: number; output: number };
  };
  lastActiveAt: string;
  containerOffline: boolean;
}

// ─── Formatting helpers ─────────────────────────────────────────

/** 1234 → "1.2K", 1234567 → "1.2M", <1000 → "999" */
function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Pick the top N entries from a Record<string, number> by value,
 * returning them sorted descending.
 */
function topEntries(record: Record<string, number>, n: number): Array<[string, number]> {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// ─── Sub-components ─────────────────────────────────────────────

function StatItem({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums leading-tight">
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-[var(--text-muted)] leading-tight">{sub}</div>
      )}
    </div>
  );
}

// Badge colors cycling for tool types
const BADGE_COLORS = [
  'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
];

// ─── Main Component ─────────────────────────────────────────────

/**
 * HermesStatsCard — shows usage statistics for a managed Hermes agent:
 *   sessions · messages (total / today) · tool calls + top-3 breakdown
 *   · tokens (formatted in/out) · last active
 *
 * Fetches on mount + auto-refreshes every 60 seconds.
 * When the container is offline the API returns DB-only data
 * (`containerOffline: true`); we surface a subtle notice in that case.
 */
export function HermesStatsCard() {
  const { agent } = useAgentContext();
  const [stats, setStats] = useState<HermesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.getHermesStats(agent.id);
      if (res.success) {
        setStats(res.data);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load stats');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    void fetchStats();
    intervalRef.current = setInterval(() => void fetchStats(), 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStats]);

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (error) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Usage stats unavailable: {error}
        </div>
      </GlassCard>
    );
  }

  if (!stats) return null;

  const top3Tools = topEntries(stats.toolCalls.byType, 3);

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Activity size={14} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Usage Stats</h3>
        </div>
        {stats.containerOffline && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            cached data
          </span>
        )}
      </div>

      {/* Offline notice */}
      {stats.containerOffline && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mb-3">
          <AlertTriangle size={11} />
          Container offline — showing DB-cached message &amp; token counts; session and tool data unavailable.
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
        {/* Sessions */}
        <StatItem
          icon={<MessageSquare size={12} />}
          label="Sessions"
          value={stats.containerOffline ? '—' : stats.sessions.total.toLocaleString()}
          sub={stats.containerOffline ? 'container offline' : undefined}
        />

        {/* Messages */}
        <StatItem
          icon={<MessageSquare size={12} />}
          label="Messages"
          value={stats.messages.total.toLocaleString()}
          sub={`${stats.messages.today.toLocaleString()} today`}
        />

        {/* Tool Calls */}
        <StatItem
          icon={<Wrench size={12} />}
          label="Tool Calls"
          value={stats.containerOffline ? '—' : stats.toolCalls.total.toLocaleString()}
          sub={
            !stats.containerOffline && top3Tools.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {top3Tools.map(([name, count], idx) => (
                  <span
                    key={name}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${BADGE_COLORS[idx % BADGE_COLORS.length]}`}
                    title={`${name}: ${count}`}
                  >
                    {name.length > 12 ? `${name.slice(0, 12)}…` : name}
                  </span>
                ))}
              </div>
            ) : undefined
          }
        />

        {/* Tokens */}
        <StatItem
          icon={<Zap size={12} />}
          label="Tokens"
          value={`${formatTokenCount(stats.tokens.input)} in / ${formatTokenCount(stats.tokens.output)} out`}
          sub={`today: ${formatTokenCount(stats.tokens.today.input)} in / ${formatTokenCount(stats.tokens.today.output)} out`}
        />

        {/* Last Active */}
        <StatItem
          icon={<Clock size={12} />}
          label="Last Active"
          value={timeAgo(stats.lastActiveAt, { switchToDateAfterDays: 7, dateFormat: 'short-month' })}
        />
      </div>
    </GlassCard>
  );
}
