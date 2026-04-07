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
  Shield,
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
  elizaos: 'var(--color-accent)',
  milady: '#f43f5e',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  sleeping: 'var(--text-muted)',
  paused: '#f59e0b',
  error: '#ef4444',
  restarting: 'var(--color-accent)',
};

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'var(--color-accent)',
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
function BarChartSection({ data, color = 'var(--color-accent)' }: { data: Array<{ date: string; count: number }>; color?: string }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const today = new Date().toISOString().slice(0, 10);
  const W = 600;
  const H = 160;
  const PAD = { top: 20, right: 12, bottom: 32, left: 36 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  // Build points for area/line
  const points = data.map((d, i) => ({
    x: PAD.left + (i / Math.max(data.length - 1, 1)) * cw,
    y: PAD.top + ch - (d.count / maxCount) * ch,
    ...d,
  }));

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${points[points.length - 1]?.x ?? W},${PAD.top + ch} L${PAD.left},${PAD.top + ch} Z`;

  // Y-axis ticks (4 ticks)
  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const val = Math.round((maxCount / 3) * i);
    const y = PAD.top + ch - (val / maxCount) * ch;
    return { val, y };
  });

  // X-axis labels (show ~5-6 evenly spaced)
  const labelStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map(t => (
          <g key={t.val}>
            <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="var(--border-default)" strokeWidth="0.5" strokeDasharray="4 4" />
            <text x={PAD.left - 6} y={t.y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono, monospace)">{t.val}</text>
          </g>
        ))}
        {/* Gradient fill */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaGrad)" />
        {/* Line */}
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p) => (
          <g key={p.date}>
            <circle cx={p.x} cy={p.y} r={p.date === today ? 4 : 2.5} fill={p.date === today ? color : `${color}80`} stroke={p.date === today ? 'white' : 'none'} strokeWidth="1.5" />
            {/* Hover target + tooltip */}
            <circle cx={p.x} cy={p.y} r="12" fill="transparent" className="cursor-pointer">
              <title>{formatChartDate(p.date)}: {p.count} messages</title>
            </circle>
          </g>
        ))}
        {/* X-axis labels */}
        {points.map((p, i) => (
          (i % labelStep === 0 || p.date === today) && (
            <text key={`label-${p.date}`} x={p.x} y={H - 6} textAnchor="middle" fill={p.date === today ? color : 'var(--text-muted)'} fontSize="9" fontWeight={p.date === today ? '600' : '400'} fontFamily="var(--font-mono, monospace)">
              {p.date === today ? 'Today' : formatChartDate(p.date)}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--bg-card)] ${className ?? ''}`} />;
}

// ─── Main Page ───────────────────────────────────────────────
export default function AnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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

  if (authLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--border-default)] border-t-[var(--text-muted)] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Shield className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Sign In Required</h1>
        <p className="mb-6 text-[var(--text-secondary)]">Sign in to view analytics.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

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
              <StatCard icon={MessageSquare} label="Messages" value={formatNumber(data?.totalMessages ?? 0)} sub="All time" color="var(--color-accent)" />
              <StatCard icon={Zap} label="LLM Calls" value={formatNumber((data as any)?.totalLlmCalls ?? 0)} sub="All time" color="#f59e0b" />
              <StatCard icon={Activity} label="Last 14 Days" value={formatNumber(totalDailyMessages)} sub="User messages" color="#22c55e" />
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
              <BarChart3 size={18} className="text-[var(--color-accent)]" />
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
              <Cpu size={16} className="text-[var(--color-accent)]" />
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
              <Activity size={16} className="text-[var(--color-accent)]" />
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
            <Hash size={16} className="text-[var(--color-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Total Messages by Agent</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : data && data.agentMessageBreakdown.length > 0 ? (
            <div className="space-y-2.5">
              {data.agentMessageBreakdown.map((agent, i) => {
                const maxCount = data.agentMessageBreakdown[0]?.count ?? 1;
                const pct = maxCount > 0 ? (agent.count / maxCount) * 100 : 0;
                const color = FRAMEWORK_COLORS[agent.framework] ?? '#8b5cf6';
                return (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agent/${agent.id}?tab=analytics`}
                    className="block p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: `${color}20`, color }}>{i + 1}</span>
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">{agent.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] capitalize px-1.5 py-0.5 rounded-md shrink-0" style={{ background: `${color}15`, color }}>{agent.framework}</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{agent.count.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </Link>
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
