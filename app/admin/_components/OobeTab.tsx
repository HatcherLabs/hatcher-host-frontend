'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Network,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminOobeOverviewResponse } from '@/lib/api';

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 18) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
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
  icon: typeof Network;
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

function stringifyStatus(value: unknown): string {
  if (!value || typeof value !== 'object') return 'No network payload loaded.';
  return JSON.stringify(value, null, 2);
}

export default function OobeTab() {
  const [data, setData] = useState<AdminOobeOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.adminGetOobeOverview();
    setLoading(false);
    if (res.success) setData(res.data);
    else setError(res.error);
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 45_000);
    return () => clearInterval(interval);
  }, [load]);

  const recent = data?.registrations ?? [];
  const warnings = useMemo(() => {
    if (!data) return [];
    const items: string[] = [];
    if (!data.config.rpcConfigured) items.push('Synapse RPC partner key or endpoint is not configured.');
    if (!data.config.sapEnabled) items.push('SAP integration is disabled.');
    if (!data.config.sapRegistrationEnabled) items.push('SAP registration is disabled.');
    if (data.totals.unregisteredWithSolanaWallet > 0) {
      items.push(`${data.totals.unregisteredWithSolanaWallet} sampled Solana wallet agent${data.totals.unregisteredWithSolanaWallet === 1 ? '' : 's'} not registered on SAP yet.`);
    }
    if (data.networkStatus && typeof data.networkStatus === 'object' && 'error' in data.networkStatus) {
      items.push(String((data.networkStatus as Record<string, unknown>).error ?? 'OOBE network status failed.'));
    }
    return items;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
            <Network size={21} className="text-[var(--color-accent)]" />
            OOBE / Synapse
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
            Synapse RPC status, SAP identity registration coverage, discovery readiness, and x402 provider call readiness
            for Hatcher agents.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="btn-secondary inline-flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="SAP agents"
              value={String(data.totals.registeredSapAgents)}
              sub={`${data.totals.sampledAgents} sampled agents`}
              icon={ShieldCheck}
              tone="#34d399"
            />
            <MetricCard
              label="Solana wallets"
              value={String(data.totals.solanaWalletsInSample)}
              sub={`${data.totals.unregisteredWithSolanaWallet} not registered`}
              icon={Wallet}
              tone="#a78bfa"
            />
            <MetricCard
              label="RPC cluster"
              value={data.config.cluster}
              sub={data.config.rpcUrl}
              icon={RadioTower}
              tone="#38bdf8"
            />
            <MetricCard
              label="Default price"
              value={`$${data.config.defaultPriceUsdc.toFixed(3)}`}
              sub="per SAP call"
              icon={Database}
              tone="#f59e0b"
            />
            <MetricCard
              label="x402 price"
              value={`${data.config.x402DefaultPriceLamports}`}
              sub="lamports per provider call"
              icon={Network}
              tone="#22c55e"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill ok={data.config.enabled} label={data.config.enabled ? 'Integration enabled' : 'Integration disabled'} />
            <StatusPill ok={data.config.rpcConfigured} label={data.config.rpcConfigured ? 'RPC configured' : 'RPC missing'} />
            <StatusPill ok={data.config.sapEnabled} label={data.config.sapEnabled ? 'SAP enabled' : 'SAP disabled'} />
            <StatusPill ok={data.config.sapRegistrationEnabled} label={data.config.sapRegistrationEnabled ? 'Registration enabled' : 'Registration disabled'} />
            <StatusPill ok={data.config.x402Enabled} label={data.config.x402Enabled ? 'x402 enabled' : 'x402 disabled'} />
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-muted)]">
              Program {short(data.config.sapProgramId)}
            </span>
          </div>

          {warnings.length > 0 ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
                <AlertTriangle size={16} /> Attention
              </div>
              <ul className="space-y-1 text-sm text-amber-100/90">
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">SAP</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.agentId} className="border-b border-[var(--border-default)]/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/agent/${row.agentId}`} className="text-[var(--color-accent)] hover:underline">
                        {row.agentName}
                      </Link>
                      <div className="font-mono text-[10px] text-[var(--text-muted)]">{row.framework} · {row.status}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {row.owner.email ?? row.owner.username ?? '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{short(row.walletAddress)}</td>
                    <td className="px-4 py-3">
                      {row.registration ? (
                        <div>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">registered</span>
                          <div className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">{short(row.registration.agentPda)}</div>
                        </div>
                      ) : (
                        <span className="rounded-full bg-zinc-500/10 px-2 py-1 text-[11px] font-semibold text-zinc-300">missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {row.registration ? `$${row.registration.pricePerCallUsdc.toFixed(3)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatDate(row.updatedAt)}</td>
                  </tr>
                ))}
                {!recent.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                      No sampled OOBE rows yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <details className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">Network status payload</summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-[11px] text-[var(--text-muted)]">
              {stringifyStatus(data.networkStatus)}
            </pre>
          </details>
        </>
      ) : (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--text-muted)]">
          Loading OOBE overview...
        </div>
      )}
    </div>
  );
}
