'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Database,
  KeyRound,
  RefreshCw,
  Router,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  AdminConduitOverviewResponse,
  AdminConduitProviderRow,
  AdminConduitSettlementRow,
} from '@/lib/api';

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 18) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
      ok
        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
        : 'border-red-500/25 bg-red-500/10 text-red-300'
    }`}>
      {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Router;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          {sub ? <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{sub}</p> : null}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${tone}18` }}>
          <Icon size={17} style={{ color: tone }} />
        </div>
      </div>
    </div>
  );
}

function ProviderTable({ providers }: { providers: AdminConduitProviderRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            <th className="px-4 py-3">Provider</th>
            <th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Payout</th>
            <th className="px-4 py-3">Secret</th>
            <th className="px-4 py-3">Wallet</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => (
            <tr key={provider.providerId} className="border-b border-[var(--border-default)]/60 last:border-0">
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[var(--text-primary)]">{provider.providerId}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    provider.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-500/10 text-zinc-300'
                  }`}>
                    {provider.status}
                  </span>
                  {provider.adoptedLegacyProvider ? (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      legacy
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 max-w-[300px] truncate font-mono text-[10px] text-[var(--text-muted)]">
                  {provider.endpointUrl}
                </div>
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/agent/${provider.agentId}`} className="text-[var(--color-accent)] hover:underline">
                  {provider.agentName}
                </Link>
                <div className="font-mono text-[10px] text-[var(--text-muted)]">{provider.agentSlug ?? provider.agentId}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-[var(--text-primary)]">{provider.payoutMode === 'ai_credits' ? 'AI Credits' : 'USDC wallet'}</div>
                <div className="font-mono text-[10px] text-[var(--text-muted)]">{formatUsd(provider.pricePerCallUsdc)}/call</div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
                  provider.hmacSecretStored ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                }`}>
                  <KeyRound size={11} />
                  {provider.hmacSecretStored ? 'stored' : 'missing'}
                </span>
                {provider.hmacSecretStoredAt ? (
                  <div className="mt-1 text-[10px] text-[var(--text-muted)]">{formatDate(provider.hmacSecretStoredAt)}</div>
                ) : null}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{short(provider.walletAddress)}</td>
              <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatDate(provider.updatedAt)}</td>
            </tr>
          ))}
          {!providers.length ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No Conduit provider rows stored yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SettlementTable({ settlements }: { settlements: AdminConduitSettlementRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Provider share</th>
            <th className="px-4 py-3">Credits</th>
            <th className="px-4 py-3">Time</th>
          </tr>
        </thead>
        <tbody>
          {settlements.map((row) => (
            <tr key={row.referenceId} className="border-b border-[var(--border-default)]/60 last:border-0">
              <td className="px-4 py-3">
                <div className="font-mono text-xs text-[var(--text-primary)]">{short(row.referenceId)}</div>
                <div className="font-mono text-[10px] text-[var(--text-muted)]">{row.txHash ? short(row.txHash) : row.status}</div>
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/agent/${row.agentId}`} className="text-[var(--color-accent)] hover:underline">
                  {row.agentName}
                </Link>
                <div className="font-mono text-[10px] text-[var(--text-muted)]">{row.payoutMode}</div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{formatUsd(row.amountUsdc)}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{formatUsd(row.providerShareUsdc)}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{formatNumber(row.aiCreditsGranted)}</td>
              <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatDate(row.createdAt)}</td>
            </tr>
          ))}
          {!settlements.length ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No Conduit settlements recorded yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export default function ConduitTab() {
  const [data, setData] = useState<AdminConduitOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.adminGetConduitOverview();
    setLoading(false);
    if (res.success) setData(res.data);
    else setError(res.error);
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const warnings = useMemo(() => {
    if (!data) return [];
    return [
      ...data.errors,
      ...(data.providers.coverage.missingSecret
        ? [`${data.providers.coverage.missingSecret} provider row${data.providers.coverage.missingSecret === 1 ? '' : 's'} missing per-row HMAC secret`]
        : []),
      ...(data.providers.coverage.legacyAdopted
        ? [`${data.providers.coverage.legacyAdopted} adopted legacy provider row${data.providers.coverage.legacyAdopted === 1 ? '' : 's'}`]
        : []),
    ];
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Conduit</h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
            Provider registration, per-row HMAC coverage, settlement ledger, and Solana protocol status.
          </p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="btn-secondary h-10 justify-center text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {!data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((idx) => <div key={idx} className="h-28 rounded-xl shimmer" />)}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill ok={data.config.enabled} label={data.config.enabled ? 'Integration enabled' : 'Integration off'} />
              <StatusPill ok={data.config.providerEnabled} label={data.config.providerEnabled ? 'Provider enabled' : 'Provider off'} />
              <StatusPill ok={data.config.treasurySignerConfigured} label={data.config.treasurySignerConfigured ? 'SIWS signer set' : 'SIWS signer missing'} />
              <StatusPill ok={data.config.sharedHmacConfigured} label={data.config.sharedHmacConfigured ? 'Legacy HMAC set' : 'Legacy HMAC missing'} />
              <StatusPill ok={data.config.payoutWalletConfigured} label={data.config.payoutWalletConfigured ? 'Payout wallet set' : 'Payout wallet missing'} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-muted)]">
              <span>Base URL: <strong className="text-[var(--text-primary)]">{data.config.baseUrl}</strong></span>
              <span>Default price: <strong className="text-[var(--text-primary)]">{formatUsd(data.config.defaultPriceUsdc)}</strong></span>
              <span>Provider share: <strong className="text-[var(--text-primary)]">{(data.config.providerShareBps / 100).toFixed(0)}%</strong></span>
              <span>Updated: {new Date(data.generatedAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {warnings.length ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-200">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle size={14} />
                Attention
              </div>
              <div className="space-y-1 text-xs">
                {warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Provider rows"
              value={`${data.providers.coverage.active}/${data.providers.coverage.total}`}
              sub={`${data.providers.coverage.archived} archived`}
              icon={Router}
              tone="#60A5FA"
            />
            <MetricCard
              label="Secret coverage"
              value={`${data.providers.coverage.total - data.providers.coverage.missingSecret}/${data.providers.coverage.total}`}
              sub={`${data.providers.coverage.legacyAdopted} legacy adopted`}
              icon={KeyRound}
              tone="#A78BFA"
            />
            <MetricCard
              label="Settlements"
              value={formatNumber(data.settlements.totalCount)}
              sub={`${formatNumber(data.settlements.last24hCount)} in last 24h`}
              icon={Database}
              tone="#34D399"
            />
            <MetricCard
              label="Provider share"
              value={formatUsd(data.settlements.totalProviderShareUsdc)}
              sub={`${formatNumber(data.settlements.aiCreditsGranted)} AI Credits granted`}
              icon={Coins}
              tone="#FBBF24"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Payout split</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">How Conduit provider earnings are routed in Hatcher.</p>
                </div>
                <Wallet size={16} className="text-[var(--color-accent)]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">AI Credits</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{data.providers.coverage.aiCreditsPayout}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">USDC wallet</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{data.providers.coverage.usdcPayout}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.providers.byStatus.map((row) => (
                  <span key={row.status} className="rounded-full border border-[var(--border-default)] px-2 py-1 font-mono text-[11px] text-[var(--text-muted)]">
                    {row.status}: {row.count}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Solana protocol</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Programs returned by Conduit protocol info.</p>
                </div>
                <ShieldCheck size={16} className="text-[var(--color-accent)]" />
              </div>
              {data.protocol.error ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {data.protocol.error}
                </div>
              ) : null}
              <div className="space-y-2">
                {data.protocol.programs.length ? data.protocol.programs.slice(0, 6).map((program) => (
                  <div key={`${program.name}:${program.id}`} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{program.name}</p>
                    <p className="mt-1 break-all font-mono text-xs text-[var(--text-primary)]">{program.id}</p>
                  </div>
                )) : (
                  <p className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
                    No protocol programs returned yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {data.providers.missingSecret.length ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <KeyRound size={15} className="text-red-300" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Providers missing per-row HMAC secret</h3>
              </div>
              <ProviderTable providers={data.providers.missingSecret.slice(0, 10)} />
            </div>
          ) : null}

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Router size={15} className="text-[var(--color-accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent provider rows</h3>
            </div>
            <ProviderTable providers={data.providers.recent} />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Zap size={15} className="text-[var(--color-accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent settlements</h3>
            </div>
            <SettlementTable settlements={data.settlements.recent} />
          </div>
        </>
      )}
    </div>
  );
}
