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
const FRAMEWORK_CONTEXT: Record<string, { text: string; accent: string; accentBg: string; accentBorder: string }> = {
  openclaw: {
    text: 'OpenClaw agents use Groq for LLM inference. Messages are counted per 24h rolling window. Tools like web search, memory, and file operations do not count toward your message limit.',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/[0.06]',
    accentBorder: 'border-amber-500/20',
  },
  hermes: {
    text: 'Hermes agents use Groq for LLM inference. Each conversation turn counts as one message. Plugin calls (Twitter, Discord) are bundled with the triggering message.',
    accent: 'text-purple-400',
    accentBg: 'bg-purple-500/[0.06]',
    accentBorder: 'border-purple-500/20',
  },
  elizaos: {
    text: 'ElizaOS agents use Groq for LLM inference. Plugins may consume additional resources and memory. Each plugin interaction counts as one message toward your daily limit.',
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/[0.06]',
    accentBorder: 'border-cyan-500/20',
  },
  milady: {
    text: 'Milady agents use Groq for LLM inference. Multi-modal interactions (image generation, voice) consume more resources but each still counts as a single message.',
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
  basic: {
    label: 'Basic',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  pro: {
    label: 'Pro',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
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
        {label && <span className="text-[11px] text-[#71717a]">{label}</span>}
        <span className="text-[11px] font-medium text-[#A5A1C2] ml-auto">
          {value.toFixed(1)} / {max} {label?.includes('MB') ? 'MB' : '%'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
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
        <span className="text-[11px] text-[#71717a]">Daily usage</span>
        <span className="text-xs font-medium" style={{ color: barColor }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className={`h-2.5 rounded-full bg-white/[0.06] overflow-hidden ${bgGlow}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${barColor}cc, ${barColor})` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-[10px] text-[#71717a]">{used} used</span>
        <span className="text-[10px] text-[#71717a]">{limit} limit</span>
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
            <div key={i} className="rounded-2xl border p-5 animate-pulse" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
              <div className="h-4 w-24 bg-white/[0.06] rounded mb-3" />
              <div className="h-8 w-16 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border p-8 flex items-center justify-center" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
          <p className="text-sm text-[#6B6890]">{error}</p>
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
                <p className={`text-[11px] leading-relaxed text-[#A5A1C2]`}>
                  {fwCtx.text}
                </p>
              </div>
            </div>
          </div>

          {/* ── Messages Today ── */}
          <div className="rounded-2xl border p-5" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[#fafafa]">Messages Today</h3>
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
              <span className="text-3xl font-bold text-[#fafafa]">{data.messages.today}</span>
              {!data.messages.isByok && data.messages.limit > 0 && (
                <span className="text-base text-[#71717a] mb-1">/ {data.messages.limit} daily</span>
              )}
              {data.messages.isByok && (
                <span className="text-base text-emerald-400/60 mb-1">messages sent</span>
              )}
            </div>

            {data.messages.isByok ? (
              /* BYOK — show unlimited indicator instead of progress bar */
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3 flex items-center gap-3">
                <div className="h-2.5 flex-1 rounded-full bg-white/[0.04] overflow-hidden">
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
          <div className="rounded-2xl border p-5" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[#fafafa]">Message Activity</h3>
              </div>
              <span className="text-[10px] text-[#71717a] uppercase tracking-wider">Last 7 days</span>
            </div>

            <div className="flex items-end gap-1.5 h-28 mb-1">
              {data.messages.chart.map((d, i) => {
                const heightPct = maxChartCount > 0 ? (d.count / maxChartCount) * 100 : 0;
                const isToday = i === data.messages.chart.length - 1;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <span className={`text-[10px] font-medium transition-colors ${isToday ? 'text-[#06b6d4]' : 'text-[#71717a] group-hover:text-[#A5A1C2]'}`}>
                      {d.count > 0 ? d.count : ''}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all duration-300 min-h-[2px] ${
                        isToday ? 'bg-[#06b6d4]' : 'bg-[#06b6d4]/40 group-hover:bg-[#06b6d4]/60'
                      }`}
                      style={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 1)}%` }}
                    />
                    <div className="flex flex-col items-center">
                      <span className={`text-[9px] ${isToday ? 'text-[#06b6d4] font-medium' : 'text-[#71717a]'}`}>
                        {isToday ? 'Today' : formatWeekday(d.date)}
                      </span>
                      <span className="text-[8px] text-[#71717a]/60">{formatChartDate(d.date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Bottom Row: Uptime + Resources + Storage ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Uptime */}
            <div className="rounded-2xl border p-5" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[#fafafa]">Uptime</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold text-[#fafafa]">
                    {data.uptime.seconds > 0 ? formatUptime(data.uptime.seconds) : '—'}
                  </p>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    {data.uptime.since
                      ? `Since ${new Date(data.uptime.since).toLocaleString()}`
                      : data.uptime.status === 'sleeping' ? 'Agent sleeping' : 'Agent not running'}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#71717a]">Reliability</span>
                    <span className="text-[11px] font-medium text-emerald-400">{data.uptime.percent}%</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-[#71717a]">Days active</span>
                    <span className="text-[11px] font-medium text-[#A5A1C2]">{data.uptime.daysActive}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CPU & Memory */}
            <div className="rounded-2xl border p-5" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[#fafafa]">Resources</h3>
              </div>
              {data.uptime.status === 'active' ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Activity size={12} className="text-[#71717a]" />
                      <span className="text-[11px] text-[#71717a]">CPU</span>
                      <span className="text-[11px] font-medium text-[#A5A1C2] ml-auto">{data.resources.cpuPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, data.resources.cpuPercent)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full bg-[#06b6d4]"
                      />
                    </div>
                    <p className="text-[10px] text-[#71717a] mt-1">Limit: {data.resources.cpuLimit} vCPU</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap size={12} className="text-[#71717a]" />
                      <span className="text-[11px] text-[#71717a]">Memory</span>
                      <span className="text-[11px] font-medium text-[#A5A1C2] ml-auto">
                        {data.resources.memoryUsageMb.toFixed(0)} / {data.resources.memoryLimitMb} MB
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
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
                <p className="text-sm text-[#6B6890]">Agent not running</p>
              )}
            </div>

            {/* Storage */}
            <div className="rounded-2xl border p-5" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
              <div className="flex items-center gap-2 mb-4">
                <HardDrive size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[#fafafa]">Storage</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-[#fafafa]">{data.storage.usedMb.toFixed(1)}</span>
                  <span className="text-sm text-[#71717a] mb-0.5">/ {data.storage.limitMb} MB</span>
                </div>
                <ProgressBar
                  value={data.storage.usedMb}
                  max={data.storage.limitMb}
                  label="MB used"
                />
                {data.storage.usedMb === 0 && data.uptime.status !== 'active' && (
                  <p className="text-[11px] text-[#71717a]">Start agent to measure storage</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
