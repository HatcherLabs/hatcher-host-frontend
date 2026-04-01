'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  HeartPulse,
  Clock,
  Cpu,
  MemoryStick,
  AlertTriangle,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  RotateCcw,
  Server,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, FRAMEWORK_BADGE } from '../AgentContext';

interface MonitoringData {
  health: 'healthy' | 'unhealthy' | 'stopped';
  uptime: { seconds: number; since: string | null };
  restarts: number;
  resources: { cpuPercent: number; memoryUsageMb: number; memoryLimitMb: number };
  responseTimes: { avg: number; p95: number; last: number };
  errors: { last24h: number; lastError: string | null };
  history: Array<{ ts: number; cpu: number; mem: number }>;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ─── Framework theme colors ────────────────────────────────
const FRAMEWORK_COLORS: Record<string, { primary: string; hex: string; hexLight: string; bg: string; border: string; text: string; label: string; runtime: string }> = {
  openclaw: {
    primary: 'amber',
    hex: '#f59e0b',
    hexLight: '#fbbf24',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    label: 'OpenClaw',
    runtime: 'Node.js runtime with npm channel extensions. Monitors HTTP health endpoint and Docker container stats.',
  },
  hermes: {
    primary: 'purple',
    hex: '#a855f7',
    hexLight: '#c084fc',
    bg: 'bg-purple-500/8',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    label: 'Hermes',
    runtime: 'Python runtime with FastAPI. Monitors uvicorn process health and container resource usage.',
  },
  elizaos: {
    primary: 'cyan',
    hex: '#06b6d4',
    hexLight: '#22d3ee',
    bg: 'bg-cyan-500/8',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
    label: 'ElizaOS',
    runtime: 'TypeScript runtime on Bun. Monitors agent process heartbeat and plugin connectivity.',
  },
  milady: {
    primary: 'rose',
    hex: '#f43f5e',
    hexLight: '#fb7185',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
    label: 'Milady',
    runtime: 'ElizaOS-based runtime with 29 connectors. Monitors multi-connector health and memory usage.',
  },
};

const HEALTH_STYLES: Record<string, { bg: string; text: string; dot: string; ring: string; label: string }> = {
  healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', ring: 'ring-emerald-400/30', label: 'Healthy' },
  unhealthy: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', ring: 'ring-amber-400/30', label: 'Unhealthy' },
  stopped: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-500', ring: 'ring-zinc-500/30', label: 'Stopped' },
};

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
      {/* Accent top bar */}
      {accentHex && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${accentHex}80, ${accentHex}20)` }}
        />
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
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * 100;
    const y = 100 - (v / max) * 100;
    return { x, y };
  });

  // Build SVG path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  const gradientId = `grad-${dataKey}-${accentHex.replace('#', '')}`;

  return (
    <div style={{ height }} className="w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentHex} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accentHex} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Gradient fill area */}
        <path d={areaD} fill={`url(#${gradientId})`} />
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={accentHex}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Current value dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="2"
            fill={accentHex}
            stroke="#18181b"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
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
      className={`rounded-xl border p-4 relative overflow-hidden ${
        isHigh
          ? 'border-red-500/20 bg-red-500/5'
          : isWarning
            ? 'border-amber-500/15 bg-amber-500/5'
            : 'border-[var(--border-default)] bg-[var(--bg-elevated)]/80'
      }`}
    >
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: isHigh ? 'linear-gradient(90deg, #ef444480, #ef444420)' : `linear-gradient(90deg, ${accentHex}80, ${accentHex}20)` }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw size={16} className={isHigh ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-zinc-400'} />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Restarts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${isHigh ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-white'}`}>
            {restarts}
          </span>
          {isHigh && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25"
            >
              <AlertTriangle size={10} className="text-red-400" />
              <span className="text-[10px] font-medium text-red-400">HIGH</span>
            </motion.div>
          )}
          {isWarning && !isHigh && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25"
            >
              <AlertTriangle size={10} className="text-amber-400" />
              <span className="text-[10px] font-medium text-amber-400">WARN</span>
            </motion.div>
          )}
        </div>
      </div>
      {isHigh && (
        <p className="text-[10px] text-red-400/70 mt-2">
          High restart count may indicate a crash loop. Check logs for errors.
        </p>
      )}
    </motion.div>
  );
}

export function HealthTab() {
  const { agent } = useAgentContext();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const framework = agent?.framework || 'openclaw';
  const fwColors = FRAMEWORK_COLORS[framework] || FRAMEWORK_COLORS.openclaw;

  const fetchData = useCallback(async () => {
    if (!agent?.id) return;
    try {
      const res = await api.getAgentMonitoring(agent.id);
      if ('success' in res && !res.success) {
        setError((res as { error: string }).error);
      } else {
        const monData = 'data' in res ? res.data : res;
        setData(monData as MonitoringData);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-zinc-800/50 rounded-lg animate-pulse w-48" />
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
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <AlertTriangle size={32} className="mb-3 text-amber-400" />
        <p className="text-sm">{error}</p>
        <button onClick={refresh} className="mt-3 text-xs text-purple-400 hover:underline">Try again</button>
      </div>
    );
  }

  if (!data) return null;

  const style = HEALTH_STYLES[data.health] || HEALTH_STYLES.stopped;
  const memPercent = data.resources.memoryLimitMb > 0
    ? ((data.resources.memoryUsageMb / data.resources.memoryLimitMb) * 100).toFixed(0)
    : '0';

  return (
    <div className="space-y-6">
      {/* Framework Context Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border ${fwColors.border} ${fwColors.bg} px-4 py-3 flex items-start gap-3`}
      >
        <Server size={16} className={`${fwColors.text} mt-0.5 shrink-0`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${fwColors.text}`}>{fwColors.label} Agent</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${FRAMEWORK_BADGE[framework] || ''}`}>
              {framework}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">{fwColors.runtime}</p>
        </div>
      </motion.div>

      {/* Header — Health Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Prominent health status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${style.bg} ring-1 ${style.ring}`}
          >
            <div className="relative">
              <div className={`w-3.5 h-3.5 rounded-full ${style.dot}`} />
              {data.health === 'healthy' && (
                <div className={`absolute inset-0 w-3.5 h-3.5 rounded-full ${style.dot} animate-ping opacity-40`} />
              )}
              {data.health === 'unhealthy' && (
                <div className={`absolute inset-0 w-3.5 h-3.5 rounded-full ${style.dot} animate-pulse opacity-50`} />
              )}
            </div>
            <div>
              <span className={`text-sm font-semibold ${style.text}`}>{style.label}</span>
              {data.uptime.since && (
                <p className="text-[10px] text-zinc-500">
                  Since {new Date(data.uptime.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </motion.div>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock size={16} />}
          label="Uptime"
          value={formatUptime(data.uptime.seconds)}
          accentHex={fwColors.hex}
        />
        <StatCard
          icon={<Zap size={16} />}
          label="Avg Response"
          value={formatMs(data.responseTimes.avg)}
          sub={`P95: ${formatMs(data.responseTimes.p95)}`}
          accentHex={fwColors.hex}
        />
        <StatCard
          icon={<Cpu size={16} />}
          label="CPU"
          value={`${data.resources.cpuPercent.toFixed(1)}%`}
          accentHex={fwColors.hex}
        />
        <StatCard
          icon={<MemoryStick size={16} />}
          label="Memory"
          value={`${data.resources.memoryUsageMb.toFixed(0)} MB`}
          sub={`${memPercent}% of ${data.resources.memoryLimitMb} MB`}
          accentHex={fwColors.hex}
        />
      </div>

      {/* Charts + Restarts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPU History */}
        <div className={`rounded-xl border ${fwColors.border} bg-[var(--bg-elevated)]/80 p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">CPU History</span>
            <span className={`text-xs ${fwColors.text}`}>{data.resources.cpuPercent.toFixed(1)}%</span>
          </div>
          <MiniChart data={data.history} dataKey="cpu" accentHex={fwColors.hex} height={80} />
        </div>

        {/* Memory History */}
        <div className={`rounded-xl border ${fwColors.border} bg-[var(--bg-elevated)]/80 p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Memory History</span>
            <span className={`text-xs ${fwColors.text}`}>{memPercent}%</span>
          </div>
          <MiniChart data={data.history} dataKey="mem" accentHex={fwColors.hexLight} height={80} />
        </div>
      </div>

      {/* Restart Count Indicator */}
      <RestartIndicator restarts={data.restarts} accentHex={fwColors.hex} />

      {/* Errors Section */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-zinc-400" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Errors (24h)</span>
        </div>
        {data.errors.last24h === 0 ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={16} />
            <span className="text-sm">No errors in the last 24 hours</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <XCircle size={16} />
              <span className="text-sm font-medium">{data.errors.last24h} error{data.errors.last24h > 1 ? 's' : ''}</span>
            </div>
            {data.errors.lastError && (
              <p className="text-xs text-zinc-500 font-mono bg-zinc-900 rounded-lg px-3 py-2 overflow-x-auto">
                {data.errors.lastError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Response Time Details */}
      <div className={`rounded-xl border ${fwColors.border} bg-[var(--bg-elevated)]/80 p-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className={fwColors.text} />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Response Times</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Average', value: data.responseTimes.avg },
            { label: 'P95', value: data.responseTimes.p95 },
            { label: 'Last', value: data.responseTimes.last },
          ].map(rt => (
            <div key={rt.label} className="text-center">
              <p className="text-lg font-bold" style={{ color: fwColors.hex }}>{formatMs(rt.value)}</p>
              <p className="text-xs text-zinc-500">{rt.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
