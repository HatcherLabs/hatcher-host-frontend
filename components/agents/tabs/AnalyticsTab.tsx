'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Hash,
  ExternalLink,
  Zap,
  DollarSign,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext } from '../AgentContext';

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

export function AnalyticsTab() {
  const { agent } = useAgentContext();
  const [range, setRange] = useState<Range>('7d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Show every Nth x-axis label to avoid crowding on 30d/90d
  const labelStep = range === '90d' ? 10 : range === '30d' ? 5 : 1;

  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Message Activity Chart */}
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#06b6d4]" />
            <h3 className="text-base font-semibold text-[#fafafa]">Message Activity</h3>
          </div>
          {/* Range selector */}
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'rgba(46,43,74,0.5)' }}>
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  range === r.value
                    ? 'bg-[#06b6d4] text-white'
                    : 'text-[#71717a] hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-end gap-0.5 h-36">
            {Array.from({ length: range === '7d' ? 7 : 30 }).map((_, i) => (
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
                        <div className="text-[#a855f7]">{formatTokens(d.inputTokens + d.outputTokens)} tokens</div>
                      )}
                    </div>
                    <div
                      className="w-full rounded-t transition-all duration-300 min-h-[2px]"
                      style={{
                        height: `${Math.max(heightPct, d.count > 0 ? 4 : 1)}%`,
                        background: isToday ? '#06b6d4' : isPeak ? 'rgba(6,182,212,0.75)' : 'rgba(6,182,212,0.4)',
                      }}
                    />
                    {showLabel && (
                      <span className={`text-[8px] leading-none mt-0.5 ${isToday ? 'text-[#06b6d4]' : 'text-[#71717a]/60'}`}>
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
                { icon: Hash, label: 'Total', value: analytics.totalMessages.toLocaleString() },
                { icon: TrendingUp, label: 'Avg/Day', value: String(analytics.avgPerDay) },
                { icon: Calendar, label: 'Peak Day', value: analytics.peakDay ? formatChartDate(analytics.peakDay) : '--' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(46,43,74,0.3)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#06b6d4]/10">
                    <Icon size={13} className="text-[#06b6d4]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#71717a] uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-bold text-[#fafafa]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Token Usage — only shown if there's token data */}
      {analytics && analytics.tokens.totalTokens > 0 && (
        <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Zap size={16} className="text-[#a855f7]" />
            <h3 className="text-sm font-semibold text-[#fafafa]">Token Usage</h3>
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
                  background: 'linear-gradient(90deg, #8b5cf6, #a855f7)',
                }}
              />
              <div
                className="transition-all"
                style={{
                  width: `${(analytics.tokens.outputTokens / analytics.tokens.totalTokens) * 100}%`,
                  background: 'linear-gradient(90deg, #06b6d4, #0891b2)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Activity, label: 'Input', value: formatTokens(analytics.tokens.inputTokens), color: '#a855f7' },
              { icon: Activity, label: 'Output', value: formatTokens(analytics.tokens.outputTokens), color: '#06b6d4' },
              {
                icon: DollarSign,
                label: 'Est. Cost',
                value: analytics.tokens.hasByok ? 'Your key' : `$${analytics.tokens.totalCost.toFixed(4)}`,
                color: '#71717a',
              },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <div>
                  <p className="text-[10px] text-[#71717a] uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold text-[#fafafa]">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today summary */}
      {analytics && (
        <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#06b6d4]" />
            <h3 className="text-sm font-semibold text-[#fafafa]">Today</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">Messages Today</p>
              <p className="text-2xl font-bold text-[#fafafa]">
                {analytics.messagesPerDay.find(d => d.date === today)?.count ?? 0}
              </p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">{analytics.rangeDays}D Total</p>
              <p className="text-2xl font-bold text-[#fafafa]">{analytics.totalMessages.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Link to account analytics */}
      <Link
        href="/dashboard/analytics"
        className="flex items-center justify-between rounded-2xl border px-5 py-4 text-sm text-[#71717a] hover:text-white hover:border-white/10 transition-colors group"
        style={{ borderColor: 'rgba(46,43,74,0.4)' }}
      >
        <span>View account-wide analytics</span>
        <ExternalLink size={14} className="group-hover:text-[#06b6d4] transition-colors" />
      </Link>
    </motion.div>
  );
}
