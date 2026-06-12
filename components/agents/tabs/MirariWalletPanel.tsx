'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Radar,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  MirariConfigStatus,
  MirariSignalKind,
  MirariSignalResult,
  MirariTestSignalBody,
} from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

const MIRARI_SIGNAL_KINDS: MirariSignalKind[] = [
  'focus_hit',
  'drift',
  'contradiction',
  'skill_misfire',
  'judge_score',
];

export interface MirariTestSignalFormState {
  kind: string;
  severity: string;
  summary: string;
  payloadJson: string;
}

export const MIRARI_LAYOUT_GRID_CLASSNAME = 'mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]';
export const MIRARI_RESULT_PANEL_CLASSNAME = 'min-w-0 max-w-full overflow-hidden border border-cyan-500/30 bg-cyan-500/10 p-4';
export const MIRARI_RESULT_PRE_CLASSNAME = 'mt-3 max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-words border border-[var(--border-subtle)] bg-black/30 p-3 text-xs text-[var(--text-primary)]';

function parseJsonObject(value: string, label: string): Record<string, unknown> | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function parseSeverity(value: string): number {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new Error('Severity must be an integer from 1 to 5');
  }
  return parsed;
}

function parseKind(value: string): MirariSignalKind {
  const kind = value.trim() as MirariSignalKind;
  if (!MIRARI_SIGNAL_KINDS.includes(kind)) {
    throw new Error('Signal kind is not supported');
  }
  return kind;
}

export function buildMirariTestSignalPayload(form: MirariTestSignalFormState): MirariTestSignalBody {
  const summary = form.summary.trim();
  if (!summary) throw new Error('Summary is required');
  if (summary.length > 200) throw new Error('Summary must be 200 characters or fewer');
  const payload = parseJsonObject(form.payloadJson, 'Payload JSON');
  return {
    kind: parseKind(form.kind),
    severity: parseSeverity(form.severity),
    summary,
    ...(payload ? { payload } : {}),
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
  const [granting, setGranting] = useState(false);
  const [result, setResult] = useState<MirariSignalResult | null>(null);
  const [grantMsg, setGrantMsg] = useState<string | null>(null);
  const [form, setForm] = useState<MirariTestSignalFormState>({
    kind: 'focus_hit',
    severity: '3',
    summary: 'Hatcher Mirari dashboard smoke test',
    payloadJson: '{\n  "source": "hatcher-dashboard"\n}',
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
      const payload = buildMirariTestSignalPayload(form);
      const res = await api.sendAgentMirariTestSignal(agentId, payload);
      if (!res.success) {
        setError(res.error || 'Mirari test signal failed');
        toast.error(res.error || 'Mirari test signal failed');
        return;
      }
      setResult(res.data);
      toast.success(`Mirari signal ingested (${res.data.ingested})`);
    } catch (e) {
      const message = (e as Error).message || 'Mirari test signal failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const mintGrant = async () => {
    setGranting(true);
    setGrantMsg(null);
    const res = await api.createAgentMirariGrant(agentId, ['signals:read', 'mirror:read']);
    if (res.success) {
      setGrantMsg(`Grant ready until ${new Date(res.data.expiresAt).toLocaleString()}`);
      toast.success('Mirari dashboard grant minted');
    } else {
      setGrantMsg(res.error || 'Mirari grant is not configured');
      toast.warning(res.error || 'Mirari grant is not configured');
    }
    setGranting(false);
  };

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Radar size={13} /> Mirari Live Mirror
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Mirari signal mirror</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
            Server-signed Hermes/OpenClaw signals for Live Mirror, Conflict Replay, and Pulse.
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

      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-4">
        <StatusTile
          label="Ingest"
          value={config ? (config.configured ? 'Configured' : 'Needs env') : loading ? 'Loading' : 'Unavailable'}
          description={config ? short(config.ingestHost) : 'Mirari status'}
          tone={statusTone}
          icon={ShieldCheck}
        />
        <StatusTile
          label="Workspace"
          value={config ? short(config.workspaceId) : '-'}
          description="Shared workspace partitioned by org and agent"
          tone="muted"
          icon={Radar}
        />
        <StatusTile
          label="Runtime"
          value={config?.runtime ?? '-'}
          description="Hermes first, OpenClaw-ready"
          tone="muted"
          icon={Activity}
        />
        <StatusTile
          label="Grant"
          value={config?.grantConfigured ? 'Ready' : 'Not set'}
          description={`${config?.grantTtlSeconds ?? 900}s scoped dashboard grant`}
          tone={config?.grantConfigured ? 'good' : 'warn'}
          icon={KeyRound}
        />
      </div>

      <div className={MIRARI_LAYOUT_GRID_CLASSNAME}>
        <div className="min-w-0 space-y-3">
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_96px]">
            <label className="min-w-0 text-xs text-[var(--text-muted)]">
              Kind
              <select
                value={form.kind}
                onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}
                className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-cyan-300/60"
              >
                {MIRARI_SIGNAL_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-xs text-[var(--text-muted)]">
              Severity
              <input
                value={form.severity}
                onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
                inputMode="numeric"
                className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-cyan-300/60"
              />
            </label>
          </div>

          <label className="block min-w-0 text-xs text-[var(--text-muted)]">
            Summary
            <input
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              maxLength={200}
              className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-cyan-300/60"
            />
          </label>

          <label className="block min-w-0 text-xs text-[var(--text-muted)]">
            Payload JSON
            <textarea
              value={form.payloadJson}
              onChange={(event) => setForm((current) => ({ ...current, payloadJson: event.target.value }))}
              rows={5}
              className="mt-1 w-full resize-y border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-cyan-300/60"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void sendTestSignal()}
              disabled={!canSend || submitting}
              className="inline-flex items-center gap-2 border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send test signal
            </button>
            <button
              type="button"
              onClick={() => void mintGrant()}
              disabled={!config?.grantConfigured || granting}
              className="inline-flex items-center gap-2 border border-[var(--border-subtle)] px-3 py-2 text-xs uppercase tracking-wider transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {granting ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Mint grant
            </button>
          </div>

          {grantMsg && <p className="min-w-0 break-words text-xs text-[var(--text-muted)]">{grantMsg}</p>}
        </div>

        <div className={MIRARI_RESULT_PANEL_CLASSNAME}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-100">
            <CheckCircle2 size={13} /> Last smoke result
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
              Send one staging signal to verify Hatcher signing, Mirari ingest, and idempotency response shape.
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
