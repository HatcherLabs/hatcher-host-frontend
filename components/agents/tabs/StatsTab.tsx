'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Calendar,
  Hash,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  useAgentContext,
  STATUS_STYLES,
} from '../AgentContext';

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

  const maxCount = analytics
    ? Math.max(...analytics.messagesPerDay.map(d => d.count), 1)
    : 1;

  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Message Activity Chart */}
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#f97316]" />
            <h3 className="text-base font-semibold text-[#fafafa]">Message Activity</h3>
          </div>
          <span className="text-[10px] text-[#71717a] uppercase tracking-wider">Last 7 days</span>
        </div>

        {analyticsLoading ? (
          <div className="flex items-end gap-1.5 h-36">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-white/[0.04] animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
                <div className="w-8 h-2 rounded bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        ) : analyticsError ? (
          <div className="h-36 flex items-center justify-center">
            <p className="text-sm text-[#6B6890]">{analyticsError}</p>
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
                    <span className={`text-[10px] font-medium transition-colors ${
                      isPeak ? 'text-[#f97316]' : 'text-[#71717a] group-hover:text-[#A5A1C2]'
                    }`}>
                      {d.count > 0 ? d.count : ''}
                    </span>
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t transition-all duration-300 min-h-[2px] ${
                        isToday
                          ? 'bg-[#f97316]'
                          : isPeak
                          ? 'bg-[#f97316]/80'
                          : 'bg-[#f97316]/40 group-hover:bg-[#f97316]/60'
                      }`}
                      style={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 1)}%` }}
                    />
                    {/* Date label */}
                    <div className="flex flex-col items-center">
                      <span className={`text-[9px] ${isToday ? 'text-[#f97316] font-medium' : 'text-[#71717a]'}`}>
                        {isToday ? 'Today' : formatWeekday(d.date)}
                      </span>
                      <span className="text-[8px] text-[#71717a]/60">
                        {formatChartDate(d.date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#f97316]/10">
                  <Hash size={13} className="text-[#f97316]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#71717a] uppercase tracking-wider">Total</p>
                  <p className="text-sm font-bold text-[#fafafa]">{analytics.totalMessages.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#f97316]/10">
                  <TrendingUp size={13} className="text-[#f97316]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#71717a] uppercase tracking-wider">Avg/Day</p>
                  <p className="text-sm font-bold text-[#fafafa]">{analytics.avgPerDay}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#f97316]/10">
                  <Calendar size={13} className="text-[#f97316]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#71717a] uppercase tracking-wider">Peak</p>
                  <p className="text-sm font-bold text-[#fafafa]">
                    {analytics.peakDay ? formatChartDate(analytics.peakDay) : '--'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Agent Info */}
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-[#f97316]" />
          <h3 className="text-base font-semibold text-[#fafafa]">Agent Info</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Created</p>
            <p className="text-sm font-medium text-[#fafafa]">
              {agent ? new Date(agent.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '--'}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Framework</p>
            <p className="text-sm font-medium text-[#f97316] capitalize">{agent?.framework ?? '--'}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Instance ID</p>
            <p className="text-sm font-medium text-[#fafafa] font-mono">
              {stats?.containerId ? stats.containerId.substring(0, 12) + '...' : 'Not running'}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Status</p>
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
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-[#f97316]" />
          <h3 className="text-base font-semibold text-[#fafafa]">Activity Summary</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Messages</p>
            {stats?.messagesProcessed && stats.messagesProcessed > 0 ? (
              <p className="text-2xl font-bold text-[#fafafa]">{stats.messagesProcessed.toLocaleString()}</p>
            ) : (
              <p className="text-sm text-[#6B6890] mt-1">No messages yet</p>
            )}
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Uptime</p>
            <p className="text-2xl font-bold text-[#fafafa]">
              {displayUptime < 60
                ? `${displayUptime}s`
                : displayUptime < 3600
                ? `${Math.floor(displayUptime / 60)}m ${displayUptime % 60}s`
                : displayUptime < 86400
                ? `${Math.floor(displayUptime / 3600)}h ${Math.floor((displayUptime % 3600) / 60)}m`
                : `${Math.floor(displayUptime / 86400)}d ${Math.floor((displayUptime % 86400) / 3600)}h`}
            </p>
            <p className="text-[10px] text-[#6B6890] mt-1">{isLiveUptime ? 'Live' : 'Since creation'}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Last Active</p>
            {stats?.lastActiveAt ? (
              <p className="text-2xl font-bold text-[#fafafa]">{timeAgo(stats.lastActiveAt)}</p>
            ) : (
              <p className="text-sm text-[#6B6890] mt-1">Not yet active</p>
            )}
          </div>
        </div>
      </div>

      {/* LLM Configuration */}
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={18} className="text-[#f97316]" />
          <h3 className="text-base font-semibold text-[#fafafa]">AI Model</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Provider</p>
            <p className="text-sm font-medium text-[#fafafa] capitalize">
              {hasApiKey ? (currentProviderMeta?.name ?? llmProvider) : 'Hatcher Platform'}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Model</p>
            <p className="text-sm font-medium text-[#fafafa] font-mono">
              {(() => {
                if (!hasApiKey) return 'Platform Default';
                const cfg = (agent?.config ?? {}) as Record<string, unknown>;
                const byok = cfg.byok as Record<string, unknown> | undefined;
                return (byok?.model as string) ?? (cfg.model as string) ?? 'Default';
              })()}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Mode</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              hasApiKey
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20'
            }`}>
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
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[#f97316]" />
          <h3 className="text-base font-semibold text-[#fafafa]">Your Plan</h3>
        </div>
        {(() => {
          // Import tier info from auth context
          // tierKey from component scope
          const tierNames: Record<string, string> = { free: 'Free', basic: 'Basic', pro: 'Pro' };
          const tierName = tierNames[tierKey] ?? 'Free';
          const isPaid = tierKey !== 'free';

          const features = [
            { label: 'Messages', value: tierKey === 'pro' ? '300/day' : tierKey === 'basic' ? '100/day' : '20/day' },
            { label: 'Resources', value: tierKey === 'pro' ? '2 CPU, 2GB RAM' : tierKey === 'basic' ? '1 CPU, 1.5GB RAM' : '0.5 CPU, 1GB RAM' },
            { label: 'Auto-sleep', value: tierKey === 'pro' ? 'Always-on' : tierKey === 'basic' ? '6 hours idle' : '15 min idle' },
            { label: 'File Manager', value: tierKey === 'pro' ? 'Included' : 'Add-on ($9.99)' },
            { label: 'Integrations', value: 'All included' },
          ];

          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaid ? 'bg-[#f97316]/15' : 'bg-white/[0.06]'}`}>
                  <Shield size={16} className={isPaid ? 'text-[#f97316]' : 'text-[#71717a]'} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{tierName} Tier</p>
                  <p className="text-[10px] text-[#71717a]">{tierKey === 'free' ? 'No charge' : tierKey === 'basic' ? '$9.99/mo' : '$19.99/mo'}</p>
                </div>
              </div>
              {features.map((f) => (
                <div key={f.label} className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-[#71717a]">{f.label}</span>
                  <span className="text-xs font-medium text-[#A5A1C2]">{f.value}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
}
