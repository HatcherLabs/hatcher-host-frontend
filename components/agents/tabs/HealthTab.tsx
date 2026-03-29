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
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext } from '../AgentContext';

interface MonitoringData {
  health: 'healthy' | 'unhealthy' | 'stopped';
  uptime: { seconds: number; since: string | null };
  resources: { cpuPercent: number; memoryMb: number; memoryLimitMb: number };
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

const HEALTH_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Healthy' },
  unhealthy: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Unhealthy' },
  stopped: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400', label: 'Stopped' },
};

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.06] bg-[#18181b]/80 p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={color || 'text-zinc-400'}>{icon}</div>
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </motion.div>
  );
}

function MiniChart({ data, dataKey, color, height = 60 }: {
  data: Array<{ ts: number; cpu: number; mem: number }>;
  dataKey: 'cpu' | 'mem';
  color: string;
  height?: number;
}) {
  if (!data.length) return <div className="text-zinc-600 text-xs">No data yet</div>;

  const values = data.map(d => d[dataKey]);
  const max = Math.max(...values, 1);
  const w = 100 / data.length;

  return (
    <div className="flex items-end gap-[1px]" style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className="rounded-t-sm transition-all"
          style={{
            width: `${w}%`,
            height: `${Math.max((v / max) * 100, 2)}%`,
            backgroundColor: color,
            opacity: 0.3 + (i / data.length) * 0.7,
          }}
          title={`${dataKey === 'cpu' ? v.toFixed(1) + '%' : v.toFixed(0) + 'MB'}`}
        />
      ))}
    </div>
  );
}

export function HealthTab() {
  const { agent } = useAgentContext();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!agent?.id) return;
    try {
      const res = await api.getAgentMonitoring(agent.id);
      setData(res);
      setError(null);
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
    ? ((data.resources.memoryMb / data.resources.memoryLimitMb) * 100).toFixed(0)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${style.bg}`}>
            <div className={`w-2 h-2 rounded-full ${style.dot} ${data.health === 'healthy' ? 'animate-pulse' : ''}`} />
            <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
          </div>
          {data.uptime.since && (
            <span className="text-xs text-zinc-500">
              Up since {new Date(data.uptime.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
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
          color="text-emerald-400"
        />
        <StatCard
          icon={<Zap size={16} />}
          label="Avg Response"
          value={formatMs(data.responseTimes.avg)}
          sub={`P95: ${formatMs(data.responseTimes.p95)}`}
          color="text-cyan-400"
        />
        <StatCard
          icon={<Cpu size={16} />}
          label="CPU"
          value={`${data.resources.cpuPercent.toFixed(1)}%`}
          color="text-purple-400"
        />
        <StatCard
          icon={<MemoryStick size={16} />}
          label="Memory"
          value={`${data.resources.memoryMb.toFixed(0)} MB`}
          sub={`${memPercent}% of ${data.resources.memoryLimitMb} MB`}
          color="text-amber-400"
        />
      </div>

      {/* Charts + Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPU History */}
        <div className="rounded-xl border border-white/[0.06] bg-[#18181b]/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">CPU History</span>
            <span className="text-xs text-purple-400">{data.resources.cpuPercent.toFixed(1)}%</span>
          </div>
          <MiniChart data={data.history} dataKey="cpu" color="#a855f7" height={80} />
        </div>

        {/* Memory History */}
        <div className="rounded-xl border border-white/[0.06] bg-[#18181b]/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Memory History</span>
            <span className="text-xs text-amber-400">{memPercent}%</span>
          </div>
          <MiniChart data={data.history} dataKey="mem" color="#f59e0b" height={80} />
        </div>
      </div>

      {/* Errors Section */}
      <div className="rounded-xl border border-white/[0.06] bg-[#18181b]/80 p-4">
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
      <div className="rounded-xl border border-white/[0.06] bg-[#18181b]/80 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-cyan-400" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Response Times</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Average', value: data.responseTimes.avg, color: 'text-cyan-400' },
            { label: 'P95', value: data.responseTimes.p95, color: 'text-purple-400' },
            { label: 'Last', value: data.responseTimes.last, color: 'text-emerald-400' },
          ].map(rt => (
            <div key={rt.label} className="text-center">
              <p className={`text-lg font-bold ${rt.color}`}>{formatMs(rt.value)}</p>
              <p className="text-xs text-zinc-500">{rt.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
