import type { Metadata } from "next";
import { Activity, ArrowUpRight, LockKeyhole } from "lucide-react";
import { MarketingShell } from "@/components/marketing/v3/MarketingShell";
import { Link } from "@/i18n/routing";
import { buildLanguagesMap } from "@/lib/seo";
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
}

export function generateMetadata(): Metadata {
  return {
    title: "Platform usage — Hatcher",
    description:
      "Daily, monthly, and lifetime token volume across the Hatcher platform.",
    alternates: {
      canonical: "/usage",
      languages: buildLanguagesMap("/usage"),
    },
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
  const usage = await loadPlatformUsage();

  return (
    <MarketingShell>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.eyebrow}>
            <Activity aria-hidden="true" /> Platform telemetry
          </div>
          <h1>Hatcher in numbers</h1>
          <p>
            A transparent view of aggregate token volume across the platform,
            updated every few minutes.
          </p>
          <div className={styles.privacyNote}>
            <LockKeyhole aria-hidden="true" />
            Aggregate counts only. Prompts, chats, users, agents, providers, and
            costs are never exposed here.
          </div>
        </section>

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
