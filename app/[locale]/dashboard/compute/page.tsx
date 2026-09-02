'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Copy, Cpu, Loader2, RefreshCw, Server, Trash2, Wallet } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import type {
  ComputeNetworkStats,
  ComputeProvider,
  ComputeProviderJob,
  ComputeSettlementReadiness,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { API_URL } from '@/lib/config';
import styles from './compute.module.css';

function number(value: string | number): string {
  return Number(value).toLocaleString();
}

function date(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ComputeProviderDashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [providers, setProviders] = useState<ComputeProvider[]>([]);
  const [jobs, setJobs] = useState<ComputeProviderJob[]>([]);
  const [stats, setStats] = useState<ComputeNetworkStats | null>(null);
  const [settlement, setSettlement] = useState<ComputeSettlementReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('My compute node');
  const [enrollment, setEnrollment] = useState<{ token: string; expiresAt: string } | null>(null);
  const apiUrl = API_URL.replace(/\/+$/, '');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [providerResult, jobResult, statsResult, settlementResult] = await Promise.all([
      api.getComputeProviders(),
      api.getComputeProviderJobs(50),
      api.getComputeStats(),
      api.getComputeSettlementReadiness(false),
    ]);
    if (providerResult.success) setProviders(providerResult.data);
    if (jobResult.success) setJobs(jobResult.data);
    if (statsResult.success) setStats(statsResult.data);
    if (settlementResult.success) setSettlement(settlementResult.data);
    const failed = [providerResult, jobResult, statsResult, settlementResult].find(
      (result) => !result.success,
    );
    if (failed && !failed.success) setError(failed.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/dashboard/compute');
      return;
    }
    void refresh();
  }, [authLoading, isAuthenticated, refresh, router]);

  const completedJobs = useMemo(
    () => jobs.filter((job) => job.status === 'completed').length,
    [jobs],
  );

  async function createToken() {
    setWorking(true);
    setError(null);
    const result = await api.createComputeEnrollmentToken(label.trim() || 'My compute node');
    setWorking(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEnrollment(result.data);
  }

  async function revoke(providerId: string) {
    setWorking(true);
    const result = await api.revokeComputeProvider(providerId);
    setWorking(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await refresh();
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  if (authLoading || (!isAuthenticated && !authLoading)) return null;

  const enrollCommand = enrollment
    ? `hatcher-compute enroll --token ${enrollment.token} --api-url ${apiUrl} --model local/mock-1b --mock`
    : '';

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Local preview control plane</span>
            <h1 className={styles.title}>Compute providers</h1>
            <p className={styles.subtitle}>
              Enroll Windows, macOS, or Linux machines, monitor leased inference jobs, and prepare
              payout wallets. No USDC is moved in this local phase.
            </p>
          </div>
          <div className={styles.actions}>
            <button className={styles.secondaryButton} onClick={() => void refresh()} disabled={loading}>
              <RefreshCw size={15} className={loading ? styles.spinner : ''} /> Refresh
            </button>
          </div>
        </header>

        <div className={styles.notice}>
          <strong>Safe preview:</strong> inference is local, credentials are owner-issued, and
          settlement is disabled. Devnet x402 verification will be enabled before any mainnet path.
        </div>
        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.stats} aria-label="Compute provider statistics">
          <div className={styles.stat}><span>Online nodes</span><strong>{stats?.providers.online ?? 0}</strong><small>{stats?.providers.total ?? 0} enrolled</small></div>
          <div className={styles.stat}><span>Available VRAM</span><strong>{((stats?.availableVramMb ?? 0) / 1024).toFixed(1)} GB</strong><small>reported by online nodes</small></div>
          <div className={styles.stat}><span>Completed jobs</span><strong>{number(stats?.jobs.completed ?? completedJobs)}</strong><small>{stats?.jobs.completed24h ?? 0} in 24 hours</small></div>
          <div className={styles.stat}><span>Settled earnings</span><strong>$0.00</strong><small>disabled in local preview</small></div>
        </section>

        <div className={styles.grid}>
          <div>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div><h2>Your nodes</h2><p>Outbound polling only; no inbound firewall rule is required.</p></div>
                <Server size={20} aria-hidden />
              </div>
              <div className={styles.providers}>
                {!loading && providers.length === 0 ? <div className={styles.empty}>No provider enrolled yet.</div> : null}
                {providers.map((provider) => (
                  <article className={styles.providerCard} key={provider.id}>
                    <div className={styles.providerHeader}>
                      <div><h3>{provider.name}</h3><span className={styles.providerMeta}>{provider.platform}/{provider.architecture}</span></div>
                      <span className={styles.status} data-status={provider.status}><Activity size={13} /> {provider.status}</span>
                    </div>
                    <div className={styles.providerDetails}>
                      <div><span>Hardware</span><strong>{provider.gpuName ?? provider.cpuModel}</strong></div>
                      <div><span>Runtime</span><strong>{provider.runtimeMode.replace('_', ' ')}</strong></div>
                      <div><span>Model</span><strong>{provider.supportedModels.join(', ')}</strong></div>
                      <div><span>Jobs</span><strong>{number(provider.totalJobs)}</strong></div>
                      <div><span>Tokens</span><strong>{number(provider.totalTokens)}</strong></div>
                      <div><span>Last seen</span><strong>{date(provider.lastSeenAt)}</strong></div>
                    </div>
                    <div className={styles.actions} style={{ marginTop: 14 }}>
                      <span className={styles.muted}>{provider.payoutWallet ? `Wallet ${provider.payoutWallet.slice(0, 5)}…${provider.payoutWallet.slice(-4)}` : 'No payout wallet yet'}</span>
                      <button className={styles.dangerButton} onClick={() => void revoke(provider.id)} disabled={working}><Trash2 size={14} /> Revoke</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div><h2>Recent provider jobs</h2><p>Real jobs handled by nodes owned by this account.</p></div>
                <Activity size={20} aria-hidden />
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Status</th><th>Node</th><th>Model</th><th>Tokens</th><th>Latency</th><th>Created</th></tr></thead>
                  <tbody>
                    {jobs.map((job) => <tr key={job.id}><td>{job.status}</td><td>{job.provider?.name ?? '—'}</td><td>{job.model}</td><td>{number((job.promptTokens ?? 0) + (job.completionTokens ?? 0))}</td><td>{job.latencyMs === null ? '—' : `${job.latencyMs} ms`}</td><td>{date(job.createdAt)}</td></tr>)}
                  </tbody>
                </table>
                {!loading && jobs.length === 0 ? <div className={styles.empty}>Jobs will appear after this account&apos;s node completes inference.</div> : null}
              </div>
            </section>
          </div>

          <aside>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div><h2>Enroll a node</h2><p>Generate a one-time token, then run the universal CLI.</p></div>
                <Cpu size={20} aria-hidden />
              </div>
              <div className={styles.field}>
                <label htmlFor="node-label">Node label</label>
                <input id="node-label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} />
              </div>
              <button className={styles.button} onClick={() => void createToken()} disabled={working}>
                {working ? <Loader2 size={15} className={styles.spinner} /> : <Cpu size={15} />} Generate enrollment token
              </button>
              {enrollment ? (
                <div className={styles.tokenBox} style={{ marginTop: 15 }}>
                  <code>{enrollment.token}</code>
                  <div className={styles.tokenActions}><small>Shown once · expires {date(enrollment.expiresAt)}</small><button className={styles.secondaryButton} onClick={() => void copy(enrollment.token)}><Copy size={14} /> Copy</button></div>
                </div>
              ) : null}
              <p className={styles.muted}>Install Node.js 20+ and the local preview package on any supported OS.</p>
              <code className={styles.command}>npm install --global ./hatcher-compute-node-0.1.0.tgz</code>
              {enrollment ? <><p className={styles.muted}>Enroll:</p><code className={styles.command}>{enrollCommand}</code><button className={styles.secondaryButton} style={{ marginTop: 10 }} onClick={() => void copy(enrollCommand)}><Copy size={14} /> Copy command</button></> : null}
              <p className={styles.muted}>This first command uses the deterministic test runtime. Configure a local OpenAI-compatible server before advertising a real model.</p>
              <p className={styles.muted}>Then start the worker:</p>
              <code className={styles.command}>hatcher-compute serve</code>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Settlement readiness</h2><p>Explicitly inactive until verified.</p></div><Wallet size={20} aria-hidden /></div>
              <p className={styles.muted}>Current rail: Solana x402 v2 · planned asset: USDC · mode: {settlement?.mode ?? 'local'}.</p>
              <div className={styles.checklist}>
                {[
                  ['Devnet mode', settlement?.checks.devnetMode],
                  ['USDC mint', settlement?.checks.usdcMintConfigured],
                  ['Escrow wallet', settlement?.checks.escrowWalletConfigured],
                  ['Unit pricing', settlement?.checks.pricingConfigured],
                ].map(([name, ready]) => (
                  <div className={styles.check} key={String(name)}><span>{name}</span><strong data-ready={String(Boolean(ready))}>{ready ? 'ready' : 'pending'}</strong></div>
                ))}
              </div>
              <p className={styles.muted}>The request payer funds escrow first; provider payout is released only after a verified result. This path is not active yet.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
