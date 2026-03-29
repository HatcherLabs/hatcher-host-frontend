'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
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
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard } from '../AgentContext';

type Range = '7d' | '30d' | '90d';

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
    primary: '#06b6d4',
    primaryDim: 'rgba(6,182,212,0.4)',
    primaryBg: 'rgba(6,182,212,0.1)',
    gradient: 'linear-gradient(90deg, #06b6d4, #0891b2)',
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

const RANGES: { value: Range; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
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

function TrendBadge({ pct, direction, theme }: { pct: number; direction: 'up' | 'down' | 'flat'; theme: typeof DEFAULT_THEME }) {
  if (direction === 'flat') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-[#71717a]">
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

export function AnalyticsTab() {
  const { agent } = useAgentContext();
  const [range, setRange] = useState<Range>('7d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxCount = analytics ? Math.max(...analytics.messagesPerDay.map(d => d.count), 1) : 1;
  const today = new Date().toISOString().slice(0, 10);

  // Show every Nth x-axis label to avoid crowding on 30d
  const labelStep = range === '30d' ? 5 : 1;

  // Trend calculations
  const msgTrend = useMemo(() => {
    if (!analytics) return { pct: 0, direction: 'flat' as const };
    return calcTrend(analytics.messagesPerDay);
  }, [analytics]);

  const tokenTrend = useMemo(() => {
    if (!analytics) return { pct: 0, direction: 'flat' as const };
    return calcTrend(analytics.messagesPerDay.map(d => ({ count: d.inputTokens + d.outputTokens })));
  }, [analytics]);

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
          <p className="text-[11px] text-[#a1a1aa] leading-relaxed mt-0.5">{tip}</p>
        </div>
      </div>

      {/* Message Activity Chart */}
      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} style={{ color: theme.primary }} />
            <h3 className="text-base font-semibold text-[#fafafa]">Message Activity</h3>
            {analytics && (
              <TrendBadge pct={msgTrend.pct} direction={msgTrend.direction} theme={theme} />
            )}
          </div>
          {/* Range selector */}
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'rgba(46,43,74,0.5)' }}>
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  range === r.value
                    ? 'text-white'
                    : 'text-[#71717a] hover:text-white'
                }`}
                style={range === r.value ? { background: theme.primary } : undefined}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-end gap-0.5 h-36">
            {Array.from({ length: range === '7d' ? 7 : range === '30d' ? 30 : 90 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-white/[0.04] animate-pulse" style={{ height: `${20 + (i * 13) % 60}%` }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="h-36 flex items-center justify-center">
            <p className="text-sm text-[#6B6890]">{error}</p>
          </div>
        ) : analytics ? (
          <>
            <div className="flex items-end gap-0.5 h-36 mb-2">
              {analytics.messagesPerDay.map((d, i) => {
                const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                const isToday = d.date === today;
                const isPeak = d.date === analytics.peakDay && d.count > 0;
                const showLabel = i % labelStep === 0 || isToday;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1730] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white whitespace-nowrap z-10 pointer-events-none left-1/2 -translate-x-1/2">
                      <div className="font-medium">{formatChartDate(d.date)}</div>
                      <div className="text-[#71717a]">{d.count} msg</div>
                      {d.inputTokens > 0 && (
                        <div style={{ color: theme.primary }}>{formatTokens(d.inputTokens + d.outputTokens)} tokens</div>
                      )}
                    </div>
                    <div
                      className="w-full rounded-t transition-all duration-300 min-h-[2px]"
                      style={{
                        height: `${Math.max(heightPct, d.count > 0 ? 4 : 1)}%`,
                        background: isToday
                          ? theme.primary
                          : isPeak
                            ? `${theme.primary}bf`
                            : theme.primaryDim,
                      }}
                    />
                    {showLabel && (
                      <span
                        className="text-[8px] leading-none mt-0.5"
                        style={{ color: isToday ? theme.primary : 'rgba(113,113,122,0.6)' }}
                      >
                        {isToday ? 'Now' : formatChartDate(d.date).replace(/[A-Za-z]+ /, '')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/[0.04]">
              {[
                { icon: Hash, label: 'Total', value: analytics.totalMessages.toLocaleString(), trend: msgTrend },
                { icon: TrendingUp, label: 'Avg/Day', value: String(analytics.avgPerDay), trend: null },
                { icon: Calendar, label: 'Peak Day', value: analytics.peakDay ? formatChartDate(analytics.peakDay) : '--', trend: null },
              ].map(({ icon: Icon, label, value, trend }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(46,43,74,0.3)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: theme.primaryBg }}>
                    <Icon size={13} style={{ color: theme.primary }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#71717a] uppercase tracking-wider">{label}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-[#fafafa]">{value}</p>
                      {trend && <TrendBadge pct={trend.pct} direction={trend.direction} theme={theme} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </GlassCard>

      {/* Token Usage -- only shown if there's token data */}
      {analytics && analytics.tokens.totalTokens > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <Zap size={16} style={{ color: theme.primary }} />
            <h3 className="text-sm font-semibold text-[#fafafa]">Token Usage</h3>
            {tokenTrend.direction !== 'flat' && (
              <TrendBadge pct={tokenTrend.pct} direction={tokenTrend.direction} theme={theme} />
            )}
            <span className="ml-auto text-[10px] text-[#71717a] uppercase tracking-wider">
              {analytics.tokens.hasByok ? 'BYOK' : 'Hatcher Key'}
            </span>
          </div>

          {/* Input / Output proportion bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-[#71717a] mb-1.5">
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
                color: '#71717a',
                dim: false,
              },
            ].map(({ icon: Icon, label, value, color, dim }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, opacity: dim ? 0.7 : 1 }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <div>
                  <p className="text-[10px] text-[#71717a] uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold text-[#fafafa]">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Today summary */}
      {analytics && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} style={{ color: theme.primary }} />
            <h3 className="text-sm font-semibold text-[#fafafa]">Today</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">Messages Today</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#fafafa]">
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
            <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">{analytics.rangeDays ?? range.replace('d', '')}D Total</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#fafafa]">{analytics.totalMessages.toLocaleString()}</p>
                <TrendBadge pct={msgTrend.pct} direction={msgTrend.direction} theme={theme} />
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Link to account analytics */}
      <Link
        href="/dashboard/analytics"
        className="flex items-center justify-between rounded-xl border border-white/[0.06] px-5 py-4 text-sm text-[#71717a] hover:text-white hover:border-white/10 transition-colors group"
        style={{ background: 'rgba(26,23,48,0.4)' }}
      >
        <span>View account-wide analytics</span>
        <ExternalLink size={14} className="transition-colors" style={{ color: undefined }} />
      </Link>
    </motion.div>
  );
}
