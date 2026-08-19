import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight, CheckCircle2, Clock3, Database, ShieldCheck } from 'lucide-react';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { Link } from '@/i18n/routing';
import { API_URL } from '@/lib/config';
import { buildLanguagesMap } from '@/lib/seo';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'AI Stock Rewards — Hatcher',
  description: 'A public, on-chain ledger of NVDAx rewards distributed to eligible HATCHER holders and stakers.',
  alternates: {
    canonical: '/stock-rewards',
    languages: buildLanguagesMap('/stock-rewards'),
  },
};

export const revalidate = 60;

type Payout = {
  wallet: string;
  amountRaw: string;
  signature: string;
};

type Distribution = {
  id: string;
  startedAtSec: number;
  endedAtSec: number;
  sourceSolLamports: string;
  deliveryReserveLamports?: string;
  stockRaw: string;
  eligibleWallets: number;
  swapSignature: string;
  pumpSignatures: string[];
  adminTopupSignatures: string[];
  payouts: Payout[];
  status: 'payout_pending' | 'completed';
};

type RewardsLedger = {
  updatedAt: string;
  program: {
    rewardAsset: 'NVDAx';
    rewardMint: string;
    hatcherMint: string;
    minimumHatcher: string;
    creatorFeeShareBps: 7000;
    stakeBoosts: { '7d': number; '30d': number; '90d': number };
    sampleIntervalMinutes: 15;
    distributionThresholdSol: string;
  };
  totals: {
    distributions: number;
    sourceSolLamports: string;
    stockRaw: string;
    payouts: number;
    uniqueRecipients: number;
  };
  currentEpoch: {
    startedAtSec: number;
    lastSampleAtSec: number;
    samples: number;
    qualifiedWallets: number | null;
  } | null;
  distributions: Distribution[];
};

const EMPTY_LEDGER: RewardsLedger = {
  updatedAt: new Date(0).toISOString(),
  program: {
    rewardAsset: 'NVDAx',
    rewardMint: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',
    hatcherMint: 'Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump',
    minimumHatcher: '100000',
    creatorFeeShareBps: 7000,
    stakeBoosts: { '7d': 1.10, '30d': 1.20, '90d': 1.35 },
    sampleIntervalMinutes: 15,
    distributionThresholdSol: '0.25',
  },
  totals: { distributions: 0, sourceSolLamports: '0', stockRaw: '0', payouts: 0, uniqueRecipients: 0 },
  currentEpoch: null,
  distributions: [],
};

async function fetchLedger(): Promise<{ ledger: RewardsLedger; available: boolean }> {
  try {
    const response = await fetch(`${API_URL}/ai-stock-rewards`, { next: { revalidate: 60 } });
    if (!response.ok) return { ledger: EMPTY_LEDGER, available: false };
    const payload = await response.json() as { success?: boolean; data?: RewardsLedger };
    if (!payload.success || !payload.data) return { ledger: EMPTY_LEDGER, available: false };
    return { ledger: payload.data, available: true };
  } catch {
    return { ledger: EMPTY_LEDGER, available: false };
  }
}

function formatRaw(raw: string, decimals: number, maximumFractionDigits = decimals): string {
  const amount = BigInt(raw);
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, '0')
    .slice(0, maximumFractionDigits).replace(/0+$/, '');
  return `${whole.toLocaleString('en-US')}${fraction ? `.${fraction}` : ''}`;
}

function formatDate(timestampSec: number): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date(timestampSec * 1000));
}

function shortAddress(value: string): string {
  return `${value.slice(0, 5)}…${value.slice(-5)}`;
}

function solscanTransaction(signature: string): string {
  return `https://solscan.io/tx/${encodeURIComponent(signature)}`;
}

export default async function StockRewardsPage() {
  const { ledger, available } = await fetchLedger();
  const { program, totals, currentEpoch, distributions } = ledger;
  const isFresh = available && Date.now() - new Date(ledger.updatedAt).getTime() < 35 * 60 * 1000;

  return (
    <MarketingShell>
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="stock-rewards-title">
          <div className={styles.heroCopy}>
            <h1 id="stock-rewards-title">AI growth, shared with HATCHER holders.</h1>
            <p>
              Seventy percent of Hatcher&apos;s Pump creator fees funds recurring NVDAx rewards for eligible
              token holders and stakers. Every completed round is published here with its on-chain receipts.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/staking">
                Stake HATCHER <ArrowRight aria-hidden />
              </Link>
              <a
                className={styles.secondaryAction}
                href={`https://solscan.io/token/${program.rewardMint}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Verify NVDAx mint <ArrowUpRight aria-hidden />
              </a>
            </div>
          </div>

          <div className={styles.totalPanel}>
            <div className={styles.totalHeader}>
              <span>Total distributed</span>
              <span className={isFresh ? styles.live : styles.delayed}>
                <i aria-hidden /> {isFresh ? 'Ledger live' : 'Awaiting ledger'}
              </span>
            </div>
            <strong>{formatRaw(totals.stockRaw, 8, 6)}</strong>
            <span className={styles.asset}>NVDAx</span>
            <dl className={styles.heroMetrics}>
              <div>
                <dt>SOL swapped</dt>
                <dd>{formatRaw(totals.sourceSolLamports, 9, 4)} SOL</dd>
              </div>
              <div>
                <dt>Completed rounds</dt>
                <dd>{totals.distributions.toLocaleString('en-US')}</dd>
              </div>
              <div>
                <dt>Unique recipients</dt>
                <dd>{totals.uniqueRecipients.toLocaleString('en-US')}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={styles.rules} aria-labelledby="reward-rules-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <h2 id="reward-rules-title">Simple rules, deterministic accounting.</h2>
              <p>Rewards follow balances over time, not a single last-minute snapshot.</p>
            </div>
            <ol className={styles.ruleList}>
              <li>
                <span>01</span>
                <h3>Hold the minimum</h3>
                <p>Maintain at least {Number(program.minimumHatcher).toLocaleString('en-US')} HATCHER by TWAB and at the round&apos;s closing snapshot.</p>
              </li>
              <li>
                <span>02</span>
                <h3>Stake for a boost</h3>
                <p>Liquid HATCHER counts 1.00x. Active 7d, 30d, and 90d stakes count {program.stakeBoosts['7d'].toFixed(2)}x, {program.stakeBoosts['30d'].toFixed(2)}x, and {program.stakeBoosts['90d'].toFixed(2)}x.</p>
              </li>
              <li>
                <span>03</span>
                <h3>Receive automatically</h3>
                <p>When the reward budget reaches {program.distributionThresholdSol} SOL, NVDAx is bought and sent directly to qualifying owner wallets.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className={styles.epochBand} aria-label="Current reward epoch">
          <div className={styles.epochInner}>
            <div className={styles.epochTitle}>
              <Clock3 aria-hidden />
              <div>
                <span>Current TWAB epoch</span>
                <strong>{currentEpoch ? `Started ${formatDate(currentEpoch.startedAtSec)} UTC` : 'Preparing first sample'}</strong>
              </div>
            </div>
            <dl>
              <div><dt>Sampling</dt><dd>Every {program.sampleIntervalMinutes} min</dd></div>
              <div><dt>Samples</dt><dd>{currentEpoch?.samples ?? 0}</dd></div>
              <div><dt>Currently qualified</dt><dd>{currentEpoch?.qualifiedWallets ?? '—'}</dd></div>
              <div><dt>Fee allocation</dt><dd>{program.creatorFeeShareBps / 100}%</dd></div>
            </dl>
          </div>
        </section>

        <section className={styles.ledgerSection} aria-labelledby="distribution-ledger-title">
          <div className={styles.sectionInner}>
            <div className={styles.ledgerHeading}>
              <div className={styles.sectionHeading}>
                <h2 id="distribution-ledger-title">Distribution ledger</h2>
                <p>Swap, funding, and payout transactions for every round.</p>
              </div>
              <span>{totals.payouts.toLocaleString('en-US')} wallet payouts</span>
            </div>

            {distributions.length === 0 ? (
              <div className={styles.emptyState}>
                <Database aria-hidden />
                <h3>No completed distributions yet</h3>
                <p>The first round will appear after the TWAB window is established and the 0.25 SOL threshold is reached.</p>
              </div>
            ) : (
              <div className={styles.rounds}>
                {distributions.map((round, index) => (
                  <article className={styles.round} key={round.id}>
                    <div className={styles.roundSummary}>
                      <div className={styles.roundIdentity}>
                        <span>Round {distributions.length - index}</span>
                        <strong>{formatDate(round.endedAtSec)} UTC</strong>
                      </div>
                      <dl>
                        <div><dt>Distributed</dt><dd>{formatRaw(round.stockRaw, 8, 6)} NVDAx</dd></div>
                        <div><dt>Source</dt><dd>{formatRaw(round.sourceSolLamports, 9, 4)} SOL</dd></div>
                        <div><dt>Delivery reserve</dt><dd>{formatRaw(round.deliveryReserveLamports ?? '0', 9, 4)} SOL</dd></div>
                        <div><dt>Eligible</dt><dd>{round.eligibleWallets} wallets</dd></div>
                        <div><dt>TWAB window</dt><dd>{Math.max(1, Math.round((round.endedAtSec - round.startedAtSec) / 3600))}h</dd></div>
                      </dl>
                      <a href={solscanTransaction(round.swapSignature)} target="_blank" rel="noopener noreferrer">
                        Swap receipt <ArrowUpRight aria-hidden />
                      </a>
                    </div>
                    <details className={styles.roundDetails}>
                      <summary>View {round.payouts.length} wallet payouts and funding receipts</summary>
                      <div className={styles.receiptLinks}>
                        {round.pumpSignatures.map((signature) => (
                          <a key={signature} href={solscanTransaction(signature)} target="_blank" rel="noopener noreferrer">
                            Pump distribution {shortAddress(signature)} <ArrowUpRight aria-hidden />
                          </a>
                        ))}
                        {round.adminTopupSignatures.map((signature) => (
                          <a key={signature} href={solscanTransaction(signature)} target="_blank" rel="noopener noreferrer">
                            Admin 20% contribution {shortAddress(signature)} <ArrowUpRight aria-hidden />
                          </a>
                        ))}
                      </div>
                      <div className={styles.payoutTable} role="table" aria-label={`Round ${distributions.length - index} payouts`}>
                        <div className={styles.payoutHeader} role="row">
                          <span role="columnheader">Wallet</span>
                          <span role="columnheader">NVDAx</span>
                          <span role="columnheader">Transaction</span>
                        </div>
                        {round.payouts.map((payout) => (
                          <div className={styles.payoutRow} role="row" key={`${payout.wallet}-${payout.signature}`}>
                            <code role="cell" title={payout.wallet}>{shortAddress(payout.wallet)}</code>
                            <strong role="cell">{formatRaw(payout.amountRaw, 8, 8)}</strong>
                            <a role="cell" href={solscanTransaction(payout.signature)} target="_blank" rel="noopener noreferrer">
                              {shortAddress(payout.signature)} <ArrowUpRight aria-hidden />
                            </a>
                          </div>
                        ))}
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={styles.verification} aria-labelledby="verification-title">
          <div className={styles.sectionInner}>
            <ShieldCheck aria-hidden />
            <div>
              <h2 id="verification-title">Built for public verification.</h2>
              <p>
                Staking vaults never receive rewards. Active stake principal is attributed to its owner wallet,
                while program-owned accounts are excluded. Allocations use raw Token-2022 units and exact largest-remainder math.
              </p>
            </div>
            <div className={styles.verifyLinks}>
              <a href={`https://solscan.io/token/${program.hatcherMint}`} target="_blank" rel="noopener noreferrer">HATCHER mint <ArrowUpRight aria-hidden /></a>
              <a href="https://assets.backed.fi/products/nvidia-xstock" target="_blank" rel="noopener noreferrer">NVDAx product <ArrowUpRight aria-hidden /></a>
            </div>
          </div>
        </section>

        <section className={styles.disclosure}>
          <div className={styles.sectionInner}>
            <CheckCircle2 aria-hidden />
            <p>
              NVDAx is a third-party tokenized asset issued by Backed, not stock issued by Hatcher. Rewards are variable,
              depend on creator-fee revenue and market execution, and are not guaranteed. NVDAx is not available to U.S. persons,
              in the United States or United Kingdom, or in other prohibited jurisdictions; eligibility restrictions apply.
            </p>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
