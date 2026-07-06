'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Wallet,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  VantaraCapabilityCallsResponse,
  VantaraCapabilityRegistration,
  VantaraConfigStatus,
  VantaraProviderSettingsBody,
  VantaraHermesInvokeResponse,
} from '@/lib/api';
import { GlassCard, Skeleton } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

export interface VantaraProviderFormState {
  name: string;
  description: string;
  pricePerCallUsdc: string;
  providerReceiveWallet: string;
}

function parseUsdc(value: string, label: string): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive USDC amount`);
  }
  if (parsed > 5) {
    throw new Error(`${label} must be at most 5 USDC`);
  }
  return parsed;
}

export function buildVantaraProviderPayload(
  form: VantaraProviderFormState,
  agentWallet: string | null | undefined,
): VantaraProviderSettingsBody {
  const name = form.name.trim();
  const description = form.description.trim();
  if (!name) throw new Error('Name is required');
  if (name.length > 120) throw new Error('Name must be 120 characters or fewer');
  if (!description) throw new Error('Description is required');
  if (description.length > 2000) throw new Error('Description must be 2000 characters or fewer');
  const providerReceiveWallet = form.providerReceiveWallet.trim() || agentWallet?.trim();
  if (!providerReceiveWallet) throw new Error('Provider receive wallet is required');
  return {
    name,
    description,
    pricePerCallUsdc: parseUsdc(form.pricePerCallUsdc, 'Price'),
    providerReceiveWallet,
  };
}

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}...${value.slice(-10)}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formFromConfig(config: VantaraConfigStatus): VantaraProviderFormState {
  const registration = config.provider.registration;
  return {
    name: registration?.name ?? config.provider.defaultName,
    description: registration?.description ?? config.provider.defaultDescription,
    pricePerCallUsdc: String(registration?.pricePerCallUsdc ?? config.maxPerCallUsdc),
    providerReceiveWallet: registration?.providerReceiveWallet ?? config.consumer.agentWallet ?? '',
  };
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
  icon: typeof ShieldCheck;
}) {
  const toneClass = tone === 'good'
    ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
    : tone === 'warn'
      ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
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

function registrationTone(registration: VantaraCapabilityRegistration | null): 'good' | 'warn' | 'muted' {
  if (!registration) return 'muted';
  if (registration.status === 'live') return 'good';
  if (registration.status === 'deleted') return 'muted';
  return 'warn';
}

export function VantaraWalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<VantaraConfigStatus | null>(null);
  const [form, setForm] = useState<VantaraProviderFormState>({
    name: '',
    description: '',
    pricePerCallUsdc: '0.05',
    providerReceiveWallet: '',
  });
  const [prompt, setPrompt] = useState('Say hello through paid Vantara compute.');
  const [paidResult, setPaidResult] = useState<VantaraHermesInvokeResponse | null>(null);
  const [providerCalls, setProviderCalls] = useState<VantaraCapabilityCallsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [invoking, setInvoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProviderCalls = useCallback(async () => {
    setCallsLoading(true);
    try {
      const res = await api.getAgentVantaraProviderCalls(agentId);
      if (res.success) {
        setProviderCalls(res.data);
      } else {
        setError(res.error || 'Vantara provider ledger unavailable');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vantara provider ledger unavailable');
    } finally {
      setCallsLoading(false);
    }
  }, [agentId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentVantaraConfig(agentId);
      if (res.success) {
        setConfig(res.data);
        setForm(formFromConfig(res.data));
        if (res.data.provider.registration?.capabilityId && res.data.provider.registration.status !== 'deleted') {
          void loadProviderCalls();
        } else {
          setProviderCalls(null);
        }
      } else {
        setError(res.error || 'Vantara status unavailable');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vantara status unavailable');
    } finally {
      setLoading(false);
    }
  }, [agentId, loadProviderCalls]);

  useEffect(() => {
    void load();
  }, [load]);

  const registration = config?.provider.registration ?? null;
  const splitLabel = useMemo(() => {
    const split = config?.provider.split;
    if (!split) return '-';
    return `${split.providerBps / 100}% / ${split.platformBps / 100}% / ${split.vantaraBps / 100}%`;
  }, [config]);
  const paidRoute = useMemo(() => {
    if (!config?.baseUrl || !registration?.capabilityId || registration.status === 'deleted') return null;
    return `${config.baseUrl.replace(/\/+$/, '')}/capabilities/${registration.capabilityId}/call`;
  }, [config?.baseUrl, registration?.capabilityId, registration?.status]);
  const providerCallRows = providerCalls?.calls ?? [];
  const hasActiveProviderCapability = !!registration?.capabilityId && registration.status !== 'deleted';

  const copy = async (value: string | null | undefined, label: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const saveProvider = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = buildVantaraProviderPayload(form, config?.consumer.agentWallet);
      const res = await api.updateAgentVantaraProvider(agentId, payload);
      if (res.success) {
        toast.success(res.data.capabilityId ? 'Vantara capability registered' : 'Vantara provider request saved');
        await load();
      } else {
        setError(res.error || 'Could not register Vantara capability');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not register Vantara capability');
    } finally {
      setSaving(false);
    }
  };

  const updateProviderStatus = async (status: 'live' | 'paused') => {
    setStatusUpdating(true);
    setError(null);
    try {
      const res = await api.updateAgentVantaraProviderStatus(agentId, { status });
      if (res.success) {
        toast.success(status === 'live' ? 'Vantara capability resumed' : 'Vantara capability paused');
        await load();
      } else {
        setError(res.error || 'Could not update Vantara capability');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update Vantara capability');
    } finally {
      setStatusUpdating(false);
    }
  };

  const deleteProvider = async () => {
    if (!window.confirm('Delete this Vantara capability?')) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await api.deleteAgentVantaraProvider(agentId);
      if (res.success) {
        toast.success('Vantara capability deleted');
        await load();
      } else {
        setError(res.error || 'Could not delete Vantara capability');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete Vantara capability');
    } finally {
      setDeleting(false);
    }
  };

  const invokePaidCompute = async () => {
    setInvoking(true);
    setError(null);
    setPaidResult(null);
    try {
      const res = await api.invokeAgentVantaraHermes(agentId, {
        prompt,
        maxTokens: 256,
      });
      if (res.success) {
        setPaidResult(res.data);
        toast.success('Vantara paid compute completed');
      } else {
        setError(res.error || 'Vantara paid compute failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vantara paid compute failed');
    } finally {
      setInvoking(false);
    }
  };

  return (
    <GlassCard className="p-4 border-[var(--color-success-border)] bg-[var(--color-success-bg)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-success)]">
              <Zap size={12} /> Vantara
            </span>
            <span className="text-xs text-[var(--text-muted)]">MPP + x402 over Solana USDC</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            Paid compute and earning rails
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-full border px-2 py-1 ${
            config?.enabled
              ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
              : 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
          }`}>
            {loading ? 'Checking' : config?.enabled ? 'Rail online' : 'Rail disabled'}
          </span>
          <button type="button" onClick={load} disabled={loading} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-3 py-2 text-xs text-[var(--color-destructive)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <StatusTile
              label="Consumer"
              value={config?.consumer.agentWallet ? short(config.consumer.agentWallet) : 'wallet missing'}
              description={`Max ${config ? `$${config.consumer.maxPerCallUsdc}` : '-'} per paid call.`}
              tone={config?.consumer.agentWallet ? 'good' : 'warn'}
              icon={Wallet}
            />
            <StatusTile
              label="Provider"
              value={registration?.status ?? 'not published'}
              description={registration?.capabilityId ? short(registration.capabilityId) : 'Waiting for Vantara registration.'}
              tone={registrationTone(registration)}
              icon={ShieldCheck}
            />
            <StatusTile
              label="Split"
              value={splitLabel}
              description="Provider, Hatcher platform, and Vantara release legs."
              tone="good"
              icon={CheckCircle2}
            />
            <StatusTile
              label="Platform"
              value={short(config?.provider.platformFeeWallet)}
              description="Hatcher platform fee wallet for the 5% leg."
              tone={config?.provider.platformFeeWallet ? 'good' : 'warn'}
              icon={Zap}
            />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Buy compute</h4>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Hermes paid route with MPP settlement from this agent wallet.</p>
            </div>
            <span className="rounded-full border border-[var(--border-subtle)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]">
              {config?.settlement ?? 'mpp-solana-usdc'}
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="config-input mt-4 min-h-24 text-sm"
            maxLength={8000}
          />
          <button
            type="button"
            onClick={invokePaidCompute}
            disabled={invoking || loading || !config?.consumer.agentWallet}
            className="btn-primary mt-3 inline-flex items-center gap-2"
          >
            {invoking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Run paid call
          </button>
          {paidResult ? (
            <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">Output</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{paidResult.data.output}</p>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <button type="button" onClick={() => copy(paidResult.txSignature, 'Payment tx')} className="text-left font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  tx {short(paidResult.txSignature)}
                </button>
                <span className="font-mono text-[var(--text-muted)]">{paidResult.amountPaidUsdc} USDC</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Publish provider capability</h4>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Self-serve escrow capability routed by capabilityId into this agent.</p>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="block">
              <span className="text-xs text-[var(--text-muted)]">Name</span>
              <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="config-input mt-1 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-[var(--text-muted)]">Description</span>
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="config-input mt-1 min-h-20 text-sm" maxLength={2000} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-[var(--text-muted)]">Price USDC</span>
                <input value={form.pricePerCallUsdc} onChange={(event) => setForm((prev) => ({ ...prev, pricePerCallUsdc: event.target.value }))} inputMode="decimal" className="config-input mt-1 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--text-muted)]">Receive wallet</span>
                <input value={form.providerReceiveWallet} onChange={(event) => setForm((prev) => ({ ...prev, providerReceiveWallet: event.target.value }))} className="config-input mt-1 font-mono text-xs" />
              </label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={saveProvider} disabled={saving || loading} className="btn-primary inline-flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {hasActiveProviderCapability ? 'Update capability' : 'Register capability'}
            </button>
            <button type="button" onClick={() => copy(config?.provider.callbackUrl, 'Callback URL')} className="btn-secondary inline-flex items-center gap-2">
              <Copy size={13} />
              Callback
            </button>
            {hasActiveProviderCapability ? (
              <>
                <button
                  type="button"
                  onClick={() => updateProviderStatus(registration.status === 'paused' ? 'live' : 'paused')}
                  disabled={statusUpdating}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  {statusUpdating ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : registration.status === 'paused' ? (
                    <PlayCircle size={13} />
                  ) : (
                    <PauseCircle size={13} />
                  )}
                  {registration.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button type="button" onClick={deleteProvider} disabled={deleting} className="btn-secondary inline-flex items-center gap-2 text-[var(--color-destructive)]">
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete
                </button>
              </>
            ) : null}
          </div>

          <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-[var(--text-muted)]">Capability</span>
                <span className="font-mono text-[var(--text-primary)]">{short(registration?.capabilityId)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--text-muted)]">Paid route</span>
                {paidRoute ? (
                  <button type="button" onClick={() => copy(paidRoute, 'Paid route')} className="min-w-0 truncate font-mono text-[var(--text-primary)] hover:text-[var(--text-accent)]">
                    {short(paidRoute)}
                  </button>
                ) : (
                  <span className="font-mono text-[var(--text-primary)]">-</span>
                )}
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--text-muted)]">Acceptance</span>
                <span className="font-mono text-[var(--text-primary)]">{registration?.acceptanceStatus ?? 'not_started'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--text-muted)]">Updated</span>
                <span className="font-mono text-[var(--text-primary)]">{formatDate(registration?.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Provider ledger</h4>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase text-[var(--text-muted)]">{providerCallRows.length} Vantara rows</span>
            <button
              type="button"
              onClick={loadProviderCalls}
              disabled={callsLoading || !hasActiveProviderCapability}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCw size={13} className={callsLoading ? 'animate-spin' : ''} />
              Ledger
            </button>
          </div>
        </div>
        {providerCallRows.length ? (
          <div className="mt-3 divide-y divide-[var(--border-subtle)]">
            {providerCallRows.slice(0, 6).map((call, index) => (
              <div key={String(call.requestId ?? call.paymentSig ?? index)} className="grid gap-2 py-3 text-xs lg:grid-cols-[1fr_0.7fr_1.2fr] lg:items-center">
                <div className="min-w-0">
                  <div className="font-mono text-[var(--text-primary)]">{short(call.requestId ?? call.paymentSig ?? `row-${index + 1}`)}</div>
                  <div className="mt-1 text-[var(--text-muted)]">{call.status ?? '-'} / callback {call.callbackStatus ?? '-'}</div>
                </div>
                <div className="font-mono text-[var(--text-muted)]">
                  {typeof call.amountUsdc === 'number' ? `${call.amountUsdc} USDC` : '-'}
                </div>
                <div className="grid gap-1 font-mono text-[var(--text-muted)] sm:grid-cols-3">
                  <button type="button" onClick={() => copy(call.paymentSig, 'Payment tx')} className="truncate text-left hover:text-[var(--text-primary)]">
                    pay {short(call.paymentSig)}
                  </button>
                  <button type="button" onClick={() => copy(call.releaseSig, 'Provider release tx')} className="truncate text-left hover:text-[var(--text-primary)]">
                    rel {short(call.releaseSig)}
                  </button>
                  <button type="button" onClick={() => copy(call.platformSig, 'Platform tx')} className="truncate text-left hover:text-[var(--text-primary)]">
                    fee {short(call.platformSig)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded border border-dashed border-[var(--border-subtle)] px-3 py-4 text-xs text-[var(--text-muted)]">
            No Vantara payout rows yet.
          </div>
        )}

        <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Local callback audit</h5>
            <span className="font-mono text-[10px] uppercase text-[var(--text-muted)]">{config?.recentCalls.length ?? 0} rows</span>
          </div>
          {config?.recentCalls.length ? (
            <div className="mt-3 divide-y divide-[var(--border-subtle)]">
              {config.recentCalls.slice(0, 4).map((call) => (
                <div key={call.id} className="grid gap-1 py-2 text-xs sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <span className="font-mono text-[var(--text-primary)]">{short(call.requestId ?? call.id)}</span>
                  <span className="text-[var(--text-muted)]">{call.status} / {call.verificationStatus}</span>
                  <span className="font-mono text-[var(--text-muted)]">{formatDate(call.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded border border-dashed border-[var(--border-subtle)] px-3 py-4 text-xs text-[var(--text-muted)]">
              No local callback rows yet.
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
