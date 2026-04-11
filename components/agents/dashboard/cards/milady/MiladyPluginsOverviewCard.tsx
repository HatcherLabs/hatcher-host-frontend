'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Puzzle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface PluginEntry {
  id: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  envKey: string | null;
  category: string;
}

interface PluginsData {
  total: number;
  enabled: number;
  configured: number;
  categories: Record<string, number>;
  plugins: PluginEntry[];
}

const CATEGORY_COLORS: Record<string, string> = {
  connector: '#60a5fa', // blue
  feature: '#a78bfa', // violet
  'ai-provider': '#fb7185', // rose
  app: '#34d399', // emerald
  streaming: '#fbbf24', // amber
  database: '#f87171', // red
};

function DonutSlice({
  label,
  value,
  total,
  color,
  startAngle,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  startAngle: number;
}) {
  const radius = 50;
  const strokeWidth = 16;
  const center = 64;
  const circumference = 2 * Math.PI * radius;
  const sliceLen = total > 0 ? (value / total) * circumference : 0;
  const offset = circumference - (startAngle / 360) * circumference;
  return (
    <circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={`${sliceLen} ${circumference}`}
      strokeDashoffset={offset}
      transform={`rotate(-90 ${center} ${center})`}
      opacity={0.9}
    >
      <title>{`${label}: ${value}`}</title>
    </circle>
  );
}

/**
 * Plugin stats + category donut for Milady. One `getMiladyPlugins`
 * fetch powers both panels — count tiles (total / enabled / configured
 * / needs-key) on the left and a donut by category on the right.
 *
 * Needs-key is derived from `!p.configured && p.envKey !== null` —
 * plugins that declare an env-var dep but haven't been given one.
 */
export function MiladyPluginsOverviewCard() {
  const { agent, setTab } = useAgentContext();
  const [data, setData] = useState<PluginsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await api.getMiladyPlugins(agent.id);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load plugins');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Plugins catalog unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  const needsKey = data.plugins.filter((p) => !p.configured && p.envKey !== null).length;

  // Sort categories by count desc for the donut
  const sortedCategories = Object.entries(data.categories)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  let runningAngle = 0;
  const slices = sortedCategories.map(([cat, count]) => {
    const slice = {
      cat,
      count,
      color: CATEGORY_COLORS[cat] ?? '#94a3b8',
      startAngle: runningAngle,
    };
    runningAngle += (count / data.total) * 360;
    return slice;
  });

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Puzzle size={14} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Plugins</h3>
          <span className="text-[10px] text-[var(--text-muted)]">({data.total} available)</span>
        </div>
        <button
          onClick={() => setTab('plugins')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          Manage
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
              {data.total}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Total</div>
          </div>
          <div className="rounded-xl px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-lg font-bold text-emerald-400 tabular-nums">{data.enabled}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Enabled</div>
          </div>
          <div className="rounded-xl px-3 py-2.5 bg-blue-500/10 border border-blue-500/20">
            <div className="text-lg font-bold text-blue-400 tabular-nums">{data.configured}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Configured</div>
          </div>
          <div
            className={`rounded-xl px-3 py-2.5 border ${
              needsKey > 0
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-[var(--bg-card)] border-[var(--border-default)]'
            }`}
          >
            <div
              className={`text-lg font-bold tabular-nums ${
                needsKey > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]'
              }`}
            >
              {needsKey}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Needs Key</div>
          </div>
        </div>

        {/* Donut + legend */}
        <div className="flex items-center gap-4 justify-center lg:justify-end">
          <svg width="128" height="128" className="flex-shrink-0">
            {slices.map((s) => (
              <DonutSlice
                key={s.cat}
                label={s.cat}
                value={s.count}
                total={data.total}
                color={s.color}
                startAngle={s.startAngle}
              />
            ))}
            <text
              x="64"
              y="58"
              textAnchor="middle"
              className="fill-[var(--text-primary)] text-lg font-bold"
            >
              {data.total}
            </text>
            <text
              x="64"
              y="74"
              textAnchor="middle"
              className="fill-[var(--text-muted)] text-[9px] uppercase tracking-wider"
            >
              Plugins
            </text>
          </svg>

          <div className="space-y-1 text-[10px]">
            {slices.map((s) => (
              <div key={s.cat} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[var(--text-muted)] capitalize">{s.cat.replace('-', ' ')}</span>
                <span className="text-[var(--text-secondary)] tabular-nums ml-auto">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
