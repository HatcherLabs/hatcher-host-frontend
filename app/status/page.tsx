'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/lib/config';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Activity,
  Bot,
  Clock,
  Wifi,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
type ComponentStatus = 'operational' | 'degraded' | 'down';

interface Component {
  name: string;
  status: ComponentStatus;
  latencyMs?: number;
  message?: string;
}

interface StatusData {
  status: ComponentStatus;
  timestamp: string;
  activeAgents: number;
  totalAgents: number;
  components: Component[];
}

// ─── Helpers ──────────────────────────────────────────────────
const STATUS_META: Record<ComponentStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  operational: {
    label: 'Operational',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: CheckCircle2,
  },
  degraded: {
    label: 'Degraded',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: AlertTriangle,
  },
  down: {
    label: 'Down',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: XCircle,
  },
};

const OVERALL_BANNER: Record<ComponentStatus, { text: string; bg: string; dot: string }> = {
  operational: {
    text: 'All systems operational',
    bg: 'from-emerald-900/30 to-transparent border-emerald-700/30',
    dot: 'bg-emerald-400',
  },
  degraded: {
    text: 'Some systems degraded',
    bg: 'from-amber-900/30 to-transparent border-amber-700/30',
    dot: 'bg-amber-400',
  },
  down: {
    text: 'Service disruption detected',
    bg: 'from-red-900/30 to-transparent border-red-700/30',
    dot: 'bg-red-400',
  },
};

function StatusDot({ status, pulse = false }: { status: ComponentStatus; pulse?: boolean }) {
  const colors: Record<ComponentStatus, string> = {
    operational: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    down: 'bg-red-400',
  };
  return (
    <span className="relative flex h-3 w-3">
      {pulse && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-50`} />
      )}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[status]}`} />
    </span>
  );
}

function ComponentCard({ component, index }: { component: Component; index: number }) {
  const meta = STATUS_META[component.status];
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`flex items-center justify-between px-5 py-4 rounded-xl border bg-white/[0.02] ${meta.bg}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${meta.color} flex-shrink-0`} />
        <div>
          <p className="text-sm font-medium text-white">{component.name}</p>
          {component.message && (
            <p className="text-xs text-white/40 mt-0.5">{component.message}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {component.latencyMs !== undefined && (
          <span className="text-xs text-white/40 font-mono">{component.latencyMs}ms</span>
        )}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
          {meta.label}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/health/status`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json);
      setError(false);
      setLastChecked(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(() => fetch_(), 30_000);
    return () => clearInterval(interval);
  }, [fetch_]);

  const overall = data?.status ?? 'down';
  const banner = OVERALL_BANNER[overall];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <Activity className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-sm">Hatcher Status</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Wifi className="w-3.5 h-3.5" />
          Auto-refresh 30s
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Platform Status</h1>
          <p className="text-white/50 text-sm">
            Real-time health of Hatcher infrastructure
          </p>
        </div>

        {/* Overall banner */}
        <AnimatePresence mode="wait">
          {!loading && !error && data && (
            <motion.div
              key={overall}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className={`rounded-2xl border bg-gradient-to-r p-6 flex items-center justify-between ${banner.bg}`}
            >
              <div className="flex items-center gap-4">
                <StatusDot status={overall} pulse={overall !== 'operational'} />
                <div>
                  <p className="font-semibold text-lg">{banner.text}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Last checked: {lastChecked?.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetch_(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-red-700/30 bg-red-900/20 p-6 text-center"
            >
              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-300">Unable to reach the API. Status unavailable.</p>
            </motion.div>
          )}

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex items-center justify-center gap-3"
            >
              <RefreshCw className="w-4 h-4 text-white/40 animate-spin" />
              <span className="text-sm text-white/40">Checking systems...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Active Agents',
                value: data.activeAgents,
                icon: Bot,
                color: 'text-cyan-400',
              },
              {
                label: 'Total Agents',
                value: data.totalAgents,
                icon: Bot,
                color: 'text-violet-400',
              },
              {
                label: 'Components',
                value: `${data.components.filter(c => c.status === 'operational').length}/${data.components.length} OK`,
                icon: CheckCircle2,
                color: 'text-emerald-400',
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center gap-4"
              >
                <Icon className={`w-6 h-6 ${color} flex-shrink-0`} />
                <div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-white/40">{label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Components list */}
        {data && (
          <div>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Components
            </h2>
            <div className="space-y-2">
              {data.components.map((c, i) => (
                <ComponentCard key={c.name} component={c} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.05] text-xs text-white/30">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {lastChecked ? (
              <span>Updated {lastChecked.toLocaleTimeString()}</span>
            ) : (
              <span>Loading...</span>
            )}
          </div>
          <Link href="/" className="hover:text-white/60 transition-colors">
            ← Back to Hatcher
          </Link>
        </div>
      </div>
    </div>
  );
}
