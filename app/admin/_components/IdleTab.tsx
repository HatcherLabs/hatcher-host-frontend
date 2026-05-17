'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  Radio,
  RefreshCw,
  Server,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminIdleOverviewResponse } from '@/lib/api';

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function number(value: number): string {
  return value.toLocaleString('en-US');
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
  tone = '#8B5CF6',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Activity;
  tone?: string;
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

function SmallTable({
  empty,
  children,
}: {
  empty: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        {children}
      </table>
      <div className="hidden only:block p-6 text-center text-sm text-[var(--text-muted)]">{empty}</div>
    </div>
  );
}

export default function IdleTab() {
  const [data, setData] = useState<AdminIdleOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.adminGetIdleOverview();
    setLoading(false);
    if (res.success) setData(res.data);
    else setError(res.error);
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const coverage = data?.providers.coverage;
  const warnings = useMemo(() => {
    if (!data) return [];
    return [
      ...data.partnerApi.errors,
      ...(data.providers.missingRegistration.length
        ? [`${data.providers.missingRegistration.length} active running provider${data.providers.missingRegistration.length === 1 ? '' : 's'} missing registration/env`]
        : []),
      ...(data.providers.staleRegistrations.length
        ? [`${data.providers.staleRegistrations.length} stale provider registration${data.providers.staleRegistrations.length === 1 ? '' : 's'} still listed by IDLE`]
        : []),
      ...(data.providers.duplicateRegistrations.length
        ? [`${data.providers.duplicateRegistrations.length} duplicate provider group${data.providers.duplicateRegistrations.length === 1 ? '' : 's'} in IDLE registry`]
        : []),
    ];
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">IDLE</h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
            Consumer usage, producer earnings, and Hatcher agent provider coverage from the partner integration.
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
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="h-28 rounded-xl shimmer" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill ok={data.config.computeEnabled} label={data.config.computeEnabled ? 'Consumer enabled' : 'Consumer off'} />
              <StatusPill ok={data.config.providerEnabled} label={data.config.providerEnabled ? 'Provider enabled' : 'Provider off'} />
              <StatusPill ok={!!data.config.partnerApiConfigured} label={data.config.partnerApiConfigured ? 'Partner API configured' : 'Partner API missing'} />
              <StatusPill ok={data.config.providerCallbackConfigured} label={data.config.providerCallbackConfigured ? 'Callback configured' : 'Callback missing'} />
              <StatusPill ok={data.config.payoutWalletConfigured} label={data.config.payoutWalletConfigured ? 'Payout wallet set' : 'Payout wallet missing'} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-muted)]">
              <span>Billing: <strong className="text-[var(--text-primary)]">{data.config.consumerBillingMode}</strong></span>
              <span>Provider price: <strong className="text-[var(--text-primary)]">{formatUsd(data.config.providerDefaultPriceUsd)}</strong></span>
              <span>Partner statuses: agents {data.partnerApi.agentsStatus ?? 'n/a'} · usage {data.partnerApi.usageStatus ?? 'n/a'} · earnings {data.partnerApi.earningsStatus ?? 'n/a'}</span>
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
            <MetricCard label="Consumer requests" value={number(data.consumer.totalRequests)} sub={`Spend ${formatUsd(data.consumer.totalSpentUsd)}`} icon={Radio} tone="#60A5FA" />
            <MetricCard label="Producer earnings" value={formatUsd(data.producer.totalEarnedUsd)} sub={`${formatUsd(data.producer.totalPendingUsd)} pending`} icon={DollarSign} tone="#4ADE80" />
            <MetricCard label="Provider jobs" value={number(data.producer.totalJobs)} sub={data.producer.payoutSchedule ?? 'IDLE payout schedule'} icon={Wallet} tone="#FBBF24" />
            <MetricCard label="Eligible now" value={`${coverage?.idleEligibleNow ?? 0}/${coverage?.activeRunningAgents ?? 0}`} sub={`${coverage?.activeRunningIdleEnvReady ?? 0} env ready`} icon={Cpu} tone="#F472B6" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Consumer by type</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Partner compute usage reported by IDLE.</p>
                </div>
                <Activity size={16} className="text-[var(--color-accent)]" />
              </div>
              {data.consumer.byType.length ? (
                <div className="space-y-2">
                  {data.consumer.byType.slice(0, 8).map((row) => (
                    <div key={row.type} className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs">
                      <span className="font-mono text-[var(--text-primary)]">{row.type}</span>
                      <span className="text-[var(--text-muted)]">
                        {number(row.requests)} req{row.spentUsd != null ? ` · ${formatUsd(row.spentUsd)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
                  No consumer usage yet.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Provider coverage</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Active Hatcher runtimes matched to IDLE provider registrations.</p>
                </div>
                <Server size={16} className="text-[var(--color-accent)]" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                  <p className="text-[var(--text-muted)]">Active runtimes</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{coverage?.activeRuntimeAgents ?? 0}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                  <p className="text-[var(--text-muted)]">Running</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{coverage?.activeRunningAgents ?? 0}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                  <p className="text-[var(--text-muted)]">Registered</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{coverage?.registeredWithCurrentCapabilities ?? 0}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                  <p className="text-[var(--text-muted)]">Registry rows</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{coverage?.registeredHatcherProviders ?? 0}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                Required capabilities: {data.providers.requiredCapabilities.join(', ')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Missing active providers</h3>
              </div>
              <SmallTable empty="No missing active providers.">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Framework</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.providers.missingRegistration.length ? data.providers.missingRegistration.map((agent) => (
                    <tr key={agent.id} className="border-b border-[var(--border-default)]/60 last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/admin/agent/${agent.id}`} className="text-[var(--color-accent)] hover:underline">
                          {agent.name}
                        </Link>
                        <div className="font-mono text-[10px] text-[var(--text-muted)]">{agent.slug ?? agent.id}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{agent.framework}</td>
                      <td className="px-4 py-3 text-xs text-amber-300">{agent.reason}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                        No missing active providers.
                      </td>
                    </tr>
                  )}
                </tbody>
              </SmallTable>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Clock size={14} className="text-[var(--text-muted)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Stale registrations</h3>
              </div>
              <SmallTable empty="No stale registrations.">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="px-4 py-3">IDLE row</th>
                    <th className="px-4 py-3">Agent id</th>
                    <th className="px-4 py-3">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {data.providers.staleRegistrations.length ? data.providers.staleRegistrations.slice(0, 12).map((row) => (
                    <tr key={`${row.registryId}-${row.agentId}`} className="border-b border-[var(--border-default)]/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="text-xs text-[var(--text-primary)]">{row.name ?? 'Unknown'}</div>
                        <div className="font-mono text-[10px] text-[var(--text-muted)]">{row.registryId ?? 'no-registry-id'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{row.agentId}</td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{number(row.totalRequests)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                        No stale registrations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </SmallTable>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Caps</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Requests</th>
                  <th className="px-4 py-3">Earned</th>
                </tr>
              </thead>
              <tbody>
                {data.providers.registrations.slice(0, 25).map((row) => (
                  <tr key={`${row.registryId}-${row.agentId}`} className="border-b border-[var(--border-default)]/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">{row.name ?? 'Unknown'}</span>
                        {row.stale ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">stale</span> : null}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)]">{row.agentId ?? row.registryId ?? 'unmatched'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{row.status ?? 'unknown'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        row.matchingCurrentCapabilities ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                      }`}>
                        {row.matchingCurrentCapabilities ? 'current' : `${row.capabilities.length} caps`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {row.pricePerRequest == null ? 'n/a' : formatUsd(row.pricePerRequest)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{number(row.totalRequests)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{formatUsd(row.totalEarnedUsd)}</td>
                  </tr>
                ))}
                {!data.providers.registrations.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                      No Hatcher provider registrations returned by IDLE.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
