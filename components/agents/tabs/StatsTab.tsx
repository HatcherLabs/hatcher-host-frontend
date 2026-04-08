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
  Key,
  Shield,
  Cpu,
  HardDrive,
  MemoryStick,
  CheckCircle2,
  XCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Infinity as InfinityIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, FRAMEWORK_BADGE } from '../AgentContext';
import { useAuth } from '@/lib/auth-context';

// ─── Types ─────────────────────────────────────────────────────

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

interface UsageData {
  messages: {
    today: number;
    limit: number;
    isByok: boolean;
    chart: Array<{ date: string; count: number }>;
  };
  uptime: {
    seconds: number;
    since: string | null;
    percent: number;
    daysActive: number;
    status: string;
  };
  resources: {
    cpuPercent: number;
    memoryUsageMb: number;
    memoryLimitMb: number;
    cpuLimit: number;
  };
  storage: {
    usedMb: number;
    limitMb: number;
  };
}

interface MonitoringData {
  health: 'healthy' | 'unhealthy' | 'stopped';
  uptime: { seconds: number; since: string | null };
  restarts: number;
  resources: { cpuPercent: number; memoryUsageMb: number; memoryLimitMb: number };
  responseTimes: { avg: number; p95: number; last: number };
  errors: { last24h: number; lastError: string | null };
  history: Array<{ ts: number; cpu: number; mem: number }>;
}

// ─── Framework themes ──────────────────────────────────────────

const FRAMEWORK_THEME: Record<string, { primary: string; primaryDim: string; primaryBg: string; gradient: string; gradientDim: string; label: string }> = {
  openclaw: { primary: '#f59e0b', primaryDim: 'rgba(245,158,11,0.4)', primaryBg: 'rgba(245,158,11,0.1)', gradient: 'linear-gradient(90deg, #f59e0b, #d97706)', gradientDim: 'linear-gradient(90deg, #d97706, #b45309)', label: 'OpenClaw' },
  hermes: { primary: '#a855f7', primaryDim: 'rgba(168,85,247,0.4)', primaryBg: 'rgba(168,85,247,0.1)', gradient: 'linear-gradient(90deg, #8b5cf6, #a855f7)', gradientDim: 'linear-gradient(90deg, #7c3aed, #6d28d9)', label: 'Hermes' },
  elizaos: { primary: 'var(--color-accent)', primaryDim: 'rgba(6,182,212,0.4)', primaryBg: 'rgba(6,182,212,0.1)', gradient: 'linear-gradient(90deg, var(--color-accent), #0891b2)', gradientDim: 'linear-gradient(90deg, #0891b2, #0e7490)', label: 'ElizaOS' },
  milady: { primary: '#f43f5e', primaryDim: 'rgba(244,63,94,0.4)', primaryBg: 'rgba(244,63,94,0.1)', gradient: 'linear-gradient(90deg, #f43f5e, #e11d48)', gradientDim: 'linear-gradient(90deg, #e11d48, #be123c)', label: 'Milady' },
};

const DEFAULT_THEME = FRAMEWORK_THEME.elizaos;

const FRAMEWORK_TIPS: Record<string, string> = {
  openclaw: 'OpenClaw agents benefit from tracking tool usage patterns. Watch token output — high output suggests verbose tool responses you can optimize.',
  hermes: 'Hermes agents are conversation-heavy. Monitor messages/day and token costs closely, especially if using paid LLM providers.',
  elizaos: 'ElizaOS agents run multi-platform. Compare activity across time ranges to identify peak engagement windows.',
  milady: 'Milady agents are personality-driven. High message counts with low token usage indicate efficient, character-consistent responses.',
};

const FRAMEWORK_CONTEXT: Record<string, { text: string; accent: string; accentBg: string; accentBorder: string }> = {
  openclaw: { text: 'Each message sent to the agent counts toward your daily limit, regardless of channel. BYOK users have unlimited messages.', accent: 'text-amber-400', accentBg: 'bg-amber-500/[0.06]', accentBorder: 'border-amber-500/20' },
  hermes: { text: 'Each message sent to the agent counts toward your daily limit, regardless of channel. BYOK users have unlimited messages.', accent: 'text-purple-400', accentBg: 'bg-purple-500/[0.06]', accentBorder: 'border-purple-500/20' },
  elizaos: { text: 'Each message sent to the agent counts toward your daily limit, regardless of channel. BYOK users have unlimited messages.', accent: 'text-cyan-400', accentBg: 'bg-cyan-500/[0.06]', accentBorder: 'border-cyan-500/20' },
  milady: { text: 'Each message sent to the agent counts toward your daily limit, regardless of channel. BYOK users have unlimited messages.', accent: 'text-rose-400', accentBg: 'bg-rose-500/[0.06]', accentBorder: 'border-rose-500/20' },
};

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  starter: { label: 'Starter', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  pro: { label: 'Pro', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  business: { label: 'Business', className: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
  founding_member: { label: 'Founding Member', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const HEALTH_STYLES: Record<string, { bg: string; text: string; dot: string; ring: string; label: string }> = {
  healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', ring: 'ring-emerald-400/30', label: 'Healthy' },
  unhealthy: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', ring: 'ring-amber-400/30', label: 'Unhealthy' },
  stopped: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-500', ring: 'ring-zinc-500/30', label: 'Stopped' },
};

const FRAMEWORK_COLORS: Record<string, { hex: string; hexLight: string; border: string; text: string }> = {
  openclaw: { hex: '#f59e0b', hexLight: '#fbbf24', border: 'border-amber-500/20', text: 'text-amber-400' },
  hermes: { hex: '#a855f7', hexLight: '#c084fc', border: 'border-purple-500/20', text: 'text-purple-400' },
  elizaos: { hex: 'var(--color-accent)', hexLight: '#22d3ee', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  milady: { hex: '#f43f5e', hexLight: '#fb7185', border: 'border-rose-500/20', text: 'text-rose-400' },
};

const RANGES: { value: Range; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

// ─── Utility functions ─────────────────────────────────────────

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

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

// ─── Small UI components ───────────────────────────────────────

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
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium" style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {pct}%
    </span>
  );
}

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

function MessageProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  let barColor = '#22c55e';
  if (pct >= 80) barColor = '#ef4444';
  else if (pct >= 50) barColor = '#f59e0b';
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] text-[var(--text-muted)]">Daily usage</span>
        <span className="text-xs font-medium" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${barColor}cc, ${barColor})` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-[10px] text-[var(--text-muted)]">{used} used</span>
        <span className="text-[10px] text-[var(--text-muted)]">{limit} limit</span>
      </div>
    </div>
  );
}

function StorageProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  let barColor = 'var(--color-accent)';
  if (pct >= 80) barColor = '#ef4444';
  else if (pct >= 50) barColor = '#f59e0b';
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        {label && <span className="text-[11px] text-[var(--text-muted)]">{label}</span>}
        <span className="text-[11px] font-medium text-[var(--text-secondary)] ml-auto">
          {value.toFixed(1)} / {max} MB
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: barColor }}
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accentHex }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accentHex?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-4 relative overflow-hidden"
    >
      {accentHex && (
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${accentHex}80, ${accentHex}20)` }} />
      )}
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color: accentHex || 'var(--text-secondary)' }}>{icon}</div>
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </motion.div>
  );
}

function MiniChart({ data, dataKey, accentHex, height = 80 }: {
  data: Array<{ ts: number; cpu: number; mem: number }>;
  dataKey: 'cpu' | 'mem';
  accentHex: string;
  height?: number;
}) {
  if (!data.length) return <div className="text-zinc-600 text-xs">No data yet</div>;
  const values = data.map(d => d[dataKey]);
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1 || 1)) * 100,
    y: 100 - (v / max) * 100,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;
  // Use a stable gradient ID derived from dataKey only to avoid SSR mismatch
  const gradientId = `stats-mini-grad-${dataKey}`;
  return (
    <div style={{ height }} className="w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentHex} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accentHex} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradientId})`} />
        <path d={pathD} fill="none" stroke={accentHex} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.length > 0 && (
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={accentHex} stroke="#18181b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    </div>
  );
}

function RestartIndicator({ restarts, accentHex }: { restarts: number; accentHex: string }) {
  const isHigh = restarts >= 5;
  const isWarning = restarts >= 3;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 relative overflow-hidden ${isHigh ? 'border-red-500/20 bg-red-500/5' : isWarning ? 'border-amber-500/15 bg-amber-500/5' : 'border-[var(--border-default)] bg-[var(--bg-elevated)]/80'}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: isHigh ? 'linear-gradient(90deg, #ef444480, #ef444420)' : `linear-gradient(90deg, ${accentHex}80, ${accentHex}20)` }} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw size={16} className={isHigh ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-zinc-400'} />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Restarts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${isHigh ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-white'}`}>{restarts}</span>
          {isHigh && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25">
              <AlertTriangle size={10} className="text-red-400" />
              <span className="text-[10px] font-medium text-red-400">HIGH</span>
            </motion.div>
          )}
          {isWarning && !isHigh && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25">
              <AlertTriangle size={10} className="text-amber-400" />
              <span className="text-[10px] font-medium text-amber-400">WARN</span>
            </motion.div>
          )}
        </div>
      </div>
      {isHigh && <p className="text-[10px] text-red-400/70 mt-2">High restart count may indicate a crash loop. Check logs for errors.</p>}
    </motion.div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
      {label}
    </h3>
  );
}

function SectionDivider() {
  return <div className="h-px bg-[var(--border-default)]" />;
}

// ─── Main StatsTab ──────────────────────────────────────────────

export function StatsTab() {
  const { agent, isActive } = useAgentContext();
  const { user } = useAuth();

  const framework = (agent?.framework ?? 'openclaw').toLowerCase();
  const tier = (user as any)?.tier ?? 'free';
  const theme = FRAMEWORK_THEME[framework] ?? DEFAULT_THEME;
  const fwCtx = FRAMEWORK_CONTEXT[framework] ?? FRAMEWORK_CONTEXT.openclaw;
  const fwBadge = FRAMEWORK_BADGE[framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  const tierBadge = TIER_BADGE[tier] ?? TIER_BADGE.free;
  const fwColors = FRAMEWORK_COLORS[framework] ?? FRAMEWORK_COLORS.elizaos;
  const tip = FRAMEWORK_TIPS[framework] ?? FRAMEWORK_TIPS.elizaos;

  // ── Section 1: Messages (Usage) ──────────────────────────────
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!agent?.id) return;
    setUsageLoading(true);
    setUsageError(null);
    try {
      const res = await api.getAgentUsage(agent.id);
      if (res.success) setUsageData(res.data);
      else setUsageError(res.error ?? 'Failed to load usage data');
    } catch {
      setUsageError('Failed to load usage data');
    } finally {
      setUsageLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  // ── Section 2: Performance (Analytics) ──────────────────────
  const [range, setRange] = useState<Range>('7d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [deep, setDeep] = useState<DeepAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [deepLoading, setDeepLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!agent?.id) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await api.getAgentAnalytics(agent.id, range);
      if (res.success) setAnalytics(res.data);
      else setAnalyticsError(res.error ?? 'Failed to load analytics');
    } catch {
      setAnalyticsError('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [agent?.id, range]);

  const fetchDeep = useCallback(async () => {
    if (!agent?.id) return;
    setDeepLoading(true);
    try {
      const res = await api.getAgentDeepAnalytics(agent.id, range);
      if (res.success) setDeep(res.data);
    } catch {
      // Deep analytics is optional — fail silently
    } finally {
      setDeepLoading(false);
    }
  }, [agent?.id, range]);

  useEffect(() => {
    fetchAnalytics();
    fetchDeep();
  }, [fetchAnalytics, fetchDeep]);

  // ── Section 3: Resources (Health / Monitoring) ───────────────
  const [monData, setMonData] = useState<MonitoringData | null>(null);
  const [monLoading, setMonLoading] = useState(true);
  const [monError, setMonError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMonitoring = useCallback(async () => {
    if (!agent?.id) return;
    try {
      const res = await api.getAgentMonitoring(agent.id);
      if ('success' in res && !res.success) {
        setMonError((res as { error: string }).error);
      } else {
        const d = 'data' in res ? res.data : res;
        setMonData(d as MonitoringData);
        setMonError(null);
      }
    } catch (e: any) {
      setMonError(e.message || 'Failed to load health data');
    } finally {
      setMonLoading(false);
      setRefreshing(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 30_000);
    return () => clearInterval(interval);
  }, [fetchMonitoring]);

  const refreshMonitoring = () => {
    setRefreshing(true);
    fetchMonitoring();
  };

  // ── Derived analytics values ─────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const msgTrend = useMemo(() => {
    if (!analytics) return { pct: 0, direction: 'flat' as const };
    return calcTrend(analytics.messagesPerDay);
  }, [analytics]);

  const tokenTrend = useMemo(() => {
    if (!analytics) return { pct: 0, direction: 'flat' as const };
    return calcTrend(analytics.messagesPerDay.map(d => ({ count: d.inputTokens + d.outputTokens })));
  }, [analytics]);

  const chartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.messagesPerDay.map(d => ({
      date: formatChartDate(d.date),
      rawDate: d.date,
      messages: d.count,
      tokens: d.inputTokens + d.outputTokens,
    }));
  }, [analytics]);

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

  const responseTimeData = useMemo(() => {
    if (!analytics || !deep?.dailyResponseTimes) return [];
    return analytics.messagesPerDay.map(d => ({
      date: formatChartDate(d.date),
      avgMs: deep.dailyResponseTimes[d.date] ?? 0,
    })).filter(d => d.avgMs > 0);
  }, [analytics, deep]);

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

  // ── Health derived ───────────────────────────────────────────
  const healthStyle = monData ? (HEALTH_STYLES[monData.health] ?? HEALTH_STYLES.stopped) : HEALTH_STYLES.stopped;
  const memPercent = monData && monData.resources.memoryLimitMb > 0
    ? ((monData.resources.memoryUsageMb / monData.resources.memoryLimitMb) * 100).toFixed(0)
    : '0';

  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-8"
    >

      {/* ════════════════════════════════════════════════════
          SECTION 1 — MESSAGES
      ════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader label="Messages" />

        {usageLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5 animate-pulse" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
                <div className="h-4 w-24 bg-[var(--bg-card)] rounded mb-3" />
                <div className="h-8 w-16 bg-[var(--bg-card)] rounded" />
              </div>
            ))}
          </div>
        ) : usageError ? (
          <div className="rounded-2xl border p-8 flex items-center justify-center" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
            <p className="text-sm text-[var(--text-muted)]">{usageError}</p>
          </div>
        ) : usageData ? (
          <div className="space-y-5">
            {/* Framework + Tier context banner */}
            <div className={`rounded-xl border p-4 ${fwCtx.accentBg} ${fwCtx.accentBorder}`}>
              <div className="flex items-start gap-3">
                <Info size={14} className={`${fwCtx.accent} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${fwBadge}`}>
                      {framework.charAt(0).toUpperCase() + framework.slice(1)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${tierBadge.className}`}>
                      <Shield size={8} className="inline mr-0.5 -mt-px" />
                      {tierBadge.label} Tier
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{fwCtx.text}</p>
                </div>
              </div>
            </div>

            {/* Messages Today card */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-[var(--color-accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Messages Today</h3>
                </div>
                <div className="flex items-center gap-2">
                  {usageData.messages.isByok ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-medium">
                      <Key size={10} />
                      BYOK
                      <span className="inline-flex items-center gap-0.5 ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider">
                        <InfinityIcon size={9} />
                        Unlimited
                      </span>
                    </span>
                  ) : (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${tierBadge.className}`}>
                      {tierBadge.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-3xl font-bold text-[var(--text-primary)]">{usageData.messages.today}</span>
                {!usageData.messages.isByok && usageData.messages.limit > 0 && (
                  <span className="text-base text-[var(--text-muted)] mb-1">/ {usageData.messages.limit} daily</span>
                )}
                {usageData.messages.isByok && (
                  <span className="text-base text-emerald-400/60 mb-1">messages sent</span>
                )}
              </div>
              {usageData.messages.isByok ? (
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3 flex items-center gap-3">
                  <div className="h-2.5 flex-1 rounded-full bg-[var(--bg-card)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #22c55e40, #22c55e80, #22c55e40)' }}
                    />
                  </div>
                  <span className="text-[10px] text-emerald-400/80 whitespace-nowrap">No daily cap</span>
                </div>
              ) : usageData.messages.limit > 0 ? (
                <MessageProgressBar used={usageData.messages.today} limit={usageData.messages.limit} />
              ) : null}
            </div>

            {/* Message Activity chart removed — data available in KPI summary */}
          </div>
        ) : null}
      </div>

      <SectionDivider />

      {/* ════════════════════════════════════════════════════
          SECTION 2 — PERFORMANCE
      ════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader label="Performance" />

        <div className="space-y-6">
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

          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Hash, label: 'Total Messages', value: analytics ? analytics.totalMessages.toLocaleString() : '--', trend: analytics ? msgTrend : null, color: undefined as string | undefined },
              { icon: TrendingUp, label: 'Avg / Day', value: analytics ? String(analytics.avgPerDay) : '--', trend: null, color: undefined },
              { icon: Clock, label: 'Avg Response', value: deep ? formatMs(deep.responseTimes.avgMs) : '--', trend: null, color: undefined },
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

          {/* Charts removed — KPI summary row above has the key metrics */}

          {/* Reliability (only when errors exist) */}
          {deep && deep.errorRate.total > 0 && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle size={18} style={{ color: deep.errorRate.rate > 5 ? '#ef4444' : theme.primary }} />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Reliability</h3>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
                  <span>Successful ({deep.errorRate.successful.toLocaleString()})</span>
                  <span>Failed ({deep.errorRate.errors.toLocaleString()})</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg-card)]">
                  <div className="transition-all rounded-l-full" style={{ width: `${deep.errorRate.total > 0 ? ((deep.errorRate.successful / deep.errorRate.total) * 100) : 100}%`, background: '#22c55e' }} />
                  {deep.errorRate.errors > 0 && (
                    <div className="transition-all rounded-r-full" style={{ width: `${(deep.errorRate.errors / deep.errorRate.total) * 100}%`, background: '#ef4444' }} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { icon: CheckCircle, label: 'Success', value: `${(100 - deep.errorRate.rate).toFixed(1)}%`, bg: 'bg-emerald-500/10', hex: '#22c55e' },
                  { icon: AlertTriangle, label: 'Error Rate', value: `${deep.errorRate.rate.toFixed(1)}%`, bg: 'bg-red-500/10', hex: '#ef4444' },
                  { icon: MessageSquare, label: 'Total', value: deep.errorRate.total.toLocaleString(), bg: theme.primaryBg, hex: theme.primary },
                ].map(({ icon: Icon, label, value, bg, hex }) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
                      <Icon size={13} style={{ color: hex }} />
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

          {/* Token Usage (only when tokens > 0) */}
          {analytics && analytics.tokens.totalTokens > 0 && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-5">
                <Zap size={16} style={{ color: theme.primary }} />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Token Usage</h3>
                {tokenTrend.direction !== 'flat' && <TrendBadge pct={tokenTrend.pct} direction={tokenTrend.direction} />}
                <span className="ml-auto text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  {analytics.tokens.hasByok ? 'BYOK' : 'Hatcher Key'}
                </span>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
                  <span>Input ({formatTokens(analytics.tokens.inputTokens)})</span>
                  <span>Output ({formatTokens(analytics.tokens.outputTokens)})</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden">
                  <div className="transition-all" style={{ width: `${(analytics.tokens.inputTokens / analytics.tokens.totalTokens) * 100}%`, background: theme.gradient }} />
                  <div className="transition-all" style={{ width: `${(analytics.tokens.outputTokens / analytics.tokens.totalTokens) * 100}%`, background: theme.gradientDim, opacity: 0.6 }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { icon: Activity, label: 'Input', value: formatTokens(analytics.tokens.inputTokens), color: theme.primary, dim: false },
                  { icon: Activity, label: 'Output', value: formatTokens(analytics.tokens.outputTokens), color: theme.primary, dim: true },
                  { icon: DollarSign, label: 'Est. Cost', value: analytics.tokens.hasByok ? 'Your key' : `$${analytics.tokens.totalCost.toFixed(4)}`, color: 'var(--text-muted)', dim: false },
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

          {/* Account-wide link */}
          <Link
            href="/dashboard/analytics"
            className="flex items-center justify-between rounded-xl border border-[var(--border-default)] px-5 py-4 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/10 transition-colors group"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <span>View account-wide analytics</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      <SectionDivider />

      {/* ════════════════════════════════════════════════════
          SECTION 3 — RESOURCES
      ════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader label="Resources" />

        {monLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-zinc-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-40 bg-zinc-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : monError ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <AlertTriangle size={32} className="mb-3 text-amber-400" />
            <p className="text-sm">{monError}</p>
            <button onClick={refreshMonitoring} className="mt-3 text-xs text-purple-400 hover:underline">Try again</button>
          </div>
        ) : monData ? (
          <div className="space-y-6">
            {/* Health Status Badge + Refresh button */}
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${healthStyle.bg} ring-1 ${healthStyle.ring}`}
              >
                <div className="relative">
                  <div className={`w-3.5 h-3.5 rounded-full ${healthStyle.dot}`} />
                  {monData.health === 'healthy' && (
                    <div className={`absolute inset-0 w-3.5 h-3.5 rounded-full ${healthStyle.dot} animate-ping opacity-40`} />
                  )}
                  {monData.health === 'unhealthy' && (
                    <div className={`absolute inset-0 w-3.5 h-3.5 rounded-full ${healthStyle.dot} animate-pulse opacity-50`} />
                  )}
                </div>
                <div>
                  <span className={`text-sm font-semibold ${healthStyle.text}`}>{healthStyle.label}</span>
                  {monData.uptime.since && (
                    <p className="text-[10px] text-zinc-500">
                      Since {new Date(monData.uptime.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </motion.div>
              <button
                onClick={refreshMonitoring}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {/* Stat cards: Uptime, CPU, Memory */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={<Clock size={16} />} label="Uptime" value={formatUptime(monData.uptime.seconds)} accentHex={fwColors.hex} />
              <StatCard icon={<Cpu size={16} />} label="CPU" value={`${monData.resources.cpuPercent.toFixed(1)}%`} accentHex={fwColors.hex} />
              <StatCard icon={<MemoryStick size={16} />} label="Memory" value={`${monData.resources.memoryUsageMb.toFixed(0)} MB`} sub={`${memPercent}% of ${monData.resources.memoryLimitMb} MB`} accentHex={fwColors.hex} />
            </div>

            {/* CPU + Memory history charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={`rounded-xl border ${fwColors.border} bg-[var(--bg-elevated)]/80 p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">CPU History</span>
                  <span className={`text-xs ${fwColors.text}`}>{monData.resources.cpuPercent.toFixed(1)}%</span>
                </div>
                <MiniChart data={monData.history} dataKey="cpu" accentHex={fwColors.hex} height={80} />
              </div>
              <div className={`rounded-xl border ${fwColors.border} bg-[var(--bg-elevated)]/80 p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Memory History</span>
                  <span className={`text-xs ${fwColors.text}`}>{memPercent}%</span>
                </div>
                <MiniChart data={monData.history} dataKey="mem" accentHex={fwColors.hexLight} height={80} />
              </div>
            </div>

            {/* Storage (from usage data — shown in Resources to avoid section duplication) */}
            {usageData && (
              <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <HardDrive size={16} className="text-[var(--color-accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Storage</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">{usageData.storage.usedMb.toFixed(1)}</span>
                    <span className="text-sm text-[var(--text-muted)] mb-0.5">/ {usageData.storage.limitMb} MB</span>
                  </div>
                  <StorageProgressBar value={usageData.storage.usedMb} max={usageData.storage.limitMb} label="MB used" />
                  {usageData.storage.usedMb === 0 && !isActive && (
                    <p className="text-[11px] text-[var(--text-muted)]">Start agent to measure storage</p>
                  )}
                </div>
              </div>
            )}

            {/* Restart indicator */}
            <RestartIndicator restarts={monData.restarts} accentHex={fwColors.hex} />

            {/* Errors (24h) */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-zinc-400" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Errors (24h)</span>
              </div>
              {monData.errors.last24h === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span className="text-sm">No errors in the last 24 hours</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <XCircle size={16} />
                    <span className="text-sm font-medium">{monData.errors.last24h} error{monData.errors.last24h > 1 ? 's' : ''}</span>
                  </div>
                  {monData.errors.lastError && (
                    <p className="text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-card)] rounded-lg px-3 py-2 overflow-x-auto">{monData.errors.lastError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Response Times — shown in stat cards above */}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
