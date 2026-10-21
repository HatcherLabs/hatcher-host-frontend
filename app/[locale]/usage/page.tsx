import { localizedMetadata } from '@/lib/seo';
import type { Metadata } from "next";
import { Activity, ArrowUpRight, LockKeyhole } from "lucide-react";
import { MarketingShell } from "@/components/marketing/v3/MarketingShell";
import { Link } from "@/i18n/routing";
import { HATCH_TOKEN_MINT } from '@/lib/config';
import { loadTokenMarket } from '@/lib/token-market';
import { loadTokenSupply } from '@/lib/token-supply';
import type { TokenBurnSummary } from '@/lib/token-burns';
import styles from "./page.module.css";

interface UsageMetric {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface PlatformUsage {
  generatedAt: string;
  firstRecordedAt: string | null;
  timezone: "UTC";
  lifetime: UsageMetric;
  month: UsageMetric;
  today: UsageMetric;
  daily: Array<UsageMetric & { date: string }>;
  activity?: {
    monthStart: string;
    totalUsers: number;
    monthlyActiveUsers: number;
    totalAgents: number;
    monthlyActiveAgents: number;
  } | null;
}

function pageMetadata(): Metadata {
  return {
    title: "Platform usage — Hatcher",
    description:
      "Monthly active users and agents, AI usage, and public $HATCHER market and burn statistics.",
  };
}

async function loadPlatformUsage(): Promise<PlatformUsage | null> {
  const defaultApiUrl =
    process.env.NODE_ENV === "production"
      ? "https://api.hatcher.host"
      : "http://localhost:3001";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || defaultApiUrl;

  try {
    const response = await fetch(`${apiUrl}/analytics/platform-usage`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      success?: boolean;
      data?: PlatformUsage;
    };
    return payload.success && payload.data ? payload.data : null;
  } catch {
    return null;
  }
}

async function loadBurns(): Promise<TokenBurnSummary | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.hatcher.host';
  try {
    const response = await fetch(`${apiUrl}/prices/hatch/burns`, {
      next: { revalidate: 300 }, signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const data = payload?.data;
    return payload.success && data?.mint === HATCH_TOKEN_MINT
      && typeof data.generatedAt === 'string' && Number.isFinite(Date.parse(data.generatedAt))
      && Array.isArray(data.burns) && data.periodTotals ? data : null;
  } catch {
    return null;
  }
}

function timestamp(value: string): string {
  return new Date(value).toLocaleString('en', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
  }) + ' UTC';
}

function number(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? formatCompact(value) : '—';
}

function usd(value: number | null | undefined, price = false): string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? new Intl.NumberFormat('en', { style: 'currency', currency: 'USD',
      maximumSignificantDigits: price ? 5 : 4, notation: price ? 'standard' : 'compact' }).format(value)
    : '—';
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className={styles.stat}><h3>{label}</h3><strong>{value}</strong><p>{detail}</p></article>;
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

function MetricCard({ label, metric }: { label: string; metric: UsageMetric }) {
  return (
    <article className={styles.metricCard}>
      <p>{label}</p>
      <strong title={metric.totalTokens.toLocaleString("en")}>
        {formatCompact(metric.totalTokens)}
      </strong>
      <span>tokens</span>
      <dl>
        <div>
          <dt>Input</dt>
          <dd>{formatCompact(metric.inputTokens)}</dd>
        </div>
        <div>
          <dt>Output</dt>
          <dd>{formatCompact(metric.outputTokens)}</dd>
        </div>
        <div>
          <dt>Calls</dt>
          <dd>{formatCompact(metric.calls)}</dd>
        </div>
      </dl>
    </article>
  );
}

function UsageChart({ daily }: { daily: PlatformUsage["daily"] }) {
  const width = 960;
  const height = 280;
  const chartTop = 20;
  const chartBottom = 235;
  const chartHeight = chartBottom - chartTop;
  const maxTokens = Math.max(1, ...daily.map((day) => day.totalTokens));
  const slotWidth = width / Math.max(1, daily.length);
  const barWidth = Math.max(5, slotWidth - 7);

  return (
    <div className={styles.chartWrap}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="usage-chart-title usage-chart-desc"
      >
        <title id="usage-chart-title">
          Daily platform token usage for the last 30 days
        </title>
        <desc id="usage-chart-desc">
          Stacked bars show input and output tokens for each UTC day.
        </desc>
        {[0, 0.5, 1].map((ratio) => {
          const y = chartBottom - chartHeight * ratio;
          return (
            <g key={ratio}>
              <line
                x1="0"
                y1={y}
                x2={width}
                y2={y}
                className={styles.gridLine}
              />
              <text x="4" y={y - 6} className={styles.gridLabel}>
                {formatCompact(Math.round(maxTokens * ratio))}
              </text>
            </g>
          );
        })}
        {daily.map((day, index) => {
          const inputHeight = (day.inputTokens / maxTokens) * chartHeight;
          const outputHeight = (day.outputTokens / maxTokens) * chartHeight;
          const x = index * slotWidth + (slotWidth - barWidth) / 2;
          const showLabel =
            index === 0 || index === daily.length - 1 || index % 7 === 0;
          return (
            <g key={day.date}>
              <title>{`${day.date}: ${day.totalTokens.toLocaleString("en")} tokens`}</title>
              <rect
                x={x}
                y={chartBottom - inputHeight}
                width={barWidth}
                height={Math.max(0, inputHeight)}
                rx="2"
                className={styles.inputBar}
              />
              <rect
                x={x}
                y={chartBottom - inputHeight - outputHeight}
                width={barWidth}
                height={Math.max(0, outputHeight)}
                rx="2"
                className={styles.outputBar}
              />
              {showLabel && (
                <text
                  x={x + barWidth / 2}
                  y="262"
                  textAnchor="middle"
                  className={styles.dateLabel}
                >
                  {day.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default async function UsagePage() {
  const [usage, market, burns, supply] = await Promise.all([
    loadPlatformUsage(), loadTokenMarket(), loadBurns(), loadTokenSupply(),
  ]);
  const activity = usage?.activity;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const activityIsCurrent = activity?.monthStart.slice(0, 7) === currentMonth;
  const onchain = supply ?? (typeof burns?.currentSupply === 'number'
    && Number.isFinite(burns.currentSupply) && burns.currentSupply >= 0 ? burns : null);

  return (
    <MarketingShell>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.eyebrow}>
            <Activity aria-hidden="true" /> Platform telemetry
          </div>
          <h1>Hatcher in numbers</h1>
          <p>
            Platform activity, AI usage, and $HATCHER statistics in one place.
            Activity and market data update every few minutes.
          </p>
          <div className={styles.privacyNote}>
            <LockKeyhole aria-hidden="true" />
            Aggregate counts only. User and agent identities, prompts, chats,
            provider details, and costs stay private.
          </div>
        </section>

        <section className={styles.section} aria-labelledby="activity-title">
          <div className={styles.chartHeader}>
            <div><p>Calendar month · UTC</p><h2 id="activity-title">Platform activity</h2></div>
          </div>
          <div className={styles.statsGrid}>
            <Stat label="Active users this month" value={number(activityIsCurrent ? activity?.monthlyActiveUsers : null)}
              detail="Unique accounts with authenticated activity this calendar month." />
            <Stat label="Active agents this month" value={number(activityIsCurrent ? activity?.monthlyActiveAgents : null)}
              detail="Unique agents with a recorded AI call, assistant reply, or task run this month." />
            <Stat label="Total users" value={number(activity?.totalUsers)} detail="Currently registered accounts." />
            <Stat label="Total agents" value={number(activity?.totalAgents)} detail="Existing agents, including sleeping and paused. Retired agents are excluded." />
          </div>
          <p className={styles.sourceNote}>
            {activity && activityIsCurrent && usage ? `Month to date, from ${timestamp(activity.monthStart)}. Updated ${timestamp(usage.generatedAt)}.`
              : 'Monthly activity is temporarily unavailable. Missing values are shown as —.'}
            {' '}Each user and agent is counted once. An idle running agent does not count as active.
          </p>
        </section>

        <div className={styles.sectionHeading}><p>Input, output &amp; calls</p><h2>AI usage</h2></div>

        {usage ? (
          <>
            <section className={styles.metrics} aria-label="Token usage totals">
              <MetricCard label="Lifetime" metric={usage.lifetime} />
              <MetricCard label="This month" metric={usage.month} />
              <MetricCard label="Today" metric={usage.today} />
            </section>

            <section
              className={styles.chartCard}
              aria-labelledby="daily-volume-title"
            >
              <div className={styles.chartHeader}>
                <div>
                  <p>Last 30 days</p>
                  <h2 id="daily-volume-title">Daily token volume</h2>
                </div>
                <div className={styles.legend} aria-label="Chart legend">
                  <span>
                    <i className={styles.inputKey} /> Input
                  </span>
                  <span>
                    <i className={styles.outputKey} /> Output
                  </span>
                </div>
              </div>
              <UsageChart daily={usage.daily} />
              <footer className={styles.chartFooter}>
                <span>All periods use UTC.</span>
                <span>
                  Tracking since{" "}
                  {usage.firstRecordedAt
                    ? new Date(usage.firstRecordedAt).toLocaleDateString("en", {
                        dateStyle: "medium",
                      })
                    : "the first recorded request"}
                  .
                </span>
                <span>
                  Updated{" "}
                  {new Date(usage.generatedAt).toLocaleString("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  })}{" "}
                  UTC.
                </span>
              </footer>
            </section>
          </>
        ) : (
          <section className={styles.unavailable}>
            <Activity aria-hidden="true" />
            <h2>Usage data is temporarily unavailable</h2>
            <p>
              The dashboard could not load the latest aggregate. Please check
              again shortly.
            </p>
          </section>
        )}

        <section className={styles.section} aria-labelledby="token-title">
          <div className={styles.chartHeader}>
            <div><p>Solana utility token</p><h2 id="token-title">$HATCHER market</h2></div>
            <Link className={styles.sourceLink} href="/token">Token hub <ArrowUpRight size={15} aria-hidden /></Link>
          </div>
          <div className={styles.statsGrid}>
            <Stat label="Price" value={usd(market?.priceUsd, true)} detail="USD per $HATCHER." />
            <Stat label="Market cap" value={usd(market?.marketCapUsd)} detail="Reported by DEX Screener." />
            <Stat label="24h volume" value={usd(market?.volume24hUsd)} detail="Across tracked HATCHER base-token pools." />
            <Stat label="Liquidity" value={usd(market?.liquidityUsd)} detail="Across those same pools." />
          </div>
          <p className={styles.sourceNote}>{market ? <>
            <a href={market.sourceUrl} target="_blank" rel="noopener noreferrer">DEX Screener</a>
            {` · ${market.pairCount} pools · Price and market cap from the most liquid pool. Snapshot ${timestamp(market.generatedAt)}.`}
          </> : 'Market data is temporarily unavailable.'}</p>
        </section>

        <section className={styles.section} aria-labelledby="burn-title">
          <div className={styles.chartHeader}>
            <div><p>On-chain supply</p><h2 id="burn-title">$HATCHER burns</h2></div>
            <a className={styles.sourceLink} href={`https://solscan.io/token/${HATCH_TOKEN_MINT}`} target="_blank" rel="noopener noreferrer">View mint <ArrowUpRight size={15} aria-hidden /></a>
          </div>
          <div className={styles.statsGrid}>
            <Stat label="Current supply" value={number(onchain?.currentSupply)} detail="$HATCHER on Solana." />
            <Stat label="Total burned" value={number(onchain?.totalBurned)} detail="Original 1B supply minus current on-chain supply." />
            <Stat label="Original supply burned" value={typeof onchain?.burnedShareOfOriginalSupply === 'number'
              ? new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 2 }).format(onchain.burnedShareOfOriginalSupply) : '—'} detail="Share of the original token supply." />
            <Stat label="Burned in last 30 days" value={number(burns?.periodTotals.month)} detail="Rolling 30 days, within the scanned transaction history." />
          </div>
          {onchain && <p className={styles.sourceNote}>Supply verified on Solana · Snapshot {timestamp(onchain.generatedAt)}.</p>}
          <p className={styles.sourceNote}>{burns
            ? `Last 24h: ${number(burns.periodTotals.day)} HATCHER · Last 7d: ${number(burns.periodTotals.week)} HATCHER. On-chain snapshot ${timestamp(burns.generatedAt)}. Burn data refreshes every 6 hours.`
            : 'Burn transaction history is temporarily unavailable.'}</p>
          {burns && <>
            <h3 className={styles.feedTitle}>Recent verified burns</h3>
            <ul className={styles.burnList}>{burns.burns.slice(0, 5).map(burn => (
              <li key={burn.id}><span>{number(burn.amount)} HATCHER</span>
                <span>{burn.blockTime ? timestamp(new Date(burn.blockTime * 1000).toISOString()) : 'Time unavailable'}</span>
                <a href={`https://solscan.io/tx/${encodeURIComponent(burn.signature)}`} target="_blank" rel="noopener noreferrer">Transaction <ArrowUpRight size={14} aria-hidden /></a>
              </li>
            ))}</ul>
            <p className={styles.sourceNote}>{burns.burns.length ? '' : 'No burns found in the scanned history. '}
              Period totals and recent burns cover {number(burns.scannedTransactions)} scanned transactions and may not include all historical burns.
            </p>
          </>}
        </section>

        <section className={styles.cta}>
          <div>
            <p>Put those tokens to work</p>
            <h2>Hatch an agent and give it a real job.</h2>
          </div>
          <Link href="/create">
            Create an agent <ArrowUpRight aria-hidden="true" />
          </Link>
        </section>
      </main>
    </MarketingShell>
  );
}

export const generateMetadata = localizedMetadata('/usage', pageMetadata());
