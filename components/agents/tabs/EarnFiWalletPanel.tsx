'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  KeyRound,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { EarnFiConfigStatus, EarnFiJobRecord } from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

const DEFAULT_SOCIAL_URL = 'https://x.com/HatcherLabs';
const DEFAULT_MANUAL_TITLE = 'Review this site';
const DEFAULT_MANUAL_INSTRUCTIONS = 'Give concise feedback.';
const EARNFI_WORKFLOW_ID = 'earnfi-paid-jobs';
const EARNFI_PLATFORM_FEE_MULTIPLIER = 1.1;

type EarnFiJobKind = 'social' | 'manual' | 'interrupt';
type EarnFiJobPollTarget = 'status' | 'submissions' | 'completions' | 'verifications';

export interface EarnFiVerificationItem {
  id: string;
  status?: string;
}

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function titleCase(value: string): string {
  if (!value) return 'Job';
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function jobKey(job: Pick<EarnFiJobRecord, 'kind' | 'jobId'>): string {
  return `${job.kind}:${job.jobId}`;
}

function nextCorrelationId(kind: 'social' | 'manual' | 'interrupt'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${kind}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${kind}-${Date.now().toString(36)}`;
}

export function formatEarnFiUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '$0.00';
  if (value > 0 && value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

export function estimateEarnFiUiCost(slots: number, rewardPerUser: string): number | null {
  const reward = Number(rewardPerUser);
  if (!Number.isFinite(slots) || !Number.isFinite(reward) || slots < 1 || reward < 0.03) return null;
  return Number((Math.trunc(slots) * reward * EARNFI_PLATFORM_FEE_MULTIPLIER).toFixed(6));
}

export function summarizeEarnFiJob(job: EarnFiJobRecord): string {
  const settlement = job.settlementMode === 'direct_x402'
    ? 'agent wallet'
    : job.aiCreditsCharged == null
      ? 'credits pending'
      : `${job.aiCreditsCharged} credits`;
  return `${titleCase(job.kind)} ${short(job.jobId)} - ${formatEarnFiUsd(job.estimatedUsd)} / ${settlement}`;
}

export function canRunEarnFiPaidAction(status: { enabled: boolean; tokenStored: boolean }): boolean {
  return status.enabled && status.tokenStored;
}

export function getEarnFiJobPollTargets(job: Pick<EarnFiJobRecord, 'kind' | 'jobId'>): EarnFiJobPollTarget[] {
  if (job.kind === 'interrupt') return ['status'];
  return ['status', 'submissions', 'completions', 'verifications'];
}

function findVerificationRows(value: unknown, depth = 0): unknown[] {
  if (depth > 4) return [];
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  for (const key of ['verifications', 'data', 'items', 'results']) {
    const rows = findVerificationRows(value[key], depth + 1);
    if (rows.length > 0) return rows;
  }
  return [];
}

function verificationIdFromRecord(record: Record<string, unknown>): string | null {
  const raw = record.id ?? record.verification_id ?? record.verificationId;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return null;
}

export function extractEarnFiVerificationItems(value: unknown): EarnFiVerificationItem[] {
  return findVerificationRows(value)
    .filter(isRecord)
    .map<EarnFiVerificationItem | null>((record) => {
      const id = verificationIdFromRecord(record);
      if (!id) return null;
      return {
        id,
        ...(typeof record.status === 'string' && record.status.trim() ? { status: record.status.trim() } : {}),
      };
    })
    .filter((item): item is EarnFiVerificationItem => item != null);
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
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : 'border-[var(--border-subtle)] bg-black/20 text-[var(--text-muted)]';

  return (
    <div className={`rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] opacity-80">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-2 break-all font-mono text-sm text-[var(--text-primary)]">{value}</div>
      <p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p>
    </div>
  );
}

export function EarnFiWalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<EarnFiConfigStatus | null>(null);
  const [createKind, setCreateKind] = useState<EarnFiJobKind>('social');
  const [contentUrl, setContentUrl] = useState(DEFAULT_SOCIAL_URL);
  const [manualTitle, setManualTitle] = useState(DEFAULT_MANUAL_TITLE);
  const [manualInstructions, setManualInstructions] = useState(DEFAULT_MANUAL_INSTRUCTIONS);
  const [manualSlots, setManualSlots] = useState('1');
  const [manualReward, setManualReward] = useState('0.03');
  const [manualVerificationMethod, setManualVerificationMethod] = useState<'manual' | 'auto'>('manual');
  const [jobResults, setJobResults] = useState<Record<string, { label: string; data: unknown }>>({});
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [creatingSocial, setCreatingSocial] = useState(false);
  const [creatingManual, setCreatingManual] = useState(false);
  const [creatingInterrupt, setCreatingInterrupt] = useState(false);
  const [pollingKey, setPollingKey] = useState<string | null>(null);
  const [mutatingVerificationKey, setMutatingVerificationKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentEarnFiConfig(agentId);
      if (res.success) {
        setConfig(res.data);
      } else {
        setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const readyForPaidCreate = canRunEarnFiPaidAction({
    enabled: Boolean(config?.enabled),
    tokenStored: Boolean(config?.tokenStored),
  });

  const socialEstimate = config?.paidJobs?.social;
  const manualDefaultEstimate = config?.paidJobs?.manual;
  const interruptEstimate = config?.paidJobs?.interrupt;
  const manualSlotsNumber = Number(manualSlots);
  const manualEstimateUsd = estimateEarnFiUiCost(manualSlotsNumber, manualReward);
  const maxEstimatedUsd = config?.paidJobs?.maxEstimatedUsd ?? 1;
  const estimatedSpendUsd = useMemo(() => {
    const social = socialEstimate?.estimatedUsd ?? 0;
    const manual = manualEstimateUsd ?? manualDefaultEstimate?.estimatedUsd ?? 0;
    const interrupt = interruptEstimate?.estimatedUsd ?? 0;
    return social + manual + interrupt;
  }, [interruptEstimate?.estimatedUsd, manualDefaultEstimate?.estimatedUsd, manualEstimateUsd, socialEstimate?.estimatedUsd]);

  const manualExceedsLimit = manualEstimateUsd != null && manualEstimateUsd > maxEstimatedUsd;
  const manualReady = readyForPaidCreate
    && Boolean(manualTitle.trim())
    && Boolean(manualInstructions.trim())
    && Number.isInteger(manualSlotsNumber)
    && manualSlotsNumber >= 1
    && manualEstimateUsd != null
    && !manualExceedsLimit;
  const selectedCreateReady = createKind === 'social'
    ? readyForPaidCreate && Boolean(contentUrl.trim())
    : createKind === 'manual'
      ? manualReady
      : readyForPaidCreate;
  const selectedCreateLoading = createKind === 'social'
    ? creatingSocial
    : createKind === 'manual'
      ? creatingManual
      : creatingInterrupt;
  const selectedCreateEstimate = createKind === 'social'
    ? socialEstimate?.estimatedUsd
    : createKind === 'manual'
      ? manualEstimateUsd ?? manualDefaultEstimate?.estimatedUsd
      : interruptEstimate?.estimatedUsd;

  const register = async () => {
    setRegistering(true);
    setError(null);
    try {
      const res = await api.registerAgentEarnFi(agentId);
      if (res.success) {
        toast.success(res.data.registered ? 'EarnFi agent registered' : 'EarnFi registration synced');
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setRegistering(false);
    }
  };

  const createSocialJob = async () => {
    setCreatingSocial(true);
    setError(null);
    try {
      const res = await api.createAgentEarnFiSocialJob(agentId, {
        contentUrl: contentUrl.trim(),
        workflowId: EARNFI_WORKFLOW_ID,
        correlationId: nextCorrelationId('social'),
      });
      if (res.success) {
        toast.success(`EarnFi follow job created (${short(res.data.job.jobId)})`);
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setCreatingSocial(false);
    }
  };

  const createManualJob = async () => {
    setCreatingManual(true);
    setError(null);
    try {
      const res = await api.createAgentEarnFiManualJob(agentId, {
        title: manualTitle.trim(),
        instructions: manualInstructions.trim(),
        slots: Number(manualSlots),
        rewardPerUser: manualReward.trim(),
        verificationMethod: manualVerificationMethod,
        workflowId: EARNFI_WORKFLOW_ID,
        correlationId: nextCorrelationId('manual'),
      });
      if (res.success) {
        toast.success(`EarnFi manual job created (${short(res.data.job.jobId)})`);
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setCreatingManual(false);
    }
  };

  const createInterrupt = async () => {
    setCreatingInterrupt(true);
    setError(null);
    try {
      const res = await api.createAgentEarnFiInterrupt(agentId, {
        workflowId: EARNFI_WORKFLOW_ID,
        correlationId: nextCorrelationId('interrupt'),
      });
      if (res.success) {
        toast.success(`EarnFi interrupt created (${short(res.data.job.jobId)})`);
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setCreatingInterrupt(false);
    }
  };

  const createSelectedJob = async () => {
    if (createKind === 'social') {
      await createSocialJob();
      return;
    }
    if (createKind === 'manual') {
      await createManualJob();
      return;
    }
    await createInterrupt();
  };

  const reviewVerification = async (
    job: EarnFiJobRecord,
    verificationId: string,
    action: 'approve' | 'reject',
  ) => {
    const reviewKey = `${jobKey(job)}:${verificationId}:${action}`;
    const reasonKey = `${jobKey(job)}:${verificationId}`;
    setMutatingVerificationKey(reviewKey);
    setError(null);
    try {
      const res = action === 'approve'
        ? await api.approveAgentEarnFiVerification(agentId, verificationId, {})
        : await api.rejectAgentEarnFiVerification(agentId, verificationId, {
          reason: reviewReasons[reasonKey]?.trim() || 'Rejected from Hatcher',
        });
      if (res.success) {
        setJobResults((current) => ({
          ...current,
          [jobKey(job)]: { label: `Verification ${verificationId} ${action}`, data: res.data },
        }));
        toast.success(`EarnFi verification ${action === 'approve' ? 'approved' : 'rejected'}`);
      } else {
        setError(res.error);
      }
    } finally {
      setMutatingVerificationKey(null);
    }
  };

  const poll = async (job: EarnFiJobRecord, target: EarnFiJobPollTarget) => {
    const key = `${job.jobId}:${target}`;
    setPollingKey(key);
    setError(null);
    try {
      const res = job.kind === 'interrupt'
        ? await api.getAgentEarnFiInterrupt(agentId, job.jobId)
        : target === 'submissions'
          ? await api.getAgentEarnFiJobSubmissions(agentId, job.jobId)
          : target === 'completions'
            ? await api.getAgentEarnFiJobCompletions(agentId, job.jobId)
            : target === 'verifications'
              ? await api.getAgentEarnFiJobVerifications(agentId, job.jobId)
              : await api.getAgentEarnFiJob(agentId, job.jobId);

      if (res.success) {
        setJobResults((current) => ({
          ...current,
          [jobKey(job)]: { label: `${titleCase(job.kind)} ${short(job.jobId)} ${target}`, data: res.data },
        }));
        toast.success('EarnFi status refreshed');
      } else {
        setError(res.error);
      }
    } finally {
      setPollingKey(null);
    }
  };

  const jobs = config?.jobs ?? [];
  const disabledReason = !readyForPaidCreate
    ? 'Register this agent with EarnFi first'
    : createKind === 'manual' && manualExceedsLimit
      ? `Manual job exceeds the ${formatEarnFiUsd(maxEstimatedUsd)} limit`
      : undefined;

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <CircleDollarSign size={12} /> EarnFi
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Funded EarnFi jobs</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            Register the agent with EarnFi, create paid work listings, and review submissions from the same place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://app.earnfi.fun/partner-skill.md" target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <ExternalLink size={14} />
            Docs
          </a>
          <button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-100">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatusTile
          label="Integration"
          value={config?.configured ? 'configured' : 'needs env'}
          tone={config?.configured ? 'good' : 'warn'}
          description={config?.apiBaseUrl ?? 'Waiting for EarnFi config.'}
          icon={ShieldCheck}
        />
        <StatusTile
          label="Agent token"
          value={config?.tokenStored ? 'stored' : 'not registered'}
          tone={config?.tokenStored ? 'good' : 'muted'}
          description={config?.registration.registeredAt ? `Registered ${formatDate(config.registration.registeredAt)}` : 'Register once per Hatcher agent.'}
          icon={KeyRound}
        />
        <StatusTile
          label="Est. spend"
          value={formatEarnFiUsd(estimatedSpendUsd)}
          tone={config?.enabled ? 'good' : 'muted'}
          description="Paid from the agent Solana wallet via x402."
          icon={Sparkles}
        />
        <StatusTile
          label="Polling"
          value={`${config?.paidJobs?.pollingSeconds ?? 60}s`}
          tone="muted"
          description="Refresh cadence for checking job activity."
          icon={RefreshCw}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Registration</h4>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  EarnFi mints a long-lived agent token after a signed wallet challenge. Hatcher stores the token
                  encrypted per agent.
                </p>
              </div>
              <span className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase ${
                config?.registered
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              }`}>
                {config?.registered ? 'registered' : 'pending'}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-[var(--text-muted)]">Wallet</span>
                <span className="truncate font-mono text-[var(--text-primary)]">{short(config?.registration.walletAddress)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--text-muted)]">EarnFi agent</span>
                <span className="truncate font-mono text-[var(--text-primary)]">{short(config?.registration.earnFiAgentId)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void register()}
              disabled={registering || loading || !config?.enabled}
              className="btn-primary mt-4 inline-flex items-center justify-center gap-2"
            >
              {registering ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
              {config?.registered ? 'Sync registration' : 'Register EarnFi'}
            </button>
          </div>

          <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Create EarnFi job</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-3" role="tablist" aria-label="EarnFi job type">
              <button
                type="button"
                onClick={() => setCreateKind('social')}
                className={`${createKind === 'social' ? 'btn-primary' : 'btn-secondary'} inline-flex items-center justify-center gap-2 text-xs`}
              >
                <Send size={13} />
                Social follow
              </button>
              <button
                type="button"
                onClick={() => setCreateKind('manual')}
                className={`${createKind === 'manual' ? 'btn-primary' : 'btn-secondary'} inline-flex items-center justify-center gap-2 text-xs`}
              >
                <ClipboardCheck size={13} />
                Manual task
              </button>
              <button
                type="button"
                onClick={() => setCreateKind('interrupt')}
                className={`${createKind === 'interrupt' ? 'btn-primary' : 'btn-secondary'} inline-flex items-center justify-center gap-2 text-xs`}
              >
                <FileCheck2 size={13} />
                Human interrupt
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {createKind === 'social' && (
                <label className="grid gap-1 text-xs">
                  <span className="text-[var(--text-muted)]">Profile or post URL</span>
                  <input
                    value={contentUrl}
                    onChange={(event) => setContentUrl(event.target.value)}
                    className="config-input text-sm"
                    placeholder="https://x.com/SomePublicProfile"
                  />
                </label>
              )}

              {createKind === 'manual' && (
                <>
                  <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                    <label className="grid gap-1 text-xs">
                      <span className="text-[var(--text-muted)]">Task title</span>
                      <input
                        value={manualTitle}
                        onChange={(event) => setManualTitle(event.target.value)}
                        className="config-input text-sm"
                        placeholder="Review this site"
                      />
                    </label>
                    <label className="grid gap-1 text-xs">
                      <span className="text-[var(--text-muted)]">Verification</span>
                      <select
                        value={manualVerificationMethod}
                        onChange={(event) => setManualVerificationMethod(event.target.value as 'manual' | 'auto')}
                        className="config-input text-sm"
                      >
                        <option value="manual">Manual</option>
                        <option value="auto">Auto</option>
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-1 text-xs">
                    <span className="text-[var(--text-muted)]">Instructions</span>
                    <textarea
                      value={manualInstructions}
                      onChange={(event) => setManualInstructions(event.target.value)}
                      className="config-input min-h-24 text-sm"
                      placeholder="Give concise feedback."
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs">
                      <span className="text-[var(--text-muted)]">Slots</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={manualSlots}
                        onChange={(event) => setManualSlots(event.target.value)}
                        className="config-input text-sm"
                      />
                    </label>
                    <label className="grid gap-1 text-xs">
                      <span className="text-[var(--text-muted)]">Reward per user</span>
                      <input
                        value={manualReward}
                        onChange={(event) => setManualReward(event.target.value)}
                        className="config-input text-sm"
                        placeholder="0.03"
                      />
                    </label>
                  </div>
                </>
              )}

              {createKind === 'interrupt' && (
                <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-3 text-xs leading-relaxed text-[var(--text-muted)]">
                  Creates a quick human preference question for this agent and pays respondents from the agent wallet.
                </div>
              )}

              <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-xs leading-relaxed text-[var(--text-muted)]">
                EarnFi charges the agent Solana wallet via x402 when the job is created.
              </div>
            </div>

            {disabledReason && (
              <p className="mt-2 text-[11px] text-amber-100/80">{disabledReason}.</p>
            )}
            <button
              type="button"
              onClick={() => void createSelectedJob()}
              disabled={selectedCreateLoading || !selectedCreateReady}
              className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2"
            >
              {selectedCreateLoading ? <Loader2 size={14} className="animate-spin" /> : <CircleDollarSign size={14} />}
              Create {titleCase(createKind)} job {formatEarnFiUsd(selectedCreateEstimate)}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Recent EarnFi jobs</h4>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Refresh each job to see submissions, completions and verification actions.
              </p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="btn-secondary inline-flex items-center gap-2">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Reload
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--border-subtle)] p-4 text-xs text-[var(--text-muted)]">
              No EarnFi jobs created from this agent yet.
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => {
                const key = jobKey(job);
                const result = jobResults[key];
                const verifications = extractEarnFiVerificationItems(result?.data);
                return (
                  <div key={key} className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="break-all font-mono text-xs text-[var(--text-primary)]">{summarizeEarnFiJob(job)}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                          {job.idempotencyKey ? `idempotency ${short(job.idempotencyKey)}` : `created ${formatDate(job.createdAt)}`}
                        </div>
                      </div>
                      <span className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase text-[var(--text-muted)]">
                        {job.kind}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getEarnFiJobPollTargets(job).map((target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() => void poll(job, target)}
                          disabled={pollingKey === `${job.jobId}:${target}`}
                          className="btn-secondary inline-flex items-center gap-2 text-xs"
                        >
                          <RefreshCw size={12} className={pollingKey === `${job.jobId}:${target}` ? 'animate-spin' : ''} />
                          {titleCase(target)}
                        </button>
                      ))}
                    </div>

                    {verifications.length > 0 && (
                      <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                          <FileCheck2 size={14} />
                          Verification review
                        </div>
                        <div className="space-y-2">
                          {verifications.map((verification) => {
                            const reasonKey = `${key}:${verification.id}`;
                            const approveKey = `${reasonKey}:approve`;
                            const rejectKey = `${reasonKey}:reject`;
                            return (
                              <div key={verification.id} className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="font-mono text-xs text-[var(--text-primary)]">
                                    Verification {verification.id}
                                    {verification.status ? <span className="ml-2 text-[var(--text-muted)]">{verification.status}</span> : null}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void reviewVerification(job, verification.id, 'approve')}
                                      disabled={!readyForPaidCreate || mutatingVerificationKey != null}
                                      className="btn-primary inline-flex items-center gap-2 text-xs"
                                    >
                                      {mutatingVerificationKey === approveKey ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void reviewVerification(job, verification.id, 'reject')}
                                      disabled={!readyForPaidCreate || mutatingVerificationKey != null}
                                      className="btn-secondary inline-flex items-center gap-2 text-xs"
                                    >
                                      {mutatingVerificationKey === rejectKey ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                      Reject
                                    </button>
                                  </div>
                                </div>
                                <input
                                  value={reviewReasons[reasonKey] ?? ''}
                                  onChange={(event) => setReviewReasons((current) => ({ ...current, [reasonKey]: event.target.value }))}
                                  className="config-input mt-2 text-sm"
                                  placeholder="Optional rejection reason"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {result && (
                      <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-black/30 p-3">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{result.label}</div>
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-[var(--text-primary)]">
                          {prettyJson(result.data)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
