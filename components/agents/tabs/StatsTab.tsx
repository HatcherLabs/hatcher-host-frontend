'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Activity,
  Cpu,
  Zap,
  Lock,
  CheckCircle,
  Shield,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Hash,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  useAgentContext,
  STATUS_STYLES,
  GlassCard,
  FRAMEWORK_BADGE,
} from '../AgentContext';

interface AnalyticsData {
  messagesPerDay: Array<{ date: string; count: number }>;
  totalMessages: number;
  avgPerDay: number;
  peakDay: string | null;
  framework: string;
}

/* ── Framework theme config ── */
const FRAMEWORK_THEME: Record<string, {
  accent: string;        // tailwind color class fragment
  accentHex: string;     // hex for inline styles
  accentBg: string;      // bg with opacity
  accentBorder: string;  // border color
  label: string;
  description: string;
}> = {
  openclaw: {
    accent: 'amber',
    accentHex: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.08)',
    accentBorder: 'rgba(245,158,11,0.2)',
    label: 'OpenClaw',
    description: 'Tracks messages, tool calls (web search, memory, calculator, files), and platform interactions across Telegram, Discord, Twitter, and more.',
  },
  hermes: {
    accent: 'purple',
    accentHex: '#a855f7',
    accentBg: 'rgba(168,85,247,0.08)',
    accentBorder: 'rgba(168,85,247,0.2)',
    label: 'Hermes',
    description: 'Tracks messages, autonomous reasoning chains, memory operations, and multi-step task completions across connected platforms.',
  },
  elizaos: {
    accent: 'cyan',
    accentHex: '#06b6d4',
    accentBg: 'rgba(6,182,212,0.08)',
    accentBorder: 'rgba(6,182,212,0.2)',
    label: 'ElizaOS',
    description: 'Tracks messages, plugin actions, knowledge base queries, and provider interactions across 29+ supported connectors.',
  },
  milady: {
    accent: 'rose',
    accentHex: '#f43f5e',
    accentBg: 'rgba(244,63,94,0.08)',
    accentBorder: 'rgba(244,63,94,0.2)',
    label: 'Milady',
    description: 'Tracks messages, personality-driven responses, style adaptations, and engagement metrics across social platforms.',
  },
};

const DEFAULT_THEME = FRAMEWORK_THEME.elizaos;

function getTheme(framework?: string) {
  return FRAMEWORK_THEME[framework ?? ''] ?? DEFAULT_THEME;
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-400">
      <ArrowUpRight size={10} /> new
    </span>
  );
  const pctChange = ((current - previous) / previous) * 100;
  if (Math.abs(pctChange) < 1) return null;
  const isUp = pctChange > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(Math.round(pctChange))}%
    </span>
  );
}

export function StatsTab() {
  const ctx = useAgentContext();
  const { user: authUser } = useAuth();
  const {
    agent,
    stats,
    displayUptime,
    isLiveUptime,
    llmProvider,
    currentProviderMeta,
    hasApiKey,
  } = ctx;
  const tierKey = authUser?.tier ?? 'free';

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ upCount: number; downCount: number; total: number; score: number | null } | null>(null);

  const framework = agent?.framework ?? 'openclaw';
  const theme = getTheme(framework);
  const fwBadge = FRAMEWORK_BADGE[framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';

  const fetchAnalytics = useCallback(async () => {
    if (!agent?.id) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await api.getAgentAnalytics(agent.id);
      if (res.success) {
        setAnalytics(res.data);
      } else {
        setAnalyticsError(res.error ?? 'Failed to load analytics');
      }
    } catch {
      setAnalyticsError('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (!agent?.id) return;
    api.getAgentFeedbackSummary(agent.id).then((res) => {
      if (res.success) setFeedback(res.data);
    }).catch(() => {});
  }, [agent?.id]);

  const maxCount = analytics
    ? Math.max(...analytics.messagesPerDay.map(d => d.count), 1)
    : 1;

  // Compute trend data: compare last 3 days vs previous 3 days
  const trendData = useMemo(() => {
    if (!analytics || analytics.messagesPerDay.length < 4) return null;
    const days = analytics.messagesPerDay;
    const len = days.length;
    const recentSlice = days.slice(Math.max(0, len - 3));
    const prevSlice = days.slice(Math.max(0, len - 6), Math.max(0, len - 3));
    const recentTotal = recentSlice.reduce((s, d) => s + d.count, 0);
    const prevTotal = prevSlice.reduce((s, d) => s + d.count, 0);
    const recentAvg = recentSlice.length > 0 ? recentTotal / recentSlice.length : 0;
    const prevAvg = prevSlice.length > 0 ? prevTotal / prevSlice.length : 0;
    return { recentTotal, prevTotal, recentAvg, prevAvg };
  }, [analytics]);

  // Uptime percentage (rough: based on uptime vs time since creation)
  const uptimePct = useMemo(() => {
    if (!agent?.createdAt || !displayUptime) return null;
    const totalSeconds = (Date.now() - new Date(agent.createdAt).getTime()) / 1000;
    if (totalSeconds <= 0) return null;
    const pct = Math.min(100, (displayUptime / totalSeconds) * 100);
    return Math.round(pct * 10) / 10;
  }, [agent?.createdAt, displayUptime]);

  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Framework Context Banner */}
      <div
        className="rounded-xl border px-4 py-3 flex items-start gap-3"
        style={{
          background: theme.accentBg,
          borderColor: theme.accentBorder,
        }}
      >
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: theme.accentHex }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold" style={{ color: theme.accentHex }}>
              {theme.label} Analytics
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${fwBadge}`}>
              {framework}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {theme.description}
          </p>
        </div>
      </div>

      {/* Key Highlights Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Messages */}
        <div
          className="rounded-xl border p-3.5 relative overflow-hidden"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: theme.accentHex }} />
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare size={12} style={{ color: theme.accentHex }} />
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Messages</span>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-xl font-bold text-[var(--text-primary)]">
              {(analytics?.totalMessages ?? stats?.messagesProcessed ?? 0).toLocaleString()}
            </span>
            {trendData && (
              <TrendArrow current={trendData.recentTotal} previous={trendData.prevTotal} />
            )}
          </div>
        </div>

        {/* Avg/Day */}
        <div
          className="rounded-xl border p-3.5 relative overflow-hidden"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: theme.accentHex, opacity: 0.6 }} />
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} style={{ color: theme.accentHex }} />
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Avg/Day</span>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-xl font-bold text-[var(--text-primary)]">
              {analytics?.avgPerDay ?? 0}
            </span>
            {trendData && (
              <TrendArrow current={trendData.recentAvg} previous={trendData.prevAvg} />
            )}
          </div>
        </div>

        {/* Uptime */}
        <div
          className="rounded-xl border p-3.5 relative overflow-hidden"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: theme.accentHex, opacity: 0.4 }} />
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={12} style={{ color: theme.accentHex }} />
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Uptime</span>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-xl font-bold text-[var(--text-primary)]">
              {uptimePct !== null ? `${uptimePct}%` : '--'}
            </span>
            {isLiveUptime && (
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> live
              </span>
            )}
          </div>
        </div>

        {/* Feedback Score */}
        <div
          className="rounded-xl border p-3.5 relative overflow-hidden"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: theme.accentHex, opacity: 0.25 }} />
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} style={{ color: theme.accentHex }} />
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Satisfaction</span>
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">
            {feedback?.score !== null && feedback?.score !== undefined ? `${feedback.score}%` : '--'}
          </span>
        </div>
      </div>

      {/* Message Activity Chart */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} style={{ color: theme.accentHex }} />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Message Activity</h3>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Last 7 days</span>
        </div>

        {analyticsLoading ? (
          <div className="flex items-end gap-1.5 h-36">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-[var(--bg-card)] animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
                <div className="w-8 h-2 rounded bg-[var(--bg-card)] animate-pulse" />
              </div>
            ))}
          </div>
        ) : analyticsError ? (
          <div className="h-36 flex items-center justify-center">
            <p className="text-sm text-[var(--text-muted)]">{analyticsError}</p>
          </div>
        ) : analytics ? (
          <>
            {/* Bar Chart */}
            <div className="flex items-end gap-1.5 h-36 mb-1">
              {analytics.messagesPerDay.map((d, i) => {
                const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                const isToday = i === analytics.messagesPerDay.length - 1;
                const isPeak = d.date === analytics.peakDay && d.count > 0;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Count label */}
                    <span className={`text-[10px] font-medium transition-colors`} style={{
                      color: isPeak ? theme.accentHex : undefined,
                    }}>
                      <span className={isPeak ? '' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}>
                        {d.count > 0 ? d.count : ''}
                      </span>
                    </span>
                    {/* Bar */}
                    <div
                      className="w-full rounded-t transition-all duration-300 min-h-[2px]"
                      style={{
                        height: `${Math.max(heightPct, d.count > 0 ? 4 : 1)}%`,
                        background: isToday
                          ? theme.accentHex
                          : isPeak
                          ? `${theme.accentHex}cc`
                          : `${theme.accentHex}66`,
                        opacity: !isToday && !isPeak ? 0.8 : 1,
                      }}
                    />
                    {/* Date label */}
                    <div className="flex flex-col items-center">
                      <span className={`text-[9px] ${isToday ? 'font-medium' : 'text-[var(--text-muted)]'}`} style={isToday ? { color: theme.accentHex } : {}}>
                        {isToday ? 'Today' : formatWeekday(d.date)}
                      </span>
                      <span className="text-[8px] text-[var(--text-muted)]/60">
                        {formatChartDate(d.date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[var(--border-default)]">
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${theme.accentHex}15` }}>
                  <Hash size={13} style={{ color: theme.accentHex }} />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Total</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{analytics.totalMessages.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${theme.accentHex}15` }}>
                  <TrendingUp size={13} style={{ color: theme.accentHex }} />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Avg/Day</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{analytics.avgPerDay}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${theme.accentHex}15` }}>
                  <Calendar size={13} style={{ color: theme.accentHex }} />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Peak</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {analytics.peakDay ? formatChartDate(analytics.peakDay) : '--'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* User Feedback */}
      {feedback && feedback.total > 0 && (
        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare size={18} style={{ color: theme.accentHex }} />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">User Feedback</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10">
                <ThumbsUp size={13} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Positive</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{feedback.upCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10">
                <ThumbsDown size={13} className="text-red-400" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Negative</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{feedback.downCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${theme.accentHex}15` }}>
                <TrendingUp size={13} style={{ color: theme.accentHex }} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Score</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{feedback.score !== null ? `${feedback.score}%` : '--'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Info */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} style={{ color: theme.accentHex }} />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Agent Info</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Created</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {agent ? new Date(agent.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '--'}
            </p>
          </div>
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="absolute bottom-0 left-0 w-full h-[2px]" style={{ background: theme.accentHex, opacity: 0.4 }} />
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Framework</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium capitalize" style={{ color: theme.accentHex }}>{agent?.framework ?? '--'}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${fwBadge}`}>
                {framework}
              </span>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Instance ID</p>
            <p className="text-sm font-medium text-[var(--text-primary)] font-mono">
              {stats?.containerId ? stats.containerId.substring(0, 12) + '...' : 'Not running'}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Status</p>
            {(() => {
              const currentStatus = stats?.status ?? agent?.status ?? 'paused';
              const si = STATUS_STYLES[currentStatus] ?? STATUS_STYLES.paused;
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${si.classes}`}>
                  {si.pulse && (
                    <span className={`w-1.5 h-1.5 rounded-full ${si.dotColor} animate-pulse`} />
                  )}
                  {si.label}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} style={{ color: theme.accentHex }} />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Activity Summary</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="absolute top-0 left-0 h-full w-[2px]" style={{ background: theme.accentHex }} />
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Messages</p>
            {(analytics?.totalMessages ?? stats?.messagesProcessed ?? 0) > 0 ? (
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{(analytics?.totalMessages ?? stats?.messagesProcessed ?? 0).toLocaleString()}</p>
                {trendData && (
                  <TrendArrow current={trendData.recentTotal} previous={trendData.prevTotal} />
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] mt-1">No messages yet</p>
            )}
          </div>
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="absolute top-0 left-0 h-full w-[2px]" style={{ background: theme.accentHex, opacity: 0.6 }} />
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Uptime</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {displayUptime < 60
                ? `${displayUptime}s`
                : displayUptime < 3600
                ? `${Math.floor(displayUptime / 60)}m ${displayUptime % 60}s`
                : displayUptime < 86400
                ? `${Math.floor(displayUptime / 3600)}h ${Math.floor((displayUptime % 3600) / 60)}m`
                : `${Math.floor(displayUptime / 86400)}d ${Math.floor((displayUptime % 86400) / 3600)}h`}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {isLiveUptime ? 'Live' : 'Since creation'}
              {uptimePct !== null && ` \u00b7 ${uptimePct}% uptime`}
            </p>
          </div>
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="absolute top-0 left-0 h-full w-[2px]" style={{ background: theme.accentHex, opacity: 0.35 }} />
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Last Active</p>
            {stats?.lastActiveAt ? (
              <p className="text-2xl font-bold text-[var(--text-primary)]">{timeAgo(stats.lastActiveAt)}</p>
            ) : (
              <p className="text-sm text-[var(--text-muted)] mt-1">Not yet active</p>
            )}
          </div>
        </div>
      </div>

      {/* LLM Configuration */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={18} style={{ color: theme.accentHex }} />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">AI Model</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Provider</p>
            <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
              {hasApiKey ? (currentProviderMeta?.name ?? llmProvider) : 'Hatcher Platform'}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Model</p>
            <p className="text-sm font-medium text-[var(--text-primary)] font-mono">
              {(() => {
                if (!hasApiKey) return 'Platform Default';
                const cfg = (agent?.config ?? {}) as Record<string, unknown>;
                const byok = cfg.byok as Record<string, unknown> | undefined;
                return (byok?.model as string) ?? (cfg.model as string) ?? 'Default';
              })()}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Mode</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              hasApiKey
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : `border`
            }`} style={!hasApiKey ? { background: `${theme.accentHex}15`, color: theme.accentHex, borderColor: `${theme.accentHex}33` } : {}}>
              {hasApiKey ? (
                <><Shield size={12} /> Your Own Key</>
              ) : (
                <><Zap size={12} /> Hatcher Platform</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Your Plan */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} style={{ color: theme.accentHex }} />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Your Plan</h3>
        </div>
        {(() => {
          const tierNames: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business' };
          const tierName = tierNames[tierKey] ?? 'Free';
          const isPaid = tierKey !== 'free';

          const features = [
            { label: 'Messages', value: tierKey === 'business' ? '500/day' : tierKey === 'pro' ? '200/day' : tierKey === 'starter' ? '50/day' : '10/day' },
            { label: 'Resources', value: tierKey === 'business' ? '2 CPU, 3GB RAM' : tierKey === 'pro' ? '1.5 CPU, 2GB RAM' : tierKey === 'starter' ? '1 CPU, 1.5GB RAM' : '0.5 CPU, 1GB RAM' },
            { label: 'Auto-sleep', value: tierKey === 'business' ? 'Always-on' : tierKey === 'pro' ? 'Always-on' : tierKey === 'starter' ? '2 hours idle' : '10 min idle' },
            { label: 'File Manager', value: tierKey === 'business' ? 'Included' : tierKey === 'pro' ? 'Add-on ($4.99)' : 'Not available' },
            { label: 'Integrations', value: 'All included' },
          ];

          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--bg-card)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isPaid ? `${theme.accentHex}20` : 'rgba(255,255,255,0.06)' }}>
                  <Shield size={16} style={{ color: isPaid ? theme.accentHex : 'var(--text-muted)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{tierName} Tier</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{tierKey === 'free' ? 'No charge' : tierKey === 'starter' ? '$4.99/mo' : tierKey === 'pro' ? '$14.99/mo' : '$39.99/mo'}</p>
                </div>
              </div>
              {features.map((f) => (
                <div key={f.label} className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-[var(--text-muted)]">{f.label}</span>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">{f.value}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
}
