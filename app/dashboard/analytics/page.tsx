'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Bot,
  Activity,
  Cpu,
  Hash,
  Zap,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
interface AccountAnalytics {
  totalAgents: number;
  activeAgents: number;
  totalMessages: number;
  statusBreakdown: Record<string, number>;
  frameworkBreakdown: Record<string, number>;
  agentMessageBreakdown: Array<{ id: string; name: string; framework: string; count: number }>;
  dailyVolume: Array<{ date: string; count: number }>;
  tokenSummary: { inputTokens: number; outputTokens: number; totalTokens: number; usdCost: number };
}

// ─── Helpers ─────────────────────────────────────────────────
function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const FRAMEWORK_COLORS: Record<string, string> = {
  openclaw: '#f59e0b',
  hermes: '#a855f7',
  elizaos: '#06b6d4',
  milady: '#f43f5e',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  sleeping: 'var(--text-muted)',
  paused: '#f59e0b',
  error: '#ef4444',
  restarting: '#06b6d4',
};

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = '#06b6d4',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
    </motion.div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────
function BarChartSection({ data, color = '#06b6d4' }: { data: Array<{ date: string; count: number }>; color?: string }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const today = new Date().toISOString().slice(0, 10);
  // Show every other label if we have 14 bars
  const showLabel = (i: number) => data.length <= 7 || i % 2 === 0;

  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d, i) => {
        const heightPct = (d.count / maxCount) * 100;
        const isToday = d.date === today;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-elevated)] border border-white/10 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap z-10 pointer-events-none">
              {formatChartDate(d.date)}: {d.count}
            </div>
            <span className="text-[9px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
              {d.count > 0 ? d.count : ''}
            </span>
            <div
              className="w-full rounded-t transition-all duration-300 min-h-[2px]"
              style={{
                height: `${Math.max(heightPct, d.count > 0 ? 4 : 1)}%`,
                background: isToday ? color : `${color}60`,
              }}
            />
            {showLabel(i) && (
              <div className="flex flex-col items-center">
                <span className={`text-[8px] ${isToday ? 'font-medium' : ''}`} style={{ color: isToday ? color : 'var(--text-muted)' }}>
                  {isToday ? 'Today' : formatWeekday(d.date)}
                </span>
                <span className="text-[7px] text-[var(--text-muted)]/50">{formatChartDate(d.date)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--bg-card)] ${className ?? ''}`} />;
}

// ─── Main Page ───────────────────────────────────────────────
export default function AnalyticsPage() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<AccountAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.getAccountAnalytics();
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error ?? 'Failed to load analytics');
      }
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const totalDailyMessages = data ? data.dailyVolume.reduce((s, d) => s + d.count, 0) : 0;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/agents"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                Analytics
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Account-wide usage insights</p>
            </div>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </motion.div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 mb-6 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
                <Skeleton className="h-9 w-9 mb-3" />
                <Skeleton className="h-7 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))
          ) : (
            <>
              <StatCard icon={Bot} label="Total Agents" value={data?.totalAgents ?? 0} sub={`${data?.activeAgents ?? 0} active`} color="#8b5cf6" />
              <StatCard icon={MessageSquare} label="Total Messages" value={formatNumber(data?.totalMessages ?? 0)} sub="All time" color="#06b6d4" />
              <StatCard icon={Activity} label="Last 14 Days" value={formatNumber(totalDailyMessages)} sub="Messages" color="#22c55e" />
              <StatCard icon={Zap} label="Active Now" value={data?.activeAgents ?? 0} sub="Running agents" color="#f59e0b" />
            </>
          )}
        </div>

        {/* Daily Volume Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border p-6 mb-6"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-[#06b6d4]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Message Volume</h3>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Last 14 days</span>
          </div>
          {loading ? (
            <div className="flex items-end gap-1 h-40">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-[var(--bg-card)] animate-pulse" style={{ height: `${15 + Math.random() * 60}%` }} />
                </div>
              ))}
            </div>
          ) : data && data.dailyVolume.length > 0 ? (
            <BarChartSection data={data.dailyVolume} />
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-[var(--text-muted)]">No message data yet</p>
            </div>
          )}
        </motion.div>

        {/* Two column: Framework + Status breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Framework Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border p-6"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Cpu size={16} className="text-[#06b6d4]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Frameworks</h3>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : data && Object.keys(data.frameworkBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.frameworkBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([fw, count]) => {
                    const pct = data.totalAgents > 0 ? (count / data.totalAgents) * 100 : 0;
                    const color = FRAMEWORK_COLORS[fw] ?? '#8b5cf6';
                    return (
                      <div key={fw}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs capitalize font-medium" style={{ color }}>{fw}</span>
                          <span className="text-xs text-[var(--text-muted)]">{count} agent{count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">No agents yet</p>
            )}
          </motion.div>

          {/* Status Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border p-6"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Activity size={16} className="text-[#06b6d4]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Agent Status</h3>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : data && Object.keys(data.statusBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.statusBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const pct = data.totalAgents > 0 ? (count / data.totalAgents) * 100 : 0;
                    const color = STATUS_COLORS[status] ?? 'var(--text-muted)';
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs capitalize font-medium" style={{ color }}>{status}</span>
                          <span className="text-xs text-[var(--text-muted)]">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">No agents yet</p>
            )}
          </motion.div>
        </div>

        {/* Per-Agent Message Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border p-6 mb-6"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Hash size={16} className="text-[#06b6d4]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Messages Per Agent</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : data && data.agentMessageBreakdown.length > 0 ? (
            <div className="space-y-3">
              {data.agentMessageBreakdown.map((agent, i) => {
                const maxCount = data.agentMessageBreakdown[0]?.count ?? 1;
                const pct = maxCount > 0 ? (agent.count / maxCount) * 100 : 0;
                const color = FRAMEWORK_COLORS[agent.framework] ?? '#8b5cf6';
                return (
                  <div key={agent.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-[var(--text-muted)] w-4 text-right shrink-0">#{i + 1}</span>
                        <Link
                          href={`/dashboard/agent/${agent.id}?tab=analytics`}
                          className="text-xs font-medium text-[var(--text-primary)] hover:text-[#06b6d4] transition-colors truncate"
                        >
                          {agent.name}
                        </Link>
                        <span className="text-[9px] capitalize shrink-0" style={{ color }}>{agent.framework}</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] shrink-0 ml-3">{agent.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">No message data yet — start chatting with your agents!</p>
          )}
        </motion.div>

        {/* Empty state */}
        {!loading && !error && data?.totalAgents === 0 && (
          <div className="text-center py-16">
            <TrendingUp size={40} className="mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-sm text-[var(--text-muted)]">No agents yet. Create your first agent to start seeing analytics.</p>
            <Link href="/create" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors">
              Create Agent
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
