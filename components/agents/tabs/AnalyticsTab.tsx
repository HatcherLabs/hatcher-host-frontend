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
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext } from '../AgentContext';

interface AnalyticsData {
  messagesPerDay: Array<{ date: string; count: number }>;
  totalMessages: number;
  avgPerDay: number;
  peakDay: string | null;
  framework: string;
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function AnalyticsTab() {
  const { agent } = useAgentContext();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentAnalytics(agent.id);
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
  }, [agent?.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxCount = analytics ? Math.max(...analytics.messagesPerDay.map(d => d.count), 1) : 1;
  const today = new Date().toISOString().slice(0, 10);

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
          <span className="text-[10px] text-[#71717a] uppercase tracking-wider">Last 7 days</span>
        </div>

        {loading ? (
          <div className="flex items-end gap-1.5 h-36">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-white/[0.04] animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
                <div className="w-8 h-2 rounded bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="h-36 flex items-center justify-center">
            <p className="text-sm text-[#6B6890]">{error}</p>
          </div>
        ) : analytics ? (
          <>
            <div className="flex items-end gap-1.5 h-36 mb-1">
              {analytics.messagesPerDay.map((d, i) => {
                const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                const isToday = i === analytics.messagesPerDay.length - 1;
                const isPeak = d.date === analytics.peakDay && d.count > 0;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1730] border border-white/10 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap z-10 pointer-events-none">
                      {formatChartDate(d.date)}: {d.count} messages
                    </div>
                    <span className={`text-[10px] font-medium transition-colors ${isPeak ? 'text-[#06b6d4]' : 'text-[#71717a] group-hover:text-[#A5A1C2]'}`}>
                      {d.count > 0 ? d.count : ''}
                    </span>
                    <div
                      className="w-full rounded-t transition-all duration-300 min-h-[2px]"
                      style={{
                        height: `${Math.max(heightPct, d.count > 0 ? 4 : 1)}%`,
                        background: isToday ? '#06b6d4' : isPeak ? 'rgba(6,182,212,0.8)' : 'rgba(6,182,212,0.4)',
                      }}
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

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/[0.04]">
              {[
                { icon: Hash, label: 'Total', value: analytics.totalMessages.toLocaleString() },
                { icon: TrendingUp, label: 'Avg/Day', value: String(analytics.avgPerDay) },
                { icon: Calendar, label: 'Peak', value: analytics.peakDay ? formatChartDate(analytics.peakDay) : '--' },
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

      {/* Today's activity */}
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
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">7-Day Total</p>
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
