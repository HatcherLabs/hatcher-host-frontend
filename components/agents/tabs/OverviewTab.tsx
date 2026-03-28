'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Clock,
  Cpu,
  Activity,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronUp,
  Heart,
  AlertTriangle,
  RefreshCw,
  Zap,
  Store,
  Loader2,
  Check,
} from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import { timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import { ResourceChart, ResourceAlertBadge } from '@/components/agents/ResourceChart';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
  FRAMEWORK_BADGE,
  LOG_LEVEL_COLORS,
} from '../AgentContext';

function TechnicalDetails({ chatEndpoint, port }: { chatEndpoint?: string; port?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-[#71717a] hover:text-[#A5A1C2] transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Technical Details
      </button>
      {open && (
        <div className="grid sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/[0.04]">
          <div>
            <span className="text-xs block mb-1 text-[#71717a]">API Endpoint</span>
            <span className="text-sm font-mono text-[#FFFFFF]">{chatEndpoint ?? 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs block mb-1 text-[#71717a]">Port</span>
            <span className="text-sm font-mono text-[#FFFFFF]">{port ?? 'N/A'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Resource bar component ────────────────────────────────────
function ResourceBar({ label, value, max, unit, color }: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : color;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[#71717a]">{label}</span>
        <span className="text-xs font-mono text-[#A5A1C2]">
          {value.toFixed(1)}{unit} / {max.toFixed(0)}{unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Monitoring data type ──────────────────────────────────────
interface MonitoringData {
  health: 'healthy' | 'unhealthy' | 'stopped';
  uptime: { seconds: number; since: string | null };
  restarts: number;
  resources: { cpuPercent: number; memoryUsageMb: number; memoryLimitMb: number };
  responseTimes: { avg: number; p95: number; last: number };
  errors: { last24h: number; lastError: string | null };
  history: Array<{ ts: number; cpu: number; mem: number }>;
}

// ─── Health & Performance section ──────────────────────────────
function HealthPerformanceSection({ agentId, isActive }: { agentId: string; isActive: boolean }) {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMonitoring = useCallback(async () => {
    try {
      const res = await api.getAgentMonitoring(agentId);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    } catch {
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchMonitoring();

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(fetchMonitoring, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMonitoring]);

  // Pause auto-refresh when tab is not visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      } else {
        fetchMonitoring();
        intervalRef.current = setInterval(fetchMonitoring, 30_000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchMonitoring]);

  if (loading) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (error && !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[#71717a]">
          <AlertTriangle size={14} className="text-amber-400" />
          Monitoring unavailable
        </div>
      </GlassCard>
    );
  }

  if (!data) return null;

  const healthConfig = {
    healthy: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Healthy', bg: 'bg-emerald-500/10' },
    unhealthy: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Degraded', bg: 'bg-amber-500/10' },
    stopped: { dot: 'bg-red-400', text: 'text-red-400', label: 'Down', bg: 'bg-red-500/10' },
  }[data.health];

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart size={14} className="text-[#06b6d4]" />
          <h3 className="text-sm font-semibold text-[#A5A1C2]">Health & Performance</h3>
          {data && (
            <ResourceAlertBadge
              cpuPercent={data.resources.cpuPercent}
              memPercent={data.resources.memoryLimitMb > 0 ? (data.resources.memoryUsageMb / data.resources.memoryLimitMb) * 100 : 0}
            />
          )}
        </div>
        <button
          onClick={() => { setLoading(true); fetchMonitoring(); }}
          className="text-[11px] px-2 py-1 rounded-lg border border-white/10 hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/5 transition-all text-[#71717a] hover:text-[#A5A1C2] flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={10} />
          Refresh
        </button>
      </div>

      {/* Top row: health, uptime, restarts, errors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {/* Health */}
        <div className={`rounded-xl px-3 py-2.5 ${healthConfig.bg} border border-white/[0.04]`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${healthConfig.dot} ${data.health === 'healthy' && isActive ? 'animate-pulse' : ''}`} />
            <span className={`text-sm font-semibold ${healthConfig.text}`}>{healthConfig.label}</span>
          </div>
          <div className="text-[10px] text-[#71717a]">Container Health</div>
        </div>

        {/* Uptime */}
        <div className="rounded-xl px-3 py-2.5 bg-blue-500/10 border border-white/[0.04]">
          <div className="text-sm font-semibold text-blue-400 mb-1 tabular-nums">
            {data.uptime.seconds > 0 ? formatUptime(data.uptime.seconds) : '--'}
          </div>
          <div className="text-[10px] text-[#71717a]">Uptime</div>
        </div>

        {/* Restarts */}
        <div className={`rounded-xl px-3 py-2.5 border border-white/[0.04] ${data.restarts > 0 ? 'bg-amber-500/10' : 'bg-white/[0.03]'}`}>
          <div className="flex items-center gap-1.5">
            <RefreshCw size={12} className={data.restarts > 0 ? 'text-amber-400' : 'text-[#71717a]'} />
            <span className={`text-sm font-semibold tabular-nums ${data.restarts > 0 ? 'text-amber-400' : 'text-[#FFFFFF]'}`}>
              {data.restarts}
            </span>
          </div>
          <div className="text-[10px] text-[#71717a] mt-1">Restarts</div>
        </div>

        {/* Errors */}
        <div className={`rounded-xl px-3 py-2.5 border border-white/[0.04] ${data.errors.last24h > 0 ? 'bg-red-500/10' : 'bg-white/[0.03]'}`}>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className={data.errors.last24h > 0 ? 'text-red-400' : 'text-[#71717a]'} />
            <span className={`text-sm font-semibold tabular-nums ${data.errors.last24h > 0 ? 'text-red-400' : 'text-[#FFFFFF]'}`}>
              {data.errors.last24h}
            </span>
          </div>
          <div className="text-[10px] text-[#71717a] mt-1">Errors (24h)</div>
        </div>
      </div>

      {/* Resource usage bars */}
      <div className="space-y-3 mb-5">
        <ResourceBar
          label="CPU Usage"
          value={data.resources.cpuPercent}
          max={100}
          unit="%"
          color="bg-[#06b6d4]"
        />
        <ResourceBar
          label="Memory"
          value={data.resources.memoryUsageMb}
          max={data.resources.memoryLimitMb}
          unit="MB"
          color="bg-blue-500"
        />
      </div>

      {/* Historical sparkline charts */}
      <ResourceChart
        history={data.history ?? []}
        currentCpu={data.resources.cpuPercent}
        currentMem={data.resources.memoryUsageMb}
        memLimitMb={data.resources.memoryLimitMb}
      />

      {/* Response times — hidden until actual duration tracking is implemented */}
      {(data.responseTimes.avg > 0 || data.responseTimes.last > 0) && (
        <div className="border-t border-white/[0.04] pt-3">
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-[#06b6d4]" />
            <span className="text-xs text-[#71717a]">Response Times</span>
            <span className="text-[10px] text-[#71717a] ml-auto">Tracking coming soon</span>
          </div>
        </div>
      )}

      {/* Last error preview */}
      {data.errors.lastError && (
        <div className="border-t border-white/[0.04] pt-3 mt-3">
          <div className="text-[10px] text-red-400 mb-1">Last Error</div>
          <div className="text-xs text-[#A5A1C2] font-mono bg-red-500/5 rounded-lg px-3 py-2 border border-red-500/10 truncate">
            {data.errors.lastError}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export function OverviewTab() {
  const ctx = useAgentContext();
  const {
    agent,
    stats,
    isActive,
    statusInfo,
    llmProvider,
    hasApiKey,
    displayUptime,
    isLiveUptime,
    logs,
    logsLoading,
    setTab,
  } = ctx;

  const frameworkMeta = FRAMEWORKS[agent.framework];

  return (
    <motion.div key="tab-overview" className="space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#06b6d4]/15 flex items-center justify-center">
              <MessageSquare size={18} className="text-[#06b6d4]" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-[#FFFFFF] tabular-nums">
                {stats?.messagesProcessed ?? 0}
              </div>
              <div className="text-xs text-[#71717a]">Messages</div>
              <div className="text-[10px] text-[#6B6890] mt-0.5">Total</div>
            </div>
            {/* Mini bar chart indicator */}
            <div className="flex items-end gap-[2px] h-5 self-end">
              {[0.4, 0.6, 0.3, 0.8, 0.5, 0.9, 0.7].map((h, i) => (
                <div key={i} className="w-[2px] rounded-full bg-[#06b6d4]/30" style={{ height: `${h * 20}px` }} />
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Clock size={18} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-[#FFFFFF] tabular-nums">
                {displayUptime < 3600
                  ? `${Math.floor(displayUptime / 60)}m`
                  : `${(displayUptime / 3600).toFixed(1)}h`}
              </div>
              <div className="text-xs text-[#71717a]">Uptime</div>
              <div className="text-[10px] text-[#6B6890] mt-0.5">{isLiveUptime ? 'Live' : 'Since creation'}</div>
            </div>
            {/* Uptime ring */}
            <svg width="28" height="28" viewBox="0 0 28 28" className="progress-ring self-end">
              <circle cx="14" cy="14" r="10" className="progress-ring-bg" strokeWidth="2.5" />
              <circle
                cx="14" cy="14" r="10"
                className="progress-ring-fill"
                strokeWidth="2.5"
                stroke="#60a5fa"
                strokeDasharray={`${Math.min(displayUptime / 86400, 1) * 62.8} 62.8`}
              />
            </svg>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Cpu size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold truncate text-[#FFFFFF]">
                {llmProvider}
              </div>
              <div className="text-xs text-[#71717a]">LLM Provider</div>
            </div>
            {hasApiKey && (
              <div className="self-end">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Own Key</span>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isActive ? 'bg-emerald-500/15' : 'bg-amber-500/15'
            }`}>
              <Activity size={18} className={isActive ? 'text-emerald-400' : 'text-amber-400'} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 text-lg font-bold ${
                  isActive ? 'text-emerald-400' : 'text-[#FFFFFF]'
                }`}>
                  {isActive && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                  )}
                  {statusInfo.label}
                </span>
              </div>
              <div className="text-xs text-[#71717a]">Status</div>
            </div>
            {stats?.lastActiveAt && (
              <div className="self-end text-[9px] text-[#71717a]">
                {timeAgo(stats.lastActiveAt)}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Health & Performance Monitoring */}
      <HealthPerformanceSection agentId={agent.id} isActive={isActive} />

      {/* Agent info */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-4 text-[#A5A1C2]">
          Agent Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs block mb-1 text-[#71717a]">Framework</span>
            <span className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border ${FRAMEWORK_BADGE[agent.framework] ?? ''}`}>
              {frameworkMeta?.name ?? agent.framework}
            </span>
          </div>
          <div>
            <span className="text-xs block mb-1 text-[#71717a]">Runtime</span>
            <span className="text-sm text-[#FFFFFF]">
              {frameworkMeta?.dockerImage ?? 'N/A'}
            </span>
          </div>
          {frameworkMeta?.bestFor && (
            <div className="sm:col-span-2">
              <span className="text-xs block mb-1 text-[#71717a]">Best For</span>
              <span className="text-sm text-[#A5A1C2]">
                {frameworkMeta.bestFor}
              </span>
            </div>
          )}

          {/* Collapsible technical details */}
          <div className="sm:col-span-2">
            <TechnicalDetails
              chatEndpoint={frameworkMeta?.chatEndpoint}
              port={frameworkMeta?.port}
            />
          </div>
        </div>
      </GlassCard>

      {/* Live logs preview */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <ScrollText size={14} className="text-[#06b6d4]" />
            <h3 className="text-sm font-semibold text-[#A5A1C2]">Live Logs</h3>
            {isActive && (
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <button
            onClick={() => setTab('logs')}
            className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/5 transition-all text-[#71717a] hover:text-[#A5A1C2] cursor-pointer"
          >
            View All
          </button>
        </div>
        <div className="log-viewer max-h-56 overflow-y-auto py-1">
          {logsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#71717a]">No logs available yet.</p>
            </div>
          ) : (
            logs.slice(-10).map((log, i) => (
              <div key={i} className={`log-line log-line-${log.level}`}>
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`log-badge log-badge-${log.level}`}>
                  {log.level}
                </span>
                <span className={`truncate ${LOG_LEVEL_COLORS[log.level] ?? 'text-[#A5A1C2]'}`}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Quick action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setTab('chat')}
          className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.06] hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/5 transition-all duration-200 text-sm text-[#A5A1C2] bg-[rgba(26,23,48,0.6)] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#06b6d4]/10 flex items-center justify-center group-hover/btn:bg-[#06b6d4]/15 transition-colors">
            <MessageSquare size={16} className="text-[#06b6d4]" />
          </div>
          Chat
        </button>
        <button
          onClick={() => setTab('logs')}
          className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.06] hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/5 transition-all duration-200 text-sm text-[#A5A1C2] bg-[rgba(26,23,48,0.6)] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#06b6d4]/10 flex items-center justify-center group-hover/btn:bg-[#06b6d4]/15 transition-colors">
            <ScrollText size={16} className="text-[#06b6d4]" />
          </div>
          Full Logs
        </button>
        <button
          onClick={() => setTab('config')}
          className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.06] hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/5 transition-all duration-200 text-sm text-[#A5A1C2] bg-[rgba(26,23,48,0.6)] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#06b6d4]/10 flex items-center justify-center group-hover/btn:bg-[#06b6d4]/15 transition-colors">
            <Settings size={16} className="text-[#06b6d4]" />
          </div>
          Configure
        </button>
        <PublishToMarketplaceButton agentId={agent.id} />
      </div>
    </motion.div>
  );
}

// ── Publish to Marketplace Button ────────────────────────────
function PublishToMarketplaceButton({ agentId }: { agentId: string }) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await api.publishToMarketplace(agentId);
      if (res.success) {
        setPublished(true);
        setTimeout(() => setPublished(false), 3000);
      } else {
        setError('error' in res ? res.error : 'Failed to publish');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setError('Network error');
      setTimeout(() => setError(null), 3000);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <button
      onClick={handlePublish}
      disabled={publishing || published}
      className={`group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-200 text-sm bg-[rgba(26,23,48,0.6)] ${
        published
          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
          : error
          ? 'border-red-500/30 bg-red-500/5 text-red-400'
          : 'border-white/[0.06] hover:border-purple-500/30 hover:bg-purple-500/5 text-[#A5A1C2]'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
        published
          ? 'bg-emerald-500/15'
          : 'bg-purple-500/10 group-hover/btn:bg-purple-500/15'
      }`}>
        {publishing ? (
          <Loader2 size={16} className="text-purple-400 animate-spin" />
        ) : published ? (
          <Check size={16} className="text-emerald-400" />
        ) : (
          <Store size={16} className="text-purple-400" />
        )}
      </div>
      {publishing ? 'Publishing...' : published ? 'Published!' : error ? error : 'Publish'}
    </button>
  );
}
