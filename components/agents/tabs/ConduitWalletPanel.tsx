'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BadgeDollarSign,
  CheckCircle2,
  Coins,
  ExternalLink,
  KeyRound,
  Link2,
  Power,
  RefreshCw,
  Router,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ConduitConfigStatus, ConduitPayoutMode, ConduitProviderRegistration } from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 18) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function payoutDescription(mode: ConduitPayoutMode): string {
  return mode === 'ai_credits'
    ? 'The owner receives equivalent AI Credits after settled provider jobs. Conduit still lists this agent with its unique Solana wallet.'
    : 'Conduit provider USDC lands directly in this agent Solana wallet. No AI Credits are granted for those jobs.';
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

function collectProtocolPrograms(value: unknown, prefix = ''): Array<{ name: string; id: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (
      typeof nested === 'string'
      && nested.length >= 32
      && /^[1-9A-HJ-NP-Za-km-z]+$/.test(nested)
      && /(program|conduit|rewards|settlement|gateway|registry)/i.test(name)
    ) {
      return [{ name, id: nested }];
    }
    return collectProtocolPrograms(nested, name);
  });
}

export function ConduitWalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ConduitConfigStatus | null>(null);
  const [providers, setProviders] = useState<ConduitProviderRegistration[]>([]);
  const [protocolInfo, setProtocolInfo] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [providerAction, setProviderAction] = useState<string | null>(null);
  const [legacyProviderId, setLegacyProviderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registerResult, setRegisterResult] = useState<unknown | null>(null);
  const currentPayoutLabel = config?.payoutMode === 'usdc_wallet'
    ? 'USDC to agent wallet'
    : 'AI Credits default';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, providersRes, protocolRes] = await Promise.all([
        api.getAgentConduitConfig(agentId),
        api.getAgentConduitProviders(agentId),
        api.getAgentConduitProtocolInfo(agentId),
      ]);
      if (configRes.success) setConfig(configRes.data);
      else setError(configRes.error);
      if (providersRes.success) setProviders(providersRes.data.providers);
      else setError(providersRes.error);
      if (protocolRes.success) setProtocolInfo(protocolRes.data);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPayoutMode = async (payoutMode: ConduitPayoutMode) => {
    if (config?.payoutMode === payoutMode) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.updateAgentConduitConfig(agentId, { payoutMode });
      if (res.success) {
        setConfig(res.data);
        toast.success('Conduit payout updated');
      } else {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const registerProvider = async () => {
    setRegistering(true);
    setError(null);
    setRegisterResult(null);
    try {
      const res = await api.registerAgentConduitProvider(agentId, {
        pricePerCall: config?.defaultPriceUsdc,
        payoutMode: config?.payoutMode,
      });
      if (res.success) {
        setRegisterResult(res.data);
        toast.success('Conduit provider registered');
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setRegistering(false);
    }
  };

  const runProviderAction = async (
    providerId: string,
    label: string,
    action: () => Promise<{ success: boolean; data?: unknown; error?: string }>,
  ) => {
    setProviderAction(`${providerId}:${label}`);
    setError(null);
    try {
      const res = await action();
      if (res.success) {
        toast.success(`Conduit provider ${label}`);
        await load();
      } else {
        setError(res.error ?? `Conduit provider ${label} failed`);
      }
    } finally {
      setProviderAction(null);
    }
  };

  const archiveProvider = async (providerId: string) => {
    if (!providerId) return;
    if (!window.confirm('Archive this Conduit provider listing? Historical settlements stay intact.')) return;
    await runProviderAction(providerId, 'archived', () => api.archiveAgentConduitProvider(agentId, providerId));
  };

  const syncSecret = async (providerId: string) => {
    if (!providerId) return;
    await runProviderAction(providerId, 'secret synced', () => api.syncAgentConduitProviderSecret(agentId, providerId));
  };

  const rotateSecret = async (providerId: string) => {
    if (!providerId) return;
    if (!window.confirm('Rotate this provider secret? Conduit will start signing callbacks with the new row secret.')) return;
    await runProviderAction(providerId, 'secret rotated', () => api.rotateAgentConduitProviderSecret(agentId, providerId));
  };

  const setProviderStatus = async (providerId: string, status: 'active' | 'offline') => {
    if (!providerId) return;
    await runProviderAction(providerId, status, () => api.patchAgentConduitProvider(agentId, providerId, { status }));
  };

  const refreshEndpoint = async (providerId: string) => {
    if (!providerId) return;
    await runProviderAction(providerId, 'endpoint refreshed', () => api.refreshAgentConduitProviderEndpoint(agentId, providerId));
  };

  const stats = useMemo(() => {
    if (!config) return [];
    return [
      {
        label: 'Provider share',
        value: `${(config.providerShareBps / 100).toFixed(0)}%`,
        description: 'Converted into AI Credits in default payout mode.',
        icon: BadgeDollarSign,
      },
      {
        label: 'Price per call',
        value: `$${config.defaultPriceUsdc.toFixed(3)}`,
        description: 'Default listing price used when registering this agent.',
        icon: Coins,
      },
      {
        label: 'Recipient',
        value: short(config.recipientWallet),
        description: config.recipientWallet === config.agentWallet
          ? 'Agent Solana wallet'
          : config.payoutMode === 'ai_credits' ? 'Hatcher treasury wallet' : 'Agent Solana wallet',
        icon: Wallet,
      },
    ];
  }, [config]);

  const protocolPrograms = useMemo(() => collectProtocolPrograms(protocolInfo), [protocolInfo]);

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Router size={12} /> Conduit
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Provider settlement</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            List this Hatcher agent as a Conduit provider. Default payout mode credits the owner with equivalent AI
            Credits after successful jobs; direct USDC payout can route earnings to the agent wallet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://www.conduitprotocol.net/app/marketplace" target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <ExternalLink size={14} />
            Marketplace
          </a>
          <button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-3">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <Icon size={13} /> {item.label}
              </div>
              <div className="mt-2 break-all font-mono text-sm text-[var(--text-primary)]">{item.value}</div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{item.description}</p>
            </div>
          );
        })}
      </div>

      {protocolPrograms.length > 0 && (
        <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-3">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <ShieldCheck size={13} /> Solana mainnet programs
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {protocolPrograms.slice(0, 6).map((program) => (
              <div key={`${program.name}:${program.id}`} className="min-w-0 text-xs">
                <div className="font-mono uppercase tracking-[0.12em] text-[var(--text-muted)]">{program.name}</div>
                <div className="mt-1 break-all font-mono text-[var(--text-primary)]">{program.id}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <ShieldCheck size={16} className="text-[var(--phosphor)]" />
            Payout mode
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded border border-[var(--phosphor)]/40 bg-[var(--phosphor)]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--phosphor)]">
            <CheckCircle2 size={12} />
            Current: {loading && !config ? 'Loading' : currentPayoutLabel}
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {(['ai_credits', 'usdc_wallet'] as const).map((mode) => {
            const selected = config?.payoutMode === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={selected}
                onClick={() => void setPayoutMode(mode)}
                disabled={saving || (mode === 'usdc_wallet' && !config?.agentWallet)}
                className={`rounded-md border p-3 text-left transition ${
                  selected
                    ? 'border-[var(--phosphor)] bg-[var(--phosphor)]/10 shadow-[0_0_0_1px_var(--phosphor)]'
                    : 'border-[var(--border-subtle)] bg-black/10 hover:bg-white/5'
                } disabled:cursor-not-allowed disabled:opacity-55`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    {mode === 'ai_credits' ? <Zap size={15} className="shrink-0" /> : <Wallet size={15} className="shrink-0" />}
                    <span>{mode === 'ai_credits' ? 'AI Credits default' : 'USDC to agent wallet'}</span>
                  </div>
                  {selected && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-[var(--phosphor)]/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--phosphor)]">
                      <CheckCircle2 size={11} />
                      Selected
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{payoutDescription(mode)}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <KeyRound size={16} className="text-[var(--phosphor)]" />
              Provider rows
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              New Conduit providers use isolated HMAC secrets stored encrypted by Hatcher. Legacy rows can sync their
              secret once Conduit exposes it to the owning wallet.
            </p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {providers.length} local row{providers.length === 1 ? '' : 's'}
          </div>
        </div>

        <details className="mb-3 rounded-md border border-[var(--border-subtle)] bg-black/10 p-3">
          <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Advanced legacy provider tools
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
            Only use this for provider IDs created before Hatcher stored Conduit provider rows and per-row HMAC
            secrets. New provider registrations do not need this step.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={legacyProviderId}
              onChange={(event) => setLegacyProviderId(event.target.value)}
              placeholder="Existing provider ID, e.g. 61"
              className="min-w-0 flex-1 rounded-md border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
            />
            <button
              type="button"
              onClick={() => void syncSecret(legacyProviderId.trim())}
              disabled={!legacyProviderId.trim() || Boolean(providerAction)}
              className="btn-secondary inline-flex items-center justify-center gap-2 text-xs"
            >
              <CheckCircle2 size={13} />
              Sync secret
            </button>
            <button
              type="button"
              onClick={() => void refreshEndpoint(legacyProviderId.trim())}
              disabled={!legacyProviderId.trim() || Boolean(providerAction)}
              className="btn-secondary inline-flex items-center justify-center gap-2 text-xs"
            >
              <Link2 size={13} />
              Refresh endpoint
            </button>
            <button
              type="button"
              onClick={() => void archiveProvider(legacyProviderId.trim())}
              disabled={!legacyProviderId.trim() || Boolean(providerAction)}
              className="btn-secondary inline-flex items-center justify-center gap-2 text-xs text-red-200"
            >
              <Archive size={13} />
              Archive row
            </button>
          </div>
        </details>

        {providers.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--border-subtle)] px-3 py-4 text-sm text-[var(--text-muted)]">
            No Conduit provider rows stored for this agent yet.
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => {
              const busy = providerAction?.startsWith(`${provider.providerId}:`) ?? false;
              const isArchived = provider.status === 'archived';
              const nextStatus = provider.status === 'active' ? 'offline' : 'active';
              return (
                <div key={provider.providerId} className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-[var(--border-subtle)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                          {provider.status}
                        </span>
                        <span className="break-all font-mono text-xs text-[var(--text-primary)]">{provider.providerId}</span>
                      </div>
                      <div className="grid gap-2 text-xs text-[var(--text-muted)] md:grid-cols-2">
                        <div className="min-w-0">
                          <span className="font-mono uppercase tracking-[0.12em]">Wallet</span>
                          <div className="mt-1 break-all text-[var(--text-primary)]">{provider.walletAddress}</div>
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono uppercase tracking-[0.12em]">Endpoint</span>
                          <div className="mt-1 flex min-w-0 items-center gap-1 break-all text-[var(--text-primary)]">
                            <Link2 size={12} className="shrink-0" />
                            {provider.endpointUrl}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        <span>${provider.pricePerCallUsdc.toFixed(3)}/call</span>
                        <span>{provider.payoutMode === 'ai_credits' ? 'AI Credits payout' : 'USDC payout'}</span>
                        <span>{provider.hmacSecretStored ? 'Secret stored' : 'Secret missing'}</span>
                        <span>Updated {formatDate(provider.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <button
                        type="button"
                        onClick={() => void syncSecret(provider.providerId)}
                        disabled={busy || isArchived}
                        className="btn-secondary inline-flex items-center justify-center gap-2 text-xs"
                      >
                        <CheckCircle2 size={13} />
                        Sync secret
                      </button>
                      <button
                        type="button"
                        onClick={() => void rotateSecret(provider.providerId)}
                        disabled={busy || isArchived}
                        className="btn-secondary inline-flex items-center justify-center gap-2 text-xs"
                      >
                        <KeyRound size={13} />
                        Rotate
                      </button>
                      <button
                        type="button"
                        onClick={() => void refreshEndpoint(provider.providerId)}
                        disabled={busy || isArchived}
                        className="btn-secondary inline-flex items-center justify-center gap-2 text-xs"
                      >
                        <Link2 size={13} />
                        Endpoint
                      </button>
                      <button
                        type="button"
                        onClick={() => void setProviderStatus(provider.providerId, nextStatus)}
                        disabled={busy || isArchived}
                        className="btn-secondary inline-flex items-center justify-center gap-2 text-xs"
                      >
                        <Power size={13} />
                        {nextStatus === 'active' ? 'Activate' : 'Offline'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void archiveProvider(provider.providerId)}
                        disabled={busy || isArchived}
                        className="btn-secondary inline-flex items-center justify-center gap-2 text-xs text-red-200"
                      >
                        <Archive size={13} />
                        Archive
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs leading-relaxed text-[var(--text-muted)]">
          Provider registration uses Hatcher's server-side Conduit SIWS signer. Agent containers only receive the
          Hatcher proxy URL, never private keys or Conduit cookies. If Conduit's token gate blocks registration, ask
          them to exempt this provider recipient wallet: <span className="break-all font-mono text-[var(--text-primary)]">{config?.recipientWallet ?? 'loading'}</span>.
        </div>
        <button
          type="button"
          onClick={() => void registerProvider()}
          disabled={registering || loading || !config?.providerEnabled}
          className="btn-primary inline-flex items-center justify-center gap-2 md:min-w-[190px]"
        >
          <Router size={14} />
          {registering ? 'Registering...' : 'Register provider'}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {registerResult !== null && (
        <pre className="mt-3 max-h-56 overflow-auto rounded-md border border-[var(--border-subtle)] bg-black/30 p-3 text-xs text-[var(--text-muted)]">
          {JSON.stringify(registerResult, null, 2)}
        </pre>
      )}
    </GlassCard>
  );
}
