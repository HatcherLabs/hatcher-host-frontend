'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Radar,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  MirariConfigStatus,
  MirariDreamBody,
  MirariDreamMode,
  MirariDreamResult,
  MirariSignalResult,
  MirariTestSignalBody,
} from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

export interface MirariConnectionCheckFormState {
  summary: string;
}

export interface MirariDreamFormState {
  mode: MirariDreamMode;
  summary: string;
  findingTitle: string;
}

export const MIRARI_PANEL_COPY = {
  eyebrow: 'Mirari Live Mirror',
  title: 'Mirror agent activity',
  description: 'Send selected agent activity to Mirari so the owner can review live behavior, conflicts, and focus patterns.',
  checkAction: 'Check connection',
  dreamAction: 'Send dream',
  emptyResult: 'Run a connection check to confirm this agent can send activity to Mirari.',
};

export const MIRARI_LAYOUT_GRID_CLASSNAME = 'mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]';
export const MIRARI_RESULT_PANEL_CLASSNAME = 'min-w-0 max-w-full overflow-hidden border border-cyan-500/30 bg-cyan-500/10 p-4';
export const MIRARI_RESULT_PRE_CLASSNAME = 'mt-3 max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-words border border-[var(--border-subtle)] bg-black/30 p-3 text-xs text-[var(--text-primary)]';

export function buildMirariConnectionCheckPayload(form: MirariConnectionCheckFormState): MirariTestSignalBody {
  const summary = form.summary.trim();
  if (!summary) throw new Error('Summary is required');
  if (summary.length > 200) throw new Error('Summary must be 200 characters or fewer');
  return {
    kind: 'focus_hit',
    severity: 3,
    summary,
    payload: { source: 'hatcher-dashboard', action: 'connection_check' },
  };
}

export function buildMirariDreamPayload(form: MirariDreamFormState): MirariDreamBody {
  const summary = form.summary.trim();
  const findingTitle = form.findingTitle.trim();
  if (!summary) throw new Error('Dream summary is required');
  if (!findingTitle) throw new Error('Dream finding is required');
  if (summary.length > 1200) throw new Error('Dream summary must be 1200 characters or fewer');
  if (findingTitle.length > 200) throw new Error('Dream finding must be 200 characters or fewer');
  return {
    mode: form.mode,
    trigger: 'manual',
    status: 'complete',
    summary,
    findings: [{
      kind: 'insight',
      severity: 'medium',
      title: findingTitle,
      target_ref: { source: 'hatcher-dashboard', action: 'dream_check' },
    }],
  };
}

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 28) return value;
  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function StatusTile({
  label,
  value,
  description,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  tone: 'good' | 'warn' | 'muted';
  icon: typeof CheckCircle2;
}) {
  const toneClass = tone === 'good'
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
    : tone === 'warn'
      ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
      : 'border-[var(--border-subtle)] bg-black/20 text-[var(--text-primary)]';
  return (
    <div className={`min-w-0 border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        <Icon size={12} /> {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold">{value}</div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

export function MirariWalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<MirariConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dreamSubmitting, setDreamSubmitting] = useState(false);
  const [result, setResult] = useState<MirariSignalResult | null>(null);
  const [dreamResult, setDreamResult] = useState<MirariDreamResult | null>(null);
  const [form, setForm] = useState<MirariConnectionCheckFormState>({
    summary: 'Mirror this agent activity',
  });
  const [dreamForm, setDreamForm] = useState<MirariDreamFormState>({
    mode: 'consolidate',
    summary: 'Consolidate the last memory window',
    findingTitle: 'Memory links look stable',
  });

  const canSend = Boolean(config?.enabled && config.configured);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getAgentMirariConfig(agentId);
    if (res.success) {
      setConfig(res.data);
    } else {
      setError(res.error || 'Could not load Mirari config');
    }
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const statusTone = useMemo(() => {
    if (!config?.enabled) return 'warn' as const;
    if (!config.configured) return 'warn' as const;
    return 'good' as const;
  }, [config]);

  const sendTestSignal = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildMirariConnectionCheckPayload(form);
      const res = await api.sendAgentMirariTestSignal(agentId, payload);
      if (!res.success) {
        setError(res.error || 'Mirari connection check failed');
        toast.error(res.error || 'Mirari connection check failed');
        return;
      }
      setResult(res.data);
      toast.success('Mirari connection check sent');
    } catch (e) {
      const message = (e as Error).message || 'Mirari connection check failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const sendDream = async () => {
    setDreamSubmitting(true);
    setError(null);
    try {
      const payload = buildMirariDreamPayload(dreamForm);
      const res = await api.sendAgentMirariDreamTest(agentId, payload);
      if (!res.success) {
        setError(res.error || 'Mirari dream failed');
        toast.error(res.error || 'Mirari dream failed');
        return;
      }
      setDreamResult(res.data);
      toast.success('Mirari dream sent');
    } catch (e) {
      const message = (e as Error).message || 'Mirari dream failed';
      setError(message);
      toast.error(message);
    } finally {
      setDreamSubmitting(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Radar size={13} /> {MIRARI_PANEL_COPY.eyebrow}
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{MIRARI_PANEL_COPY.title}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
            {MIRARI_PANEL_COPY.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadConfig()}
          disabled={loading}
          className="inline-flex items-center gap-2 border border-[var(--border-subtle)] px-3 py-2 text-xs uppercase tracking-wider transition hover:border-cyan-300/60 disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />} Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-3">
        <StatusTile
          label="Connection"
          value={config ? (config.configured ? 'Ready' : 'Setup needed') : loading ? 'Loading' : 'Unavailable'}
          description={config ? short(config.ingestHost) : 'Mirari status'}
          tone={statusTone}
          icon={ShieldCheck}
        />
        <StatusTile
          label="Workspace"
          value={config ? short(config.workspaceId) : '-'}
          description="Activity is scoped to this agent owner"
          tone="muted"
          icon={Radar}
        />
        <StatusTile
          label="Runtime"
          value={config?.runtime ?? '-'}
          description="Agent activity source"
          tone="muted"
          icon={Activity}
        />
      </div>

      <div className={MIRARI_LAYOUT_GRID_CLASSNAME}>
        <div className="min-w-0 space-y-3">
          <label className="block min-w-0 text-xs text-[var(--text-muted)]">
            Activity note
            <input
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              maxLength={200}
              className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-cyan-300/60"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void sendTestSignal()}
              disabled={!canSend || submitting}
              className="inline-flex items-center gap-2 border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {MIRARI_PANEL_COPY.checkAction}
            </button>
          </div>

          <div className="border border-[var(--border-subtle)] bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Dream session</div>
            <label className="mt-3 block min-w-0 text-xs text-[var(--text-muted)]">
              Mode
              <select
                value={dreamForm.mode}
                onChange={(event) => setDreamForm((current) => ({
                  ...current,
                  mode: event.target.value as MirariDreamMode,
                }))}
                className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-cyan-300/60"
              >
                <option value="consolidate">Consolidate</option>
                <option value="stress_test">Stress test</option>
                <option value="replay">Replay</option>
              </select>
            </label>
            <label className="mt-3 block min-w-0 text-xs text-[var(--text-muted)]">
              Dream summary
              <input
                value={dreamForm.summary}
                onChange={(event) => setDreamForm((current) => ({ ...current, summary: event.target.value }))}
                maxLength={1200}
                className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-cyan-300/60"
              />
            </label>
            <label className="mt-3 block min-w-0 text-xs text-[var(--text-muted)]">
              Finding
              <input
                value={dreamForm.findingTitle}
                onChange={(event) => setDreamForm((current) => ({ ...current, findingTitle: event.target.value }))}
                maxLength={200}
                className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-cyan-300/60"
              />
            </label>
            <button
              type="button"
              onClick={() => void sendDream()}
              disabled={!canSend || dreamSubmitting}
              className="mt-3 inline-flex items-center gap-2 border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {dreamSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {MIRARI_PANEL_COPY.dreamAction}
            </button>
          </div>
        </div>

        <div className={MIRARI_RESULT_PANEL_CLASSNAME}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-100">
            <CheckCircle2 size={13} /> Connection check
          </div>
          {result ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="border border-cyan-400/20 bg-black/20 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">OK</div>
                  <div className="mt-1 font-semibold text-[var(--text-primary)]">{String(result.ok)}</div>
                </div>
                <div className="border border-cyan-400/20 bg-black/20 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Ingested</div>
                  <div className="mt-1 font-semibold text-[var(--text-primary)]">{result.ingested}</div>
                </div>
                <div className="border border-cyan-400/20 bg-black/20 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Deduped</div>
                  <div className="mt-1 font-semibold text-[var(--text-primary)]">{result.deduped}</div>
                </div>
              </div>
              <pre className={MIRARI_RESULT_PRE_CLASSNAME}>{prettyJson(result)}</pre>
            </>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
              {MIRARI_PANEL_COPY.emptyResult}
            </p>
          )}

          <div className="mt-5 border-t border-cyan-400/20 pt-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-100">
              <Radar size={13} /> Dream session
            </div>
            {dreamResult ? (
              <pre className={MIRARI_RESULT_PRE_CLASSNAME}>{prettyJson(dreamResult)}</pre>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
                Send a dream session to mirror an offline consolidation pass.
              </p>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
