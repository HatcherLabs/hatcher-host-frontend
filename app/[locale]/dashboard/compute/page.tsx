'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Copy,
  Cpu,
  FlaskConical,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import type {
  ComputeNetworkStats,
  ComputeProvider,
  ComputeProviderJob,
  ComputeSettlementLedgerItem,
  ComputeSettlementQuote,
  ComputeSettlementReadiness,
  ComputeSettlementRun,
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

function microUsdc(value: string | null | undefined): string {
  if (!value) return '$0.000000';
  return `$${(Number(value) / 1_000_000).toFixed(6)}`;
}

export default function ComputeProviderDashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [providers, setProviders] = useState<ComputeProvider[]>([]);
  const [jobs, setJobs] = useState<ComputeProviderJob[]>([]);
  const [stats, setStats] = useState<ComputeNetworkStats | null>(null);
  const [settlement, setSettlement] = useState<ComputeSettlementReadiness | null>(null);
  const [ledger, setLedger] = useState<ComputeSettlementLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('My compute node');
  const [payoutWallet, setPayoutWallet] = useState('');
  const [enrollment, setEnrollment] = useState<{ token: string; expiresAt: string } | null>(null);
  const [prompt, setPrompt] = useState('Reply with one short sentence confirming local inference.');
  const [quote, setQuote] = useState<ComputeSettlementQuote | null>(null);
  const [settlementRun, setSettlementRun] = useState<ComputeSettlementRun | null>(null);
  const [settlementWorking, setSettlementWorking] = useState(false);
  const apiUrl = API_URL.replace(/\/+$/, '');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [providerResult, jobResult, statsResult, settlementResult, ledgerResult] = await Promise.all([
      api.getComputeProviders(),
      api.getComputeProviderJobs(50),
      api.getComputeStats(),
      api.getComputeSettlementReadiness(false),
      api.getComputeSettlementLedger(20),
    ]);
    if (providerResult.success) setProviders(providerResult.data);
    if (jobResult.success) setJobs(jobResult.data);
    if (statsResult.success) setStats(statsResult.data);
    if (settlementResult.success) setSettlement(settlementResult.data);
    if (ledgerResult.success) setLedger(ledgerResult.data);
    const failed = [providerResult, jobResult, statsResult, settlementResult, ledgerResult].find(
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

  async function createQuote() {
    setSettlementWorking(true);
    setError(null);
    setSettlementRun(null);
    const result = await api.createComputeSettlementQuote({
      model: 'compute/auto',
      messages: [{ role: 'user', content: prompt.trim() }],
      max_tokens: 128,
    });
    setSettlementWorking(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setQuote(result.data);
  }

  async function authorizeQuote() {
    if (!quote) return;
    setSettlementWorking(true);
    setError(null);
    const result = await api.authorizeLocalComputeSettlement(quote.id);
    setSettlementWorking(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setQuote(result.data.quote);
    setSettlementRun(result.data);
    await refresh();
  }

  if (authLoading || (!isAuthenticated && !authLoading)) return null;

  const enrollCommand = enrollment
    ? `hatcher-compute enroll --token ${enrollment.token} --api-url ${apiUrl} --model local/mock-1b --mock${payoutWallet.trim() ? ` --payout-wallet ${payoutWallet.trim()}` : ''}`
    : '';
  const payoutWalletValid =
    payoutWallet.trim().length === 0 || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(payoutWallet.trim());

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
          <strong>Safe preview:</strong> inference and the payment ledger are local simulations.
          No devnet or mainnet transaction can be submitted from this page.
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
                <div><h2>Local settlement lab</h2><p>Exercise quote → escrow → inference → verification.</p></div>
                <FlaskConical size={20} aria-hidden />
              </div>
              <div className={styles.labGrid}>
                <div className={styles.field}>
                  <label htmlFor="settlement-prompt">Test prompt</label>
                  <textarea
                    id="settlement-prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    maxLength={4000}
                    rows={4}
                  />
                </div>
                <div className={styles.labActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => void createQuote()}
                    disabled={settlementWorking || !settlement?.localSimulatorEnabled || !prompt.trim()}
                  >
                    {settlementWorking ? <Loader2 size={15} className={styles.spinner} /> : <Wallet size={15} />}
                    Create quote
                  </button>
                  {quote && quote.status === 'quoted' ? (
                    <button
                      className={styles.button}
                      onClick={() => void authorizeQuote()}
                      disabled={settlementWorking}
                    >
                      {settlementWorking ? <Loader2 size={15} className={styles.spinner} /> : <ShieldCheck size={15} />}
                      Simulate escrow & run
                    </button>
                  ) : null}
                </div>
              </div>
              {!settlement?.localSimulatorEnabled ? (
                <p className={styles.muted}>The local settlement simulator is disabled in the API environment.</p>
              ) : null}
              {quote ? (
                <div className={styles.quoteCard}>
                  <div><span>Maximum charge</span><strong>{microUsdc(quote.amountMicrousc)} simulated USDC</strong></div>
                  <div><span>Model</span><strong>{quote.model}</strong></div>
                  <div><span>Quote</span><strong>{quote.status}</strong></div>
                  <div><span>Expires</span><strong>{date(quote.expiresAt)}</strong></div>
                </div>
              ) : null}
              {settlementRun ? (
                <div className={styles.resultBox}>
                  <div className={styles.resultHeader}>
                    <ShieldCheck size={17} aria-hidden />
                    <strong>Result {settlementRun.payout?.verificationStatus ?? 'pending'}</strong>
                  </div>
                  <div className={styles.settlementFlow}>
                    <span>Payment <strong>{settlementRun.payment?.status ?? 'missing'}</strong></span>
                    <span>Job <strong>{settlementRun.job.status}</strong></span>
                    <span>Payout <strong>{settlementRun.payout?.status ?? 'missing'}</strong></span>
                  </div>
                  {settlementRun.payout ? (
                    <p className={styles.muted}>
                      Provider {microUsdc(settlementRun.payout.providerMicrousc)} · platform {microUsdc(settlementRun.payout.platformMicrousc)} · refund {microUsdc(settlementRun.payout.refundMicrousc)}.
                      {settlementRun.payout.heldReason ? ` Held: ${settlementRun.payout.heldReason}.` : ' Eligible only; no payout was sent.'}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

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
              <div className={styles.field}>
                <label htmlFor="payout-wallet">Solana payout wallet (optional in local tests)</label>
                <input
                  id="payout-wallet"
                  value={payoutWallet}
                  onChange={(event) => setPayoutWallet(event.target.value)}
                  maxLength={44}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!payoutWalletValid}
                />
                {!payoutWalletValid ? <small className={styles.fieldError}>Enter a valid base58 Solana address.</small> : null}
              </div>
              <button className={styles.button} onClick={() => void createToken()} disabled={working || !payoutWalletValid}>
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
              <p className={styles.muted}>This first command uses the deterministic test runtime. Without a payout wallet, verified work is held instead of becoming eligible.</p>
              <p className={styles.muted}>Then start the worker:</p>
              <code className={styles.command}>hatcher-compute serve</code>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Settlement readiness</h2><p>Local simulator active; on-chain rail inactive.</p></div><Wallet size={20} aria-hidden /></div>
              <p className={styles.muted}>Current rail: Solana x402 v2 · planned asset: USDC · mode: {settlement?.mode ?? 'local'}.</p>
              <div className={styles.checklist}>
                {[
                  ['Local ledger simulator', settlement?.localSimulatorEnabled],
                  ['Provider split', settlement?.checks.providerShareConfigured],
                  ['Devnet mode', settlement?.checks.devnetMode],
                  ['USDC mint', settlement?.checks.usdcMintConfigured],
                  ['Escrow wallet', settlement?.checks.escrowWalletConfigured],
                  ['Unit pricing', settlement?.checks.pricingConfigured],
                ].map(([name, ready]) => (
                  <div className={styles.check} key={String(name)}><span>{name}</span><strong data-ready={String(Boolean(ready))}>{ready ? 'ready' : 'pending'}</strong></div>
                ))}
              </div>
              <p className={styles.muted}>Local records: {ledger.length}. A request payer funds escrow first; a verified result can become payout-eligible. On-chain payout remains inactive.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
