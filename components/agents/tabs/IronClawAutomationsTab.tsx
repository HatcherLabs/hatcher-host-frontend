'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, ChevronDown, ChevronRight, Clock, Loader2, Pause, Pencil, Play, RefreshCw, RotateCcw, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { GlassCard, useAgentContext } from '../AgentContext';
import {
  extractPendingGates,
  extractTimelineItems,
  normalizeRecentRuns,
  runAction,
  type IronClawPendingGate,
  type IronClawRunEntry,
} from './ironclawRuntime';

type JsonRecord = Record<string, unknown>;
type Translator = ReturnType<typeof useTranslations>;

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function scheduleText(automation: JsonRecord, t: Translator): string {
  const source = record(automation.source);
  if (typeof source.cron === 'string') {
    return `${source.cron}${source.timezone ? ` · ${source.timezone}` : ''}`;
  }
  if (typeof source.run_at === 'string') return t('scheduleOnce', { date: formatDate(source.run_at) });
  return String(automation.schedule_label ?? source.type ?? t('scheduleManaged'));
}

export function IronClawAutomationsTab() {
  const t = useTranslations('dashboard.agentDetail.ironclaw.automations');
  const tRuns = useTranslations('dashboard.agentDetail.ironclaw.runs');
  const tApprovals = useTranslations('dashboard.agentDetail.ironclaw.approvals');
  const { agent } = useAgentContext();
  const { toast } = useToast();
  const [automations, setAutomations] = useState<JsonRecord[]>([]);
  const [schedulerEnabled, setSchedulerEnabled] = useState(true);
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createPrompt, setCreatePrompt] = useState('');
  // Runs & approvals — one automation's runs may be expanded at a time.
  const [expandedRuns, setExpandedRuns] = useState<{ automationId: string; threadId: string | null } | null>(null);
  const [live, setLive] = useState(false);
  const [gates, setGates] = useState<IronClawPendingGate[]>([]);
  const [runBusy, setRunBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await api.getIronClawAutomations(agent.id, includeCompleted);
    if (response.success) {
      setAutomations((response.data.automations ?? []).map(record));
      setSchedulerEnabled(response.data.scheduler_enabled !== false);
    } else {
      toast.error(response.error ?? t('loadError'));
    }
    setLoading(false);
  }, [agent.id, includeCompleted, t, toast]);

  useEffect(() => { void load(); }, [load]);

  /** Refresh the automations (and their recent_runs) without flashing the
   *  full-page loading state — used by the SSE stream and run actions. */
  const refreshRuns = useCallback(async () => {
    const response = await api.getIronClawAutomations(agent.id, includeCompleted);
    if (response.success) {
      setAutomations((response.data.automations ?? []).map(record));
      setSchedulerEnabled(response.data.scheduler_enabled !== false);
    }
  }, [agent.id, includeCompleted]);

  /** Scan the expanded thread's timeline for unresolved approval gates.
   *  Errors and unrecognized shapes silently yield no banner. */
  const refreshGates = useCallback(async (threadId: string) => {
    const response = await api.getIronClawThreadTimeline(agent.id, threadId, { limit: 50 });
    if (!response.success) return;
    setGates(extractPendingGates(extractTimelineItems(response.data)));
  }, [agent.id]);

  const refreshRunsRef = useRef(refreshRuns);
  const refreshGatesRef = useRef(refreshGates);
  useEffect(() => { refreshRunsRef.current = refreshRuns; }, [refreshRuns]);
  useEffect(() => { refreshGatesRef.current = refreshGates; }, [refreshGates]);

  // SSE subscription for the expanded automation's most recent thread.
  // Connect errors stay silent — the polling effect below keeps refreshing.
  useEffect(() => {
    const threadId = expandedRuns?.threadId;
    if (!threadId) {
      setLive(false);
      setGates([]);
      return;
    }
    const controller = new AbortController();
    let closed = false;
    let refreshTimer: number | null = null;
    const scheduleRefresh = () => {
      if (closed || refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshRunsRef.current();
        void refreshGatesRef.current(threadId);
      }, 400);
    };
    setLive(true);
    void api
      .streamIronClawThreadEvents(agent.id, threadId, scheduleRefresh, controller.signal)
      .then(() => { if (!closed) setLive(false); });
    void refreshGatesRef.current(threadId);
    return () => {
      closed = true;
      controller.abort();
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      setLive(false);
      setGates([]);
    };
  }, [agent.id, expandedRuns?.threadId]);

  // Fallback polling while runs are expanded but the stream is not live.
  useEffect(() => {
    if (!expandedRuns || live) return;
    const threadId = expandedRuns.threadId;
    const timer = window.setInterval(() => {
      void refreshRunsRef.current();
      if (threadId) void refreshGatesRef.current(threadId);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [expandedRuns, live]);

  const toggleRuns = (automationId: string, runs: IronClawRunEntry[]) => {
    setExpandedRuns((current) => current?.automationId === automationId
      ? null
      : { automationId, threadId: runs[0]?.threadId ?? null });
  };

  const controlRun = async (run: IronClawRunEntry, action: 'cancel' | 'retry') => {
    setRunBusy(`${action}:${run.runId}`);
    const response = action === 'cancel'
      ? await api.cancelIronClawRun(agent.id, run.threadId, run.runId)
      : await api.retryIronClawRun(agent.id, run.threadId, run.runId);
    setRunBusy(null);
    if (!response.success) {
      toast.error(response.error ?? tRuns('actionFailed'));
      return;
    }
    toast.success(action === 'cancel' ? tRuns('cancelRequested') : tRuns('retryRequested'));
    await refreshRuns();
  };

  const resolveGate = async (
    gate: IronClawPendingGate,
    fallbackRunId: string | null,
    resolution: 'approved' | 'declined',
    always = false,
  ) => {
    const threadId = expandedRuns?.threadId;
    const runId = gate.runId ?? fallbackRunId;
    if (!threadId || !runId) return;
    setRunBusy(`gate:${gate.gateRef}`);
    const response = await api.resolveIronClawRunGate(agent.id, threadId, runId, gate.gateRef, {
      resolution,
      ...(always ? { always: true } : {}),
    });
    setRunBusy(null);
    if (!response.success) {
      toast.error(response.error ?? tApprovals('resolveFailed'));
      return;
    }
    toast.success(resolution === 'approved' ? tApprovals('approvedToast') : tApprovals('declinedToast'));
    await Promise.all([refreshRuns(), refreshGates(threadId)]);
  };

  const counts = useMemo(() => ({
    active: automations.filter((item) => ['active', 'scheduled'].includes(String(item.state))).length,
    paused: automations.filter((item) => String(item.state) === 'paused').length,
  }), [automations]);

  const mutate = async (
    id: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    message: string,
  ) => {
    setBusy(id);
    try {
      const response = await action();
      if (!response.success) {
        toast.error(response.error ?? t('actionFailed'));
        return;
      }
      toast.success(message);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const rename = (id: string, name: string) => {
    const nextName = window.prompt(t('renamePrompt'), name)?.trim();
    if (!nextName || nextName === name) return;
    void mutate(id, () => api.renameIronClawAutomation(agent.id, id, nextName), t('renamed', { name: nextName }));
  };

  const create = async () => {
    const prompt = createPrompt.trim();
    if (!prompt) return;
    setBusy('create');
    const response = await api.createIronClawAutomation(agent.id, prompt);
    setBusy(null);
    if (!response.success) {
      toast.error(response.error ?? t('createFailed'));
      return;
    }
    toast.success(t('created'));
    setCreatePrompt('');
    setShowCreate(false);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><Clock size={17} className="text-emerald-400" /><h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('title')}</h2></div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('subtitle')}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)]"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('refresh')}</button>
      </div>

      {!schedulerEnabled && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">{t('schedulerDisabled')}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        {[[t('statTotal'), automations.length], [t('statActive'), counts.active], [t('statPaused'), counts.paused]].map(([label, value]) => <GlassCard key={String(label)}><p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p><p className="mt-1 text-xl font-semibold text-emerald-400">{value}</p></GlassCard>)}
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={includeCompleted} onChange={(event) => setIncludeCompleted(event.target.checked)} className="accent-emerald-500" /> {t('includeCompleted')}</label>
        <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10"><Bot size={13} /> {t('createNative')}</button>
      </div>

      {showCreate && <GlassCard><div className="space-y-3"><div><h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('describeTitle')}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{t('describeBody')}</p></div><textarea value={createPrompt} onChange={(event) => setCreatePrompt(event.target.value)} rows={4} placeholder={t('createPlaceholder')} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" /><div className="flex gap-2"><button type="button" onClick={() => void create()} disabled={busy === 'create' || createPrompt.trim().length < 10} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">{busy === 'create' && <Loader2 size={12} className="animate-spin" />} {t('create')}</button><button type="button" onClick={() => setShowCreate(false)} disabled={busy === 'create'} className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)]">{t('cancel')}</button></div></div></GlassCard>}

      {loading ? <GlassCard><div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]"><Loader2 size={16} className="animate-spin" /> {t('loading')}</div></GlassCard> : automations.length === 0 ? <GlassCard><div className="py-12 text-center"><Clock size={24} className="mx-auto text-emerald-400" /><h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{t('emptyTitle')}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[var(--text-muted)]">{t('emptyBody')}</p></div></GlassCard> : <div className="space-y-3">{automations.map((automation) => {
        const id = String(automation.automation_id ?? automation.id ?? '');
        const state = String(automation.state ?? 'unknown');
        const name = String(automation.display_name ?? automation.name ?? id);
        const paused = state === 'paused';
        const runs = normalizeRecentRuns(automation);
        const expanded = expandedRuns?.automationId === id;
        const fallbackRunId = runs[0]?.runId ?? null;
        return <GlassCard key={id}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[var(--text-primary)]">{name}</h3><span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${paused ? 'border-amber-500/30 text-amber-300' : 'border-emerald-500/30 text-emerald-300'}`}>{state}</span></div><p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">{scheduleText(automation, t)}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--text-muted)]"><span>{t('nextRun', { date: formatDate(automation.next_run_at) })}</span><span>{t('lastRun', { date: formatDate(automation.last_run_at) })}</span><span>{t('lastResult', { value: String(automation.last_status ?? '—') })}</span></div></div><div className="flex shrink-0 gap-2"><button type="button" disabled={busy === id} onClick={() => rename(id, name)} className="rounded-lg border border-[var(--border-default)] p-2 text-[var(--text-secondary)]" aria-label={t('renameAria', { name })}><Pencil size={12} /></button><button type="button" disabled={busy === id} onClick={() => void mutate(id, () => paused ? api.resumeIronClawAutomation(agent.id, id) : api.pauseIronClawAutomation(agent.id, id), paused ? t('resumedToast', { name }) : t('pausedToast', { name }))} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)]">{busy === id ? <Loader2 size={12} className="animate-spin" /> : paused ? <Play size={12} /> : <Pause size={12} />}{paused ? t('resume') : t('pause')}</button><button type="button" disabled={busy === id} onClick={() => { if (window.confirm(t('deleteConfirm', { name }))) void mutate(id, () => api.deleteIronClawAutomation(agent.id, id), t('deletedToast', { name })); }} className="rounded-lg border border-red-500/30 p-2 text-red-300"><Trash2 size={12} /></button></div></div>
        {runs.length > 0 && (
          <div className="mt-3 border-t border-[var(--border-default)] pt-3">
            <button
              type="button"
              onClick={() => toggleRuns(id, runs)}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {expanded ? <ChevronDown size={12} className="text-emerald-400" /> : <ChevronRight size={12} />}
              {tRuns('recentRuns')}
              <span className="text-[10px] text-[var(--text-muted)]">({runs.length})</span>
              {expanded && live && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> {tRuns('live')}
                </span>
              )}
            </button>
            {expanded && (
              <div className="mt-3 space-y-2">
                {gates.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                      <ShieldAlert size={13} /> {tApprovals('title')}
                    </div>
                    {gates.map((gate) => (
                      <div key={gate.gateRef} className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-amber-100/90">{tApprovals('waitingFor', { tool: gate.label })}</span>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" disabled={runBusy === `gate:${gate.gateRef}`} onClick={() => void resolveGate(gate, fallbackRunId, 'approved')} className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-black disabled:opacity-50">{tApprovals('approve')}</button>
                          <button type="button" disabled={runBusy === `gate:${gate.gateRef}`} onClick={() => void resolveGate(gate, fallbackRunId, 'approved', true)} className="rounded-lg border border-emerald-500/30 px-2.5 py-1 text-[11px] text-emerald-300 disabled:opacity-50">{tApprovals('alwaysAllow')}</button>
                          <button type="button" disabled={runBusy === `gate:${gate.gateRef}`} onClick={() => void resolveGate(gate, fallbackRunId, 'declined')} className="rounded-lg border border-red-500/30 px-2.5 py-1 text-[11px] text-red-300 disabled:opacity-50">{tApprovals('decline')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {runs.map((run) => {
                  const action = runAction(run.status);
                  const statusClass = action === 'cancel'
                    ? 'border-sky-500/30 text-sky-300'
                    : action === 'retry'
                      ? 'border-red-500/30 text-red-300'
                      : 'border-emerald-500/30 text-emerald-300';
                  return (
                    <div key={run.runId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClass}`}>{run.status}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{tRuns('submitted', { date: formatDate(run.submittedAt) })}</span>
                        {run.completedAt && <span className="text-[10px] text-[var(--text-muted)]">{tRuns('completed', { date: formatDate(run.completedAt) })}</span>}
                        {run.fireSlot && <span className="font-mono text-[10px] text-[var(--text-muted)]">{run.fireSlot}</span>}
                      </div>
                      {action === 'cancel' && (
                        <button type="button" disabled={runBusy === `cancel:${run.runId}`} onClick={() => void controlRun(run, 'cancel')} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1 text-[11px] text-red-300 disabled:opacity-50">
                          {runBusy === `cancel:${run.runId}` ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />} {tRuns('cancel')}
                        </button>
                      )}
                      {action === 'retry' && (
                        <button type="button" disabled={runBusy === `retry:${run.runId}`} onClick={() => void controlRun(run, 'retry')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1 text-[11px] text-emerald-300 disabled:opacity-50">
                          {runBusy === `retry:${run.runId}` ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />} {tRuns('retry')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </GlassCard>;
      })}</div>}
    </div>
  );
}
