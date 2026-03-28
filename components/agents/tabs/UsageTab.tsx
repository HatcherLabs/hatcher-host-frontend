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
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext } from '../AgentContext';

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

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  label?: string;
}

function ProgressBar({ value, max, color = '#06b6d4', label }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isHigh = pct > 80;
  const barColor = isHigh ? '#f59e0b' : color;

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

export function UsageTab() {
  const { agent } = useAgentContext();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          {/* ── Messages Today ── */}
          <div className="rounded-2xl border p-5" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#06b6d4]" />
                <h3 className="text-sm font-semibold text-[#fafafa]">Messages Today</h3>
              </div>
              {data.messages.isByok && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                  <Infinity size={10} />
                  BYOK — Unlimited
                </span>
              )}
            </div>

            <div className="flex items-end gap-3 mb-4">
              <span className="text-3xl font-bold text-[#fafafa]">{data.messages.today}</span>
              {!data.messages.isByok && data.messages.limit > 0 && (
                <span className="text-base text-[#71717a] mb-1">/ {data.messages.limit} daily</span>
              )}
            </div>

            {!data.messages.isByok && data.messages.limit > 0 && (
              <ProgressBar
                value={data.messages.today}
                max={data.messages.limit}
                label="Daily limit"
              />
            )}
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
