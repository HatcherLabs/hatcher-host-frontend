'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock, PauseCircle, PlayCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface ScheduleJob {
  id: string;
  name: string;
  schedule: string;
  prompt?: string;
  status: 'active' | 'paused' | string;
  nextRun?: string;
  lastRun?: string;
  runCount?: number;
}

function shortTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * OpenClaw scheduled cron jobs card. Shows active/paused totals +
 * a short list of the next 5 jobs by nextRun. The SchedulesTab is
 * the full UI (create/pause/delete); this card is a dashboard
 * teaser so users know whether their crons are healthy without
 * clicking through.
 */
export function OpenClawSchedulesCard() {
  const { agent, setTab } = useAgentContext();
  const [jobs, setJobs] = useState<ScheduleJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.getAgentSchedules(agent.id);
      if (res.success) {
        const raw = res.data as ScheduleJob[] | { jobs?: ScheduleJob[] };
        const list = Array.isArray(raw) ? raw : (raw?.jobs ?? []);
        setJobs(list);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load schedules');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  if (loading && !jobs) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (error || !jobs) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Schedules unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  const active = jobs.filter((j) => j.status === 'active').length;
  const paused = jobs.filter((j) => j.status === 'paused').length;

  // Sort by nextRun ascending, skipping entries without a nextRun
  const upcoming = [...jobs]
    .filter((j) => j.nextRun)
    .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())
    .slice(0, 5);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Schedules</h3>
          <span className="text-[10px] text-[var(--text-muted)]">({jobs.length} total)</span>
        </div>
        <button
          onClick={() => setTab('schedules')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          Manage
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-[11px] text-[var(--text-muted)] italic">
          No scheduled tasks. Create one in the Schedules tab to run prompts on a cron.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
              <PlayCircle size={14} className="text-emerald-400" />
              <div>
                <div className="text-sm font-semibold text-emerald-400 tabular-nums">{active}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Active</div>
              </div>
            </div>
            <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center gap-2">
              <PauseCircle size={14} className="text-[var(--text-muted)]" />
              <div>
                <div className="text-sm font-semibold text-[var(--text-secondary)] tabular-nums">
                  {paused}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Paused</div>
              </div>
            </div>
          </div>

          {upcoming.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Next Runs
              </div>
              <ul className="space-y-1">
                {upcoming.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="truncate flex-1">{job.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">
                      {shortTime(job.nextRun)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
