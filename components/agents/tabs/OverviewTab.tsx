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
  Play,
  Square,
  RotateCcw,
  Wrench,
  Tag,
  PlusCircle,
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
        className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Technical Details
      </button>
      {open && (
        <div className="grid sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-[var(--border-default)]">
          <div>
            <span className="text-xs block mb-1 text-[var(--text-muted)]">API Endpoint</span>
            <span className="text-sm font-mono text-[var(--text-primary)]">{chatEndpoint ?? 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs block mb-1 text-[var(--text-muted)]">Port</span>
            <span className="text-sm font-mono text-[var(--text-primary)]">{port ?? 'N/A'}</span>
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
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {value.toFixed(1)}{unit} / {max.toFixed(0)}{unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
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
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
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
          <Heart size={14} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Health & Performance</h3>
          {data && (
            <ResourceAlertBadge
              cpuPercent={data.resources.cpuPercent}
              memPercent={data.resources.memoryLimitMb > 0 ? (data.resources.memoryUsageMb / data.resources.memoryLimitMb) * 100 : 0}
            />
          )}
        </div>
        <button
          onClick={() => { setLoading(true); fetchMonitoring(); }}
          className="text-[11px] px-2 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={10} />
          Refresh
        </button>
      </div>

      {/* Top row: health, uptime, restarts, errors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {/* Health */}
        <div className={`rounded-xl px-3 py-2.5 ${healthConfig.bg} border border-[var(--border-default)]`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${healthConfig.dot} ${data.health === 'healthy' && isActive ? 'animate-pulse' : ''}`} />
            <span className={`text-sm font-semibold ${healthConfig.text}`}>{healthConfig.label}</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Container Health</div>
        </div>

        {/* Uptime */}
        <div className="rounded-xl px-3 py-2.5 bg-blue-500/10 border border-[var(--border-default)]">
          <div className="text-sm font-semibold text-blue-400 mb-1 tabular-nums">
            {data.uptime.seconds > 0 ? formatUptime(data.uptime.seconds) : '--'}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Uptime</div>
        </div>

        {/* Restarts */}
        <div className={`rounded-xl px-3 py-2.5 border border-[var(--border-default)] ${data.restarts > 0 ? 'bg-amber-500/10' : 'bg-[var(--bg-card)]'}`}>
          <div className="flex items-center gap-1.5">
            <RefreshCw size={12} className={data.restarts > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]'} />
            <span className={`text-sm font-semibold tabular-nums ${data.restarts > 0 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
              {data.restarts}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Restarts</div>
        </div>

        {/* Errors */}
        <div className={`rounded-xl px-3 py-2.5 border border-[var(--border-default)] ${data.errors.last24h > 0 ? 'bg-red-500/10' : 'bg-[var(--bg-card)]'}`}>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className={data.errors.last24h > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'} />
            <span className={`text-sm font-semibold tabular-nums ${data.errors.last24h > 0 ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
              {data.errors.last24h}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Errors (24h)</div>
        </div>
      </div>

      {/* Resource usage bars */}
      <div className="space-y-3 mb-5">
        <ResourceBar
          label="CPU Usage"
          value={data.resources.cpuPercent}
          max={100}
          unit="%"
          color="bg-[var(--color-accent)]"
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
        <div className="border-t border-[var(--border-default)] pt-3">
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-[var(--color-accent)]" />
            <span className="text-xs text-[var(--text-muted)]">Response Times</span>
            <span className="text-[10px] text-[var(--text-muted)] ml-auto">Tracking coming soon</span>
          </div>
        </div>
      )}

      {/* Last error preview */}
      {data.errors.lastError && (
        <div className="border-t border-[var(--border-default)] pt-3 mt-3">
          <div className="text-[10px] text-red-400 mb-1">Last Error</div>
          <div className="text-xs text-[var(--text-secondary)] font-mono bg-red-500/5 rounded-lg px-3 py-2 border border-red-500/10 truncate">
            {data.errors.lastError}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Activity event type ───────────────────────────────────────
type ActivityEventType = 'started' | 'stopped' | 'restarted' | 'config_updated' | 'error' | 'message_burst' | 'version_deployed' | 'created';

interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  message: string;
  timestamp: string;
}

const ACTIVITY_ICON: Record<ActivityEventType, React.ElementType> = {
  started: Play,
  stopped: Square,
  restarted: RotateCcw,
  config_updated: Wrench,
  error: AlertTriangle,
  message_burst: MessageSquare,
  version_deployed: Tag,
  created: PlusCircle,
};

const ACTIVITY_COLOR: Record<ActivityEventType, string> = {
  started: 'text-emerald-400 bg-emerald-500/15',
  stopped: 'text-amber-400 bg-amber-500/15',
  restarted: 'text-blue-400 bg-blue-500/15',
  config_updated: 'text-[var(--color-accent)] bg-[var(--color-accent)]/15',
  error: 'text-red-400 bg-red-500/15',
  message_burst: 'text-purple-400 bg-purple-500/15',
  version_deployed: 'text-[var(--color-accent)] bg-[var(--color-accent)]/15',
  created: 'text-emerald-400 bg-emerald-500/15',
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Activity Feed section ─────────────────────────────────────
function ActivityFeedSection({ agentId, agent }: { agentId: string; agent: import('@/lib/api').Agent }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.getAgentActivity(agentId);
      if (res.success && res.data.events?.length > 0) {
        setEvents(res.data.events.slice(0, 20));
        setLoading(false);
        return;
      }
    } catch {
      // fall through to derived events
    }
    // Derive events from available data when backend isn't ready
    const derived: ActivityEvent[] = [];
    const now = new Date();

    if (agent.createdAt) {
      derived.push({
        id: 'created',
        type: 'created',
        message: `Agent "${agent.name}" created`,
        timestamp: agent.createdAt,
      });
    }

    if (agent.updatedAt && agent.updatedAt !== agent.createdAt) {
      derived.push({
        id: 'updated',
        type: 'config_updated',
        message: 'Configuration updated',
        timestamp: agent.updatedAt,
      });
    }

    const statusMap: Record<string, ActivityEventType> = {
      active: 'started',
      paused: 'stopped',
      sleeping: 'stopped',
      error: 'error',
      restarting: 'restarted',
    };
    if (agent.status && statusMap[agent.status]) {
      derived.push({
        id: 'status',
        type: statusMap[agent.status],
        message: `Agent is ${agent.status}`,
        timestamp: new Date(now.getTime() - 2 * 60000).toISOString(),
      });
    }

    derived.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(derived);
    setLoading(false);
  }, [agentId, agent]);

  useEffect(() => {
    fetchActivity();
    intervalRef.current = setInterval(fetchActivity, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchActivity]);

  return (
    <GlassCard className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Activity</h3>
          <span className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded-full">
            Last 24h
          </span>
        </div>
        <button
          onClick={() => { setLoading(true); fetchActivity(); }}
          className="text-[11px] px-2 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={10} />
          Refresh
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <Activity size={22} className="text-[var(--text-muted)] mb-2" />
            <p className="text-xs text-[var(--text-muted)]">No recent activity</p>
          </div>
        ) : (
          <div className="relative px-4 py-3">
            {/* Timeline line */}
            <div className="absolute left-[28px] top-3 bottom-3 w-px bg-[var(--bg-card)]" />
            <div className="space-y-3">
              {events.map((event, i) => {
                const Icon = ACTIVITY_ICON[event.type] ?? Activity;
                const colorClass = ACTIVITY_COLOR[event.type] ?? 'text-[var(--text-secondary)] bg-white/10';
                const [iconText, iconBg] = colorClass.split(' ');
                return (
                  <motion.div
                    key={event.id}
                    className="flex items-start gap-3 relative"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 z-10 ${iconBg}`}>
                      <Icon size={13} className={iconText} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{event.message}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{relativeTime(event.timestamp)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ─── Framework capability constants ──────────────────────────
const FRAMEWORK_CAPABILITIES: Record<string, string[]> = {
  openclaw: ['Web Search', 'Browser', 'Memory', 'File Mgmt', 'Cron Jobs', 'Sub-agents', 'Voice/TTS', '20+ Platforms', '3200+ Skills'],
  hermes: ['Persistent Memory', 'Multi-Provider LLM', '40+ Tools', 'Voice', 'Learning Agent', 'Research Mode'],
  elizaos: ['Character Personas', 'Plugin System', 'Social Media Native', 'Image Gen', 'Blockchain', 'Multi-Client'],
  milady: ['Personality Presets', 'Lightweight (120MB)', 'Fast Start (800ms)', 'Privacy-First', 'Cultural Awareness'],
};

const FRAMEWORK_CAP_STYLE: Record<string, string> = {
  openclaw: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  hermes: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  elizaos: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  milady: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const FRAMEWORK_STAT_COLOR: Record<string, string> = {
  openclaw: 'text-amber-400',
  hermes: 'text-purple-400',
  elizaos: 'text-cyan-400',
  milady: 'text-rose-400',
};

const FRAMEWORK_STATS: Record<string, { label: string; value: string }[]> = {
  openclaw: [
    { label: 'Startup Time', value: '~4s' },
    { label: 'Memory', value: '~380MB' },
    { label: 'Platforms', value: '20+' },
  ],
  hermes: [
    { label: 'Startup Time', value: '~3s' },
    { label: 'Memory', value: '~290MB' },
    { label: 'Platforms', value: '8' },
  ],
  elizaos: [
    { label: 'Startup Time', value: '~2s' },
    { label: 'Memory', value: '~250MB' },
    { label: 'Platforms', value: '10+' },
  ],
  milady: [
    { label: 'Startup Time', value: '~800ms' },
    { label: 'Memory', value: '~120MB' },
    { label: 'Platforms', value: '7' },
  ],
};

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
      {/* Stats moved to Usage tab — Overview focuses on capabilities and activity */}

      {/* Health & Performance Monitoring */}
      <HealthPerformanceSection agentId={agent.id} isActive={isActive} />

      {/* Activity Feed */}
      <ActivityFeedSection agentId={agent.id} agent={agent} />

      {/* Framework Capabilities */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Framework Capabilities</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${FRAMEWORK_BADGE[agent.framework] ?? 'bg-[var(--bg-card)] text-white/60 border-white/10'}`}>
            {frameworkMeta?.name ?? agent.framework}
          </span>
        </div>

        {/* Capability badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(FRAMEWORK_CAPABILITIES[agent.framework] ?? []).map((cap) => (
            <span
              key={cap}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${FRAMEWORK_CAP_STYLE[agent.framework] ?? 'bg-[var(--bg-card)] text-white/60 border-white/10'}`}
            >
              {cap}
            </span>
          ))}
        </div>

        {/* Framework stats */}
        <div className="grid grid-cols-3 gap-3">
          {(FRAMEWORK_STATS[agent.framework] ?? []).map((stat) => (
            <div key={stat.label} className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
              <div className={`text-sm font-semibold tabular-nums ${FRAMEWORK_STAT_COLOR[agent.framework] ?? 'text-white'}`}>
                {stat.value}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Agent info */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-4 text-[var(--text-secondary)]">
          Agent Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs block mb-1 text-[var(--text-muted)]">Framework</span>
            <span className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border ${FRAMEWORK_BADGE[agent.framework] ?? ''}`}>
              {frameworkMeta?.name ?? agent.framework}
            </span>
          </div>
          <div>
            <span className="text-xs block mb-1 text-[var(--text-muted)]">Runtime</span>
            <span className="text-sm text-[var(--text-primary)]">
              {frameworkMeta?.dockerImage ?? 'N/A'}
            </span>
          </div>
          {frameworkMeta?.bestFor && (
            <div className="sm:col-span-2">
              <span className="text-xs block mb-1 text-[var(--text-muted)]">Best For</span>
              <span className="text-sm text-[var(--text-secondary)]">
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
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <ScrollText size={14} className="text-[var(--color-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Live Logs</h3>
            {isActive && (
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <button
            onClick={() => setTab('logs')}
            className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
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
              <p className="text-sm text-[var(--text-muted)]">No logs available yet.</p>
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
                <span className={`truncate ${LOG_LEVEL_COLORS[log.level] ?? 'text-[var(--text-secondary)]'}`}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Quick action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setTab('chat')}
          className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all duration-200 text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center group-hover/btn:bg-[var(--color-accent)]/15 transition-colors">
            <MessageSquare size={16} className="text-[var(--color-accent)]" />
          </div>
          Chat
        </button>
        <button
          onClick={() => setTab('logs')}
          className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all duration-200 text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center group-hover/btn:bg-[var(--color-accent)]/15 transition-colors">
            <ScrollText size={16} className="text-[var(--color-accent)]" />
          </div>
          Full Logs
        </button>
        <button
          onClick={() => setTab('config')}
          className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all duration-200 text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center group-hover/btn:bg-[var(--color-accent)]/15 transition-colors">
            <Settings size={16} className="text-[var(--color-accent)]" />
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
      className={`group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-200 text-sm bg-[var(--bg-elevated)] ${
        published
          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
          : error
          ? 'border-red-500/30 bg-red-500/5 text-red-400'
          : 'border-[var(--border-default)] hover:border-purple-500/30 hover:bg-purple-500/5 text-[var(--text-secondary)]'
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
