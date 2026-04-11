'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock, Pause, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface HermesCronJob {
  id: string;
  name: string | null;
  schedule_display: string | null;
  state: string | null;
  enabled: boolean;
  next_run_at: number | null;
  last_run_at: number | null;
  last_status: string | null;
  prompt: string | null;
  skills: string[];
  created_at: number | null;
}

interface HermesCronData {
  jobs: HermesCronJob[];
  total: number;
  enabled: number;
  schedulerActive: boolean;
}

/**
 * Format a Unix seconds timestamp as a short "in Xm" / "Xm ago" string.
 * Hermes's next_run_at is seconds since epoch, not ms — scale accordingly.
 */
function formatRelativeSeconds(unixSeconds: number | null): string {
  if (unixSeconds === null) return '—';
  const diff = unixSeconds * 1000 - Date.now();
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? 'in ' : '';
  const agoSuffix = diff < 0 ? ' ago' : '';
  if (abs < 60_000) return diff >= 0 ? 'next tick' : 'just now';
  if (abs < 3_600_000) return `${suffix}${Math.floor(abs / 60_000)}m${agoSuffix}`;
  if (abs < 86_400_000) return `${suffix}${Math.floor(abs / 3_600_000)}h${agoSuffix}`;
  return `${suffix}${Math.floor(abs / 86_400_000)}d${agoSuffix}`;
}

/**
 * Hermes native cron jobs card. Lists up to 5 upcoming jobs from
 * `/home/hermes/.hermes/cron/jobs.json` — schedule, next fire time,
 * paused state, and a truncated prompt preview.
 *
 * This is separate from Hatcher's own workflow scheduler (which runs
 * in the API host and writes to the workflows table). Hermes cron
 * runs inside the agent container and fires via the gateway process.
 */
export function HermesCronCard() {
  const { agent } = useAgentContext();
  const isActive = agent.status === 'active';
  const [data, setData] = useState<HermesCronData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getHermesCron(agent.id);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load cron jobs');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id, isActive]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  if (!isActive) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Cron jobs</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Agent is paused — start it to see scheduled jobs.
        </p>
      </GlassCard>
    );
  }

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Cron viewer unavailable: {error}
        </div>
      </GlassCard>
    );
  }

  if (!data || data.total === 0) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Cron jobs</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          No scheduled jobs. Create one from chat with{' '}
          <code className="text-[var(--text-secondary)]">/cron create</code> or via{' '}
          <code className="text-[var(--text-secondary)]">hermes cron create</code> in the terminal.
        </p>
      </GlassCard>
    );
  }

  const upcoming = data.jobs.slice(0, 5);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Cron jobs</h3>
          <span className="text-[10px] text-[var(--text-muted)]">
            {data.enabled}/{data.total} active
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {upcoming.map((job) => {
          const paused = !job.enabled || job.state === 'paused';
          return (
            <div
              key={job.id}
              className="rounded-xl px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-default)]"
            >
              <div className="flex items-center gap-2 mb-0.5">
                {paused ? (
                  <Pause size={11} className="text-[var(--text-muted)]" />
                ) : (
                  <Play size={11} className="text-emerald-400" />
                )}
                <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {job.name ?? job.id}
                </span>
                {job.schedule_display && (
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {job.schedule_display}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-[var(--text-muted)] tabular-nums">
                  {paused ? 'paused' : formatRelativeSeconds(job.next_run_at)}
                </span>
              </div>
              {job.prompt && (
                <p
                  className="text-[11px] text-[var(--text-muted)] line-clamp-1"
                  title={job.prompt}
                >
                  {job.prompt}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {data.total > upcoming.length && (
        <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
          +{data.total - upcoming.length} more
        </p>
      )}
    </GlassCard>
  );
}
