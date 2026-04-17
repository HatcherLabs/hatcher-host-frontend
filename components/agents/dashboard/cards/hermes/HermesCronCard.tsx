'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock, Pause, Play, Plus, Trash2, Zap, X } from 'lucide-react';
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
 * Hermes native cron jobs — list + manage. Adding, pausing, resuming,
 * deleting, and triggering jobs run through the agent's /api/jobs HTTP
 * endpoint; reads come from jobs.json on disk.
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
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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

  const runAction = useCallback(
    async (
      jobId: string,
      action: 'pause' | 'resume' | 'delete' | 'run',
    ): Promise<void> => {
      setBusy(`${jobId}:${action}`);
      try {
        const res =
          action === 'pause'
            ? await api.pauseHermesCron(agent.id, jobId)
            : action === 'resume'
              ? await api.resumeHermesCron(agent.id, jobId)
              : action === 'run'
                ? await api.runHermesCron(agent.id, jobId)
                : await api.deleteHermesCron(agent.id, jobId);
        if (!res.success) {
          setError('error' in res ? res.error : `Failed to ${action} job`);
          return;
        }
        await fetchJobs();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [agent.id, fetchJobs],
  );

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

  const jobs = data?.jobs ?? [];
  const hasJobs = jobs.length > 0;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Cron jobs</h3>
          {data && (
            <span className="text-[10px] text-[var(--text-muted)]">
              {data.enabled}/{data.total} active
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs font-medium text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
        >
          <Plus size={12} />
          New job
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-[var(--text-secondary)]">
          <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={12} />
          </button>
        </div>
      )}

      {!hasJobs ? (
        <p className="text-xs text-[var(--text-muted)]">
          No scheduled jobs. Click <em>New job</em> to create one, or use{' '}
          <code className="text-[var(--text-secondary)]">/cron create</code> in chat.
        </p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const paused = !job.enabled || job.state === 'paused';
            const row = `${job.id}`;
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
                <div className="mt-1.5 flex items-center gap-1">
                  {paused ? (
                    <button
                      onClick={() => runAction(row, 'resume')}
                      disabled={busy !== null}
                      className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-emerald-400 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Play size={10} />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => runAction(row, 'pause')}
                      disabled={busy !== null}
                      className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-amber-400 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Pause size={10} />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={() => runAction(row, 'run')}
                    disabled={busy !== null}
                    className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--color-accent)] disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <Zap size={10} />
                    Run now
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete cron job "${job.name ?? job.id}"?`)) runAction(row, 'delete');
                    }}
                    disabled={busy !== null}
                    className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-red-400 disabled:opacity-50 inline-flex items-center gap-1 ml-auto"
                  >
                    <Trash2 size={10} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateCronModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchJobs();
          }}
          onError={setError}
          agentId={agent.id}
        />
      )}
    </GlassCard>
  );
}

// ── Create modal ───────────────────────────────────────

interface CreateCronModalProps {
  agentId: string;
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}

function CreateCronModal({ agentId, onClose, onCreated, onError }: CreateCronModalProps) {
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('every day at 9am');
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (!name.trim() || !schedule.trim()) {
      onError('Name and schedule are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createHermesCron(agentId, {
        name: name.trim(),
        schedule: schedule.trim(),
        prompt: prompt.trim(),
      });
      if (!res.success) {
        onError('error' in res ? res.error : 'Failed to create cron job');
        return;
      }
      onCreated();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [agentId, name, schedule, prompt, onClose, onCreated, onError]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">New cron job</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Daily standup digest"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Schedule</label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="every day at 9am or 0 9 * * *"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
            />
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              Natural language ("every day at 9am") or cron syntax ("0 9 * * *").
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Summarise yesterday's commits and post to #team"
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              maxLength={4000}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg text-[var(--text-muted)] hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !name.trim() || !schedule.trim()}
            className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-accent)] text-black font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create job'}
          </button>
        </div>
      </div>
    </div>
  );
}
