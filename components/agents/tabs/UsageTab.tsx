'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Activity,
  Cpu,
  HardDrive,
  Zap,
  Clock,
  TrendingUp,
  Infinity,
  Info,
  Key,
  Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, FRAMEWORK_BADGE } from '../AgentContext';
import { useAuth } from '@/lib/auth-context';

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

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Framework context banners ── */
const USAGE_DESCRIPTION = 'Each message you send to the agent counts toward your daily limit, regardless of channel (web chat, Telegram, Discord, etc.). BYOK users have unlimited messages.';

const FRAMEWORK_CONTEXT: Record<string, { text: string; accent: string; accentBg: string; accentBorder: string }> = {
  openclaw: {
    text: USAGE_DESCRIPTION,
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/[0.06]',
    accentBorder: 'border-amber-500/20',
  },
  hermes: {
    text: USAGE_DESCRIPTION,
    accent: 'text-purple-400',
    accentBg: 'bg-purple-500/[0.06]',
    accentBorder: 'border-purple-500/20',
  },
  elizaos: {
    text: USAGE_DESCRIPTION,
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/[0.06]',
    accentBorder: 'border-cyan-500/20',
  },
  milady: {
    text: USAGE_DESCRIPTION,
    accent: 'text-rose-400',
    accentBg: 'bg-rose-500/[0.06]',
    accentBorder: 'border-rose-500/20',
  },
};

/* ── Tier badge styles ── */
const TIER_BADGE: Record<string, { label: string; className: string }> = {
  free: {
    label: 'Free',
    className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  },
  starter: {
    label: 'Starter',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  pro: {
    label: 'Pro',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  business: {
    label: 'Business',
    className: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  },
  founding_member: {
    label: 'Founding Member',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
};

/* ── Color-coded progress bar ── */
interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  label?: string;
  colorCoded?: boolean;
}

function ProgressBar({ value, max, color = '#06b6d4', label, colorCoded }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  let barColor = color;
  if (colorCoded) {
    if (pct >= 80) barColor = '#ef4444';      // red
    else if (pct >= 50) barColor = '#f59e0b';  // amber
    else barColor = '#22c55e';                 // green
  } else {
    // legacy fallback — amber if high
    if (pct > 80) barColor = '#f59e0b';
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        {label && <span className="text-[11px] text-[var(--text-muted)]">{label}</span>}
        <span className="text-[11px] font-medium text-[var(--text-secondary)] ml-auto">
          {value.toFixed(1)} / {max} {label?.includes('MB') ? 'MB' : '%'}
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

/* ── Message usage progress bar (color-coded) ── */
function MessageProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  let barColor = '#22c55e'; // green
  let bgGlow = 'shadow-green-500/10';
  if (pct >= 80) {
    barColor = '#ef4444'; // red
    bgGlow = 'shadow-red-500/10';
  } else if (pct >= 50) {
    barColor = '#f59e0b'; // amber
    bgGlow = 'shadow-amber-500/10';
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] text-[var(--text-muted)]">Daily usage</span>
        <span className="text-xs font-medium" style={{ color: barColor }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className={`h-2.5 rounded-full bg-[var(--bg-card)] overflow-hidden ${bgGlow}`}>
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

export function UsageTab() {
  const { agent } = useAgentContext();
  const { user } = useAuth();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const framework = agent?.framework ?? 'openclaw';
  const tier = (user as any)?.tier ?? 'free';
  const fwCtx = FRAMEWORK_CONTEXT[framework] ?? FRAMEWORK_CONTEXT.openclaw;
  const fwBadge = FRAMEWORK_BADGE[framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  const tierBadge = TIER_BADGE[tier] ?? TIER_BADGE.free;

  const fetchUsage = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentUsage(agent.id);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error ?? 'Failed to load usage data');
      }
    } catch {
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const maxChartCount = data ? Math.max(...data.messages.chart.map(d => d.count), 1) : 1;

  return (
    <motion.div
      key="usage"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-5"
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 animate-pulse" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <div className="h-4 w-24 bg-[var(--bg-card)] rounded mb-3" />
              <div className="h-8 w-16 bg-[var(--bg-card)] rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border p-8 flex items-center justify-center" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : data ? (
        <>
          {/* ── Framework Context Banner ── */}
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
                <p className={`text-[11px] leading-relaxed text-[var(--text-secondary)]`}>
                  {fwCtx.text}
                </p>
              </div>
            </div>
          </div>

          {/* ── Messages Today ── */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Messages Today</h3>
              </div>
              <div className="flex items-center gap-2">
                {data.messages.isByok ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-medium">
                    <Key size={10} />
                    BYOK
                    <span className="inline-flex items-center gap-0.5 ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider">
                      <Infinity size={9} />
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
              <span className="text-3xl font-bold text-[var(--text-primary)]">{data.messages.today}</span>
              {!data.messages.isByok && data.messages.limit > 0 && (
                <span className="text-base text-[var(--text-muted)] mb-1">/ {data.messages.limit} daily</span>
              )}
              {data.messages.isByok && (
                <span className="text-base text-emerald-400/60 mb-1">messages sent</span>
              )}
            </div>

            {data.messages.isByok ? (
              /* BYOK — show unlimited indicator instead of progress bar */
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
            ) : data.messages.limit > 0 ? (
              /* Standard tier — color-coded progress bar */
              <MessageProgressBar used={data.messages.today} limit={data.messages.limit} />
            ) : null}
          </div>

          {/* ── 7-day Message Chart ── */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Message Activity</h3>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Last 7 days</span>
            </div>

            {(() => {
              const chartData = data.messages.chart;
              const W = 400, H = 120;
              const PAD = { top: 14, right: 8, bottom: 24, left: 28 };
              const cw = W - PAD.left - PAD.right;
              const ch = H - PAD.top - PAD.bottom;
              const max = Math.max(...chartData.map(d => d.count), 1);
              const pts = chartData.map((d, i) => ({
                x: PAD.left + (i / Math.max(chartData.length - 1, 1)) * cw,
                y: PAD.top + ch - (d.count / max) * ch,
                ...d,
              }));
              const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
              const area = `${line} L${pts[pts.length - 1]?.x ?? W},${PAD.top + ch} L${PAD.left},${PAD.top + ch} Z`;
              const yTicks = [0, Math.round(max / 2), max].map(v => ({ v, y: PAD.top + ch - (v / max) * ch }));
              return (
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
                  {yTicks.map(t => (
                    <g key={t.v}><line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="var(--border-default)" strokeWidth="0.5" strokeDasharray="3 3" /><text x={PAD.left - 4} y={t.y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="8">{t.v}</text></g>
                  ))}
                  <defs><linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" /><stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" /></linearGradient></defs>
                  <path d={area} fill="url(#usageGrad)" />
                  <path d={line} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {pts.map((p, i) => (
                    <g key={p.date}>
                      <circle cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.5 : 2} fill={i === pts.length - 1 ? '#06b6d4' : '#06b6d480'} stroke={i === pts.length - 1 ? 'white' : 'none'} strokeWidth="1.5" />
                      <circle cx={p.x} cy={p.y} r="10" fill="transparent"><title>{formatChartDate(p.date)}: {p.count}</title></circle>
                      <text x={p.x} y={H - 4} textAnchor="middle" fill={i === pts.length - 1 ? '#06b6d4' : 'var(--text-muted)'} fontSize="8" fontWeight={i === pts.length - 1 ? '600' : '400'}>{i === pts.length - 1 ? 'Today' : formatWeekday(p.date)}</text>
                    </g>
                  ))}
                </svg>
              );
            })()}
          </div>

          {/* ── Bottom Row: Uptime + Resources + Storage ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Uptime */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Uptime</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {data.uptime.seconds > 0 ? formatUptime(data.uptime.seconds) : '—'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {data.uptime.since
                      ? `Since ${new Date(data.uptime.since).toLocaleString()}`
                      : data.uptime.status === 'sleeping' ? 'Agent sleeping' : 'Agent not running'}
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-default)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-muted)]">Reliability</span>
                    <span className="text-[11px] font-medium text-emerald-400">{data.uptime.percent}%</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-[var(--text-muted)]">Days active</span>
                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">{data.uptime.daysActive}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CPU & Memory */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Resources</h3>
              </div>
              {data.uptime.status === 'active' ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Activity size={12} className="text-[var(--text-muted)]" />
                      <span className="text-[11px] text-[var(--text-muted)]">CPU</span>
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] ml-auto">{data.resources.cpuPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, data.resources.cpuPercent)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full bg-[#06b6d4]"
                      />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Limit: {data.resources.cpuLimit} vCPU</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap size={12} className="text-[var(--text-muted)]" />
                      <span className="text-[11px] text-[var(--text-muted)]">Memory</span>
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] ml-auto">
                        {data.resources.memoryUsageMb.toFixed(0)} / {data.resources.memoryLimitMb} MB
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${data.resources.memoryLimitMb > 0 ? Math.min(100, (data.resources.memoryUsageMb / data.resources.memoryLimitMb) * 100) : 0}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full bg-[#06b6d4]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Agent not running</p>
              )}
            </div>

            {/* Storage */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2 mb-4">
                <HardDrive size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Storage</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">{data.storage.usedMb.toFixed(1)}</span>
                  <span className="text-sm text-[var(--text-muted)] mb-0.5">/ {data.storage.limitMb} MB</span>
                </div>
                <ProgressBar
                  value={data.storage.usedMb}
                  max={data.storage.limitMb}
                  label="MB used"
                />
                {data.storage.usedMb === 0 && data.uptime.status !== 'active' && (
                  <p className="text-[11px] text-[var(--text-muted)]">Start agent to measure storage</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
