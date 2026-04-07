'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Hash,
  ExternalLink,
  Zap,
  DollarSign,
  Activity,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard } from '../AgentContext';

type Range = '7d' | '30d';

interface AnalyticsData {
  range: string;
  rangeDays: number;
  messagesPerDay: Array<{ date: string; count: number; inputTokens: number; outputTokens: number; usdCost: number }>;
  totalMessages: number;
  avgPerDay: number;
  peakDay: string | null;
  framework: string;
  tokens: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
    hasByok: boolean;
  };
}

interface DeepAnalytics {
  range: string;
  rangeDays: number;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  responseTimes: { avgMs: number; p50Ms: number; p95Ms: number; totalPairs: number };
  dailyResponseTimes: Record<string, number>;
  errorRate: { total: number; errors: number; successful: number; rate: number };
  topTopics: Array<{ word: string; count: number }>;
}

/* ── Framework color themes ─────────────────────────────────── */
const FRAMEWORK_THEME: Record<string, { primary: string; primaryDim: string; primaryBg: string; gradient: string; gradientDim: string; label: string }> = {
  openclaw: {
    primary: '#f59e0b',
    primaryDim: 'rgba(245,158,11,0.4)',
    primaryBg: 'rgba(245,158,11,0.1)',
    gradient: 'linear-gradient(90deg, #f59e0b, #d97706)',
    gradientDim: 'linear-gradient(90deg, #d97706, #b45309)',
    label: 'OpenClaw',
  },
  hermes: {
    primary: '#a855f7',
    primaryDim: 'rgba(168,85,247,0.4)',
    primaryBg: 'rgba(168,85,247,0.1)',
    gradient: 'linear-gradient(90deg, #8b5cf6, #a855f7)',
    gradientDim: 'linear-gradient(90deg, #7c3aed, #6d28d9)',
    label: 'Hermes',
  },
  elizaos: {
    primary: 'var(--color-accent)',
    primaryDim: 'rgba(6,182,212,0.4)',
    primaryBg: 'rgba(6,182,212,0.1)',
    gradient: 'linear-gradient(90deg, var(--color-accent), #0891b2)',
    gradientDim: 'linear-gradient(90deg, #0891b2, #0e7490)',
    label: 'ElizaOS',
  },
  milady: {
    primary: '#f43f5e',
    primaryDim: 'rgba(244,63,94,0.4)',
    primaryBg: 'rgba(244,63,94,0.1)',
    gradient: 'linear-gradient(90deg, #f43f5e, #e11d48)',
    gradientDim: 'linear-gradient(90deg, #e11d48, #be123c)',
    label: 'Milady',
  },
};

const DEFAULT_THEME = FRAMEWORK_THEME.elizaos;

/* ── Framework analytics tips ───────────────────────────────── */
const FRAMEWORK_TIPS: Record<string, string> = {
  openclaw: 'OpenClaw agents benefit from tracking tool usage patterns. Watch token output — high output suggests verbose tool responses you can optimize.',
  hermes: 'Hermes agents are conversation-heavy. Monitor messages/day and token costs closely, especially if using paid LLM providers.',
  elizaos: 'ElizaOS agents run multi-platform. Compare activity across time ranges to identify peak engagement windows.',
  milady: 'Milady agents are personality-driven. High message counts with low token usage indicate efficient, character-consistent responses.',
};

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

const RANGES: { value: Range; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

/* ── Trend calculation helper ───────────────────────────────── */
function calcTrend(data: Array<{ count: number }>): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (data.length < 2) return { pct: 0, direction: 'flat' };
  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid);
  const secondHalf = data.slice(mid);
  const avgFirst = firstHalf.reduce((s, d) => s + d.count, 0) / (firstHalf.length || 1);
  const avgSecond = secondHalf.reduce((s, d) => s + d.count, 0) / (secondHalf.length || 1);
  if (avgFirst === 0 && avgSecond === 0) return { pct: 0, direction: 'flat' };
  if (avgFirst === 0) return { pct: 100, direction: 'up' };
  const pct = Math.round(((avgSecond - avgFirst) / avgFirst) * 100);
  return { pct: Math.abs(pct), direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

function TrendBadge({ pct, direction }: { pct: number; direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'flat') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
        <Minus size={10} />
        0%
      </span>
    );
  }
  const isUp = direction === 'up';
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-medium"
      style={{ color: isUp ? '#22c55e' : '#ef4444' }}
    >
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {pct}%
    </span>
  );
}

/* ── Custom Recharts tooltip ─────────────────────────────────── */
function ChartTooltipContent({ active, payload, label, theme }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2 text-xs shadow-lg" style={{ background: 'var(--bg-elevated)' }}>
      <p className="font-medium text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || theme?.primary || 'var(--text-muted)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

export function AnalyticsTab() {
  const { agent } = useAgentContext();
  const [range, setRange] = useState<Range>('7d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [deep, setDeep] = useState<DeepAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [deepLoading, setDeepLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const framework = (agent?.framework ?? 'elizaos').toLowerCase();
  const theme = FRAMEWORK_THEME[framework] ?? DEFAULT_THEME;
  const tip = FRAMEWORK_TIPS[framework] ?? FRAMEWORK_TIPS.elizaos;

  const fetchAnalytics = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentAnalytics(agent.id, range);
      if (res.success) {
        setAnalytics(res.data);
      } else {
        setError(res.error ?? 'Failed to load analytics');
      }
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [agent?.id, range]);

  const fetchDeep = useCallback(async () => {
    if (!agent?.id) return;
    setDeepLoading(true);
    try {
      const res = await api.getAgentDeepAnalytics(agent.id, range);
      if (res.success) {
        setDeep(res.data);
      }
    } catch {
      // Deep analytics is optional, fail silently
    } finally {
      setDeepLoading(false);
    }
  }, [agent?.id, range]);

  useEffect(() => {
    fetchAnalytics();
    fetchDeep();
  }, [fetchAnalytics, fetchDeep]);

  const today = new Date().toISOString().slice(0, 10);

  // Trend calculations
  const msgTrend = useMemo(() => {
    if (!analytics) return { pct: 0, direction: 'flat' as const };
    return calcTrend(analytics.messagesPerDay);
  }, [analytics]);

  const tokenTrend = useMemo(() => {
    if (!analytics) return { pct: 0, direction: 'flat' as const };
    return calcTrend(analytics.messagesPerDay.map(d => ({ count: d.inputTokens + d.outputTokens })));
  }, [analytics]);

  // Chart data for message volume
  const chartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.messagesPerDay.map(d => ({
      date: formatChartDate(d.date),
      rawDate: d.date,
      messages: d.count,
      tokens: d.inputTokens + d.outputTokens,
    }));
  }, [analytics]);

  // Hourly chart data with peak detection
  const hourlyData = useMemo(() => {
    if (!deep) return [];
    const maxCount = Math.max(...deep.hourlyDistribution.map(h => h.count), 1);
    return deep.hourlyDistribution.map(h => ({
      hour: formatHour(h.hour),
      rawHour: h.hour,
      count: h.count,
      isPeak: h.count === maxCount && h.count > 0,
    }));
  }, [deep]);

  // Response time chart data
  const responseTimeData = useMemo(() => {
    if (!analytics || !deep?.dailyResponseTimes) return [];
    return analytics.messagesPerDay.map(d => ({
      date: formatChartDate(d.date),
      avgMs: deep.dailyResponseTimes[d.date] ?? 0,
    })).filter(d => d.avgMs > 0);
  }, [analytics, deep]);

  // Peak hour
  const peakHour = useMemo(() => {
    if (!deep) return null;
    const peak = deep.hourlyDistribution.reduce((max, h) => h.count > max.count ? h : max, deep.hourlyDistribution[0]!);
    return peak.count > 0 ? peak : null;
  }, [deep]);

  const shimmerBars = (count: number) => (
    <div className="flex items-end gap-0.5 h-36">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t bg-[var(--bg-card)] animate-pulse" style={{ height: `${20 + (i * 13) % 60}%` }} />
        </div>
      ))}
    </div>
  );

  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Framework analytics context banner */}
      <div
        className="flex items-start gap-3 rounded-xl border px-4 py-3"
        style={{ background: theme.primaryBg, borderColor: `${theme.primary}20` }}
      >
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: theme.primary }} />
        <div>
          <p className="text-xs font-medium" style={{ color: theme.primary }}>
            {(FRAMEWORK_THEME[framework]?.label ?? framework)} Analytics
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-0.5">{tip}</p>
        </div>
      </div>

      {/* ── KPI Summary Row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: Hash,
            label: 'Total Messages',
            value: analytics ? analytics.totalMessages.toLocaleString() : '--',
            trend: analytics ? msgTrend : null,
          },
          {
            icon: TrendingUp,
            label: 'Avg / Day',
            value: analytics ? String(analytics.avgPerDay) : '--',
            trend: null,
          },
          {
            icon: Clock,
            label: 'Avg Response',
            value: deep ? formatMs(deep.responseTimes.avgMs) : '--',
            trend: null,
          },
          {
            icon: deep && deep.errorRate.rate > 5 ? AlertTriangle : CheckCircle,
            label: 'Success Rate',
            value: deep ? `${(100 - deep.errorRate.rate).toFixed(1)}%` : '--',
            trend: null,
            color: deep ? (deep.errorRate.rate > 5 ? '#ef4444' : '#22c55e') : undefined,
          },
        ].map(({ icon: Icon, label, value, trend, color }) => (
          <div
            key={label}
            className="rounded-xl border p-3.5 relative overflow-hidden"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          >
            <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: color || theme.primary }} />
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={12} style={{ color: color || theme.primary }} />
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="text-xl font-bold text-[var(--text-primary)]">{value}</span>
              {trend && <TrendBadge pct={trend.pct} direction={trend.direction} />}
            </div>
          </div>
        ))}
      </div>

      {/* ── Message Volume Chart ───────────────────────────────── */}
      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} style={{ color: theme.primary }} />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Message Volume</h3>
            {analytics && (
              <TrendBadge pct={msgTrend.pct} direction={msgTrend.direction} />
            )}
          </div>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'var(--bg-hover)' }}>
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  range === r.value
                    ? 'text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                style={range === r.value ? { background: theme.primary } : undefined}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? shimmerBars(range === '7d' ? 7 : 30) : error ? (
          <div className="h-44 flex items-center justify-center">
            <p className="text-sm text-[var(--text-muted)]">{error}</p>
          </div>
        ) : analytics && chartData.length > 0 ? (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    interval={range === '30d' ? 4 : 0}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    content={(props: any) => <ChartTooltipContent {...props} theme={theme} />}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="messages" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.rawDate === today
                            ? theme.primary
                            : entry.rawDate === analytics.peakDay
                              ? `${theme.primary}bf`
                              : theme.primaryDim
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[var(--border-default)]">
              {[
                { icon: Hash, label: 'Total', value: analytics.totalMessages.toLocaleString() },
                { icon: TrendingUp, label: 'Avg/Day', value: String(analytics.avgPerDay) },
                { icon: Calendar, label: 'Peak Day', value: analytics.peakDay ? formatChartDate(analytics.peakDay) : '--' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: theme.primaryBg }}>
                    <Icon size={13} style={{ color: theme.primary }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-44 flex items-center justify-center">
            <p className="text-sm text-[var(--text-muted)]">No message data yet</p>
          </div>
        )}
      </GlassCard>

      {/* ── Hourly Activity Pattern ────────────────────────────── */}
      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: theme.primary }} />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Activity by Hour</h3>
          </div>
          {peakHour && (
            <span className="text-[10px] text-[var(--text-muted)]">
              Peak: <span style={{ color: theme.primary }} className="font-medium">{formatHour(peakHour.hour)}</span>
            </span>
          )}
        </div>

        {deepLoading ? shimmerBars(24) : deep ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  content={(props: any) => <ChartTooltipContent {...props} theme={theme} />}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" name="Messages" radius={[3, 3, 0, 0]} maxBarSize={20}>
                  {hourlyData.map((entry, index) => (
                    <Cell
                      key={`hcell-${index}`}
                      fill={entry.isPeak ? theme.primary : theme.primaryDim}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm text-[var(--text-muted)]">No hourly data available</p>
          </div>
        )}
      </GlassCard>

      {/* ── Response Time ──────────────────────────────────────── */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-5">
          <Activity size={18} style={{ color: theme.primary }} />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Response Time</h3>
        </div>

        {deepLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
          </div>
        ) : deep && deep.responseTimes.totalPairs > 0 ? (
          <>
            {/* Response time KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Average', value: formatMs(deep.responseTimes.avgMs) },
                { label: 'Median (P50)', value: formatMs(deep.responseTimes.p50Ms) },
                { label: '95th Percentile', value: formatMs(deep.responseTimes.p95Ms) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>

            {/* Response time trend line */}
            {responseTimeData.length > 1 && (
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={responseTimeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rtGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatMs(v)}
                    />
                    <RechartsTooltip
                      content={(props: any) => {
                        if (!props.active || !props.payload?.length) return null;
                        return (
                          <div className="rounded-lg border border-white/10 px-3 py-2 text-xs shadow-lg" style={{ background: 'var(--bg-elevated)' }}>
                            <p className="font-medium text-white mb-1">{props.label}</p>
                            <p style={{ color: theme.primary }}>
                              Avg: {formatMs(props.payload[0].value)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgMs"
                      stroke={theme.primary}
                      strokeWidth={2}
                      fill="url(#rtGradient)"
                      name="Avg Response"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <p className="text-[10px] text-[var(--text-muted)] mt-3">
              Based on {deep.responseTimes.totalPairs.toLocaleString()} user-assistant message pairs
            </p>
          </>
        ) : (
          <div className="h-24 flex items-center justify-center">
            <p className="text-sm text-[var(--text-muted)]">No response time data yet. Chat with your agent to generate data.</p>
          </div>
        )}
      </GlassCard>

      {/* ── Error Rate ─────────────────────────────────────────── */}
      {deep && deep.errorRate.total > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={18} style={{ color: deep.errorRate.rate > 5 ? '#ef4444' : theme.primary }} />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Reliability</h3>
          </div>

          {/* Success/Error bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
              <span>Successful ({deep.errorRate.successful.toLocaleString()})</span>
              <span>Failed ({deep.errorRate.errors.toLocaleString()})</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg-card)]">
              <div
                className="transition-all rounded-l-full"
                style={{
                  width: `${deep.errorRate.total > 0 ? ((deep.errorRate.successful / deep.errorRate.total) * 100) : 100}%`,
                  background: '#22c55e',
                }}
              />
              {deep.errorRate.errors > 0 && (
                <div
                  className="transition-all rounded-r-full"
                  style={{
                    width: `${(deep.errorRate.errors / deep.errorRate.total) * 100}%`,
                    background: '#ef4444',
                  }}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10">
                <CheckCircle size={13} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Success</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{(100 - deep.errorRate.rate).toFixed(1)}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10">
                <AlertTriangle size={13} className="text-red-400" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Error Rate</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{deep.errorRate.rate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: theme.primaryBg }}>
                <MessageSquare size={13} style={{ color: theme.primary }} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Total</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{deep.errorRate.total.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Token Usage ────────────────────────────────────────── */}
      {analytics && analytics.tokens.totalTokens > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <Zap size={16} style={{ color: theme.primary }} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Token Usage</h3>
            {tokenTrend.direction !== 'flat' && (
              <TrendBadge pct={tokenTrend.pct} direction={tokenTrend.direction} />
            )}
            <span className="ml-auto text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              {analytics.tokens.hasByok ? 'BYOK' : 'Hatcher Key'}
            </span>
          </div>

          {/* Input / Output proportion bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
              <span>Input ({formatTokens(analytics.tokens.inputTokens)})</span>
              <span>Output ({formatTokens(analytics.tokens.outputTokens)})</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
              <div
                className="transition-all"
                style={{
                  width: `${(analytics.tokens.inputTokens / analytics.tokens.totalTokens) * 100}%`,
                  background: theme.gradient,
                }}
              />
              <div
                className="transition-all"
                style={{
                  width: `${(analytics.tokens.outputTokens / analytics.tokens.totalTokens) * 100}%`,
                  background: theme.gradientDim,
                  opacity: 0.6,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Activity, label: 'Input', value: formatTokens(analytics.tokens.inputTokens), color: theme.primary },
              { icon: Activity, label: 'Output', value: formatTokens(analytics.tokens.outputTokens), color: theme.primary, dim: true },
              {
                icon: DollarSign,
                label: 'Est. Cost',
                value: analytics.tokens.hasByok ? 'Your key' : `$${analytics.tokens.totalCost.toFixed(4)}`,
                color: 'var(--text-muted)',
                dim: false,
              },
            ].map(({ icon: Icon, label, value, color, dim }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, opacity: dim ? 0.7 : 1 }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Top Topics ─────────────────────────────────────────── */}
      {deep && deep.topTopics.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <Tag size={18} style={{ color: theme.primary }} />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Top Topics</h3>
            <span className="text-[10px] text-[var(--text-muted)] ml-auto">From recent conversations</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {deep.topTopics.map((topic, i) => {
              const maxCount = deep.topTopics[0]!.count;
              const opacity = 0.3 + (topic.count / maxCount) * 0.7;
              return (
                <div
                  key={topic.word}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border transition-all"
                  style={{
                    background: `${theme.primary}${Math.round(opacity * 25).toString(16).padStart(2, '0')}`,
                    borderColor: `${theme.primary}${Math.round(opacity * 40).toString(16).padStart(2, '0')}`,
                  }}
                >
                  <span
                    className="text-xs font-medium capitalize"
                    style={{ color: theme.primary, opacity: 0.6 + opacity * 0.4 }}
                  >
                    {topic.word}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">{topic.count}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── Today Summary ──────────────────────────────────────── */}
      {analytics && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} style={{ color: theme.primary }} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Today</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Messages Today</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {analytics.messagesPerDay.find(d => d.date === today)?.count ?? 0}
                </p>
                {analytics.messagesPerDay.length >= 2 && (() => {
                  const todayCount = analytics.messagesPerDay.find(d => d.date === today)?.count ?? 0;
                  const yesterdayCount = analytics.messagesPerDay.length >= 2
                    ? analytics.messagesPerDay[analytics.messagesPerDay.length - 2]?.count ?? 0
                    : 0;
                  if (yesterdayCount === 0 && todayCount === 0) return null;
                  if (yesterdayCount === 0) return (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#22c55e]">
                      <ArrowUpRight size={10} /> new
                    </span>
                  );
                  const pct = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
                  return (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium"
                      style={{ color: pct >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {pct >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(pct)}% vs yesterday
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{analytics.rangeDays ?? range.replace('d', '')}D Total</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{analytics.totalMessages.toLocaleString()}</p>
                <TrendBadge pct={msgTrend.pct} direction={msgTrend.direction} />
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Link to account analytics */}
      <Link
        href="/dashboard/analytics"
        className="flex items-center justify-between rounded-xl border border-[var(--border-default)] px-5 py-4 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/10 transition-colors group"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <span>View account-wide analytics</span>
        <ExternalLink size={14} className="transition-colors" style={{ color: undefined }} />
      </Link>
    </motion.div>
  );
}
