"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Bot,
  Check,
  Copy,
  ExternalLink,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "@/i18n/routing";
import { api, type PublicTraderData } from "@/lib/api";
import {
  buildPublicActivity,
  type PublicActivityRow,
  type PublicActivityScope,
} from "@/components/traders/publicActivity";

function shortAddress(value: string | null, start = 7, end = 5) {
  return value
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : "Unavailable";
}

function numeric(value: string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUsd(value: string | null | undefined, compact = false) {
  const amount = numeric(value);
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : amount < 1 ? 8 : 2,
  }).format(amount);
}

function formatTokenAmount(
  value: string | null | undefined,
  maximumFractionDigits = 4,
) {
  const amount = numeric(value);
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(amount) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits,
  }).format(amount);
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    equifold_buy: "BUY",
    equifold_sell: "SELL",
    dex_swap: "SWAP",
    equifold_collect_fees: "CLAIM FEES",
    equifold_launch: "LAUNCH",
    token_market_buy: "BUY",
    token_market_sell: "SELL",
  };
  return labels[action] ?? action.replaceAll("_", " ").toUpperCase();
}

function actionTone(action: string) {
  if (action === "equifold_buy" || action === "token_market_buy")
    return "text-[var(--status-live)]";
  if (action === "equifold_sell" || action === "token_market_sell")
    return "text-[var(--color-destructive)]";
  if (action === "equifold_collect_fees") return "text-[var(--color-warning)]";
  return "text-[var(--color-info)]";
}

function activitySource(activity: PublicActivityRow) {
  if (activity.source === "agent") return "Agent action";
  if (activity.source === "agent-wallet") return "Agent wallet";
  return "Token market";
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 border-b border-[var(--border-default)] px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[11px] font-medium text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1.5 truncate text-lg font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-44 items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
      {children}
    </div>
  );
}

export function PublicTraderPageClient() {
  const { id } = useParams<{ id: string }>();
  const [trader, setTrader] = useState<PublicTraderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activityScope, setActivityScope] =
    useState<PublicActivityScope>("all");
  const [activityLimit, setActivityLimit] = useState(20);
  const activeRequest = useRef(false);

  const load = useCallback(
    async (initial = false) => {
      if (activeRequest.current) return;
      activeRequest.current = true;
      if (!initial) setRefreshing(true);
      try {
        const response = await api.getAgentPublicTrader(id);
        if (!response.success) {
          throw new Error(response.error || "This trader page is unavailable.");
        }
        setTrader(response.data);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "This trader page is unavailable.",
        );
      } finally {
        activeRequest.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => void load(false), 5_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const chartData = useMemo(
    () =>
      [...(trader?.liveTrades ?? [])]
        .reverse()
        .filter((trade) => numeric(trade.priceUsd) !== null)
        .map((trade) => ({
          time: trade.timestamp,
          label: formatTime(trade.timestamp),
          price: numeric(trade.priceUsd),
          side: trade.side,
        })),
    [trader?.liveTrades],
  );

  const treasuryValue = useMemo(
    () =>
      trader?.chain.balances.reduce(
        (sum, balance) => sum + (numeric(balance.usdValue) ?? 0),
        0,
      ) ?? 0,
    [trader?.chain.balances],
  );

  const publicActivity = useMemo(
    () =>
      buildPublicActivity({
        activity: trader?.activity ?? [],
        liveTrades: trader?.liveTrades ?? [],
        chain: { walletAddress: trader?.chain.walletAddress ?? null },
        token: trader?.token ? { symbol: trader.token.symbol } : null,
      }),
    [
      trader?.activity,
      trader?.chain.walletAddress,
      trader?.liveTrades,
      trader?.token,
    ],
  );
  const scopedActivity = publicActivity[activityScope];
  const visibleActivity = scopedActivity.slice(0, activityLimit);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] px-4 py-20">
        <div className="mx-auto max-w-[1500px] animate-pulse space-y-4">
          <div className="h-28 rounded-xl bg-[var(--bg-elevated)]" />
          <div className="h-20 rounded-xl bg-[var(--bg-elevated)]" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.85fr)]">
            <div className="h-[420px] rounded-xl bg-[var(--bg-elevated)]" />
            <div className="h-[420px] rounded-xl bg-[var(--bg-elevated)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!trader || error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[var(--bg-base)] px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)]">
            <Activity className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">
            Trader page unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            This agent has not published a public trader page, or the page was
            disabled.
          </p>
          <Link
            href="/traders"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border-default)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Explore traders
          </Link>
        </div>
      </div>
    );
  }

  const tokenSymbol = trader.token?.symbol ?? "AGENT";
  const marketUpdatedAt = trader.market.updatedAt ?? trader.refreshedAt;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/traders"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Explore traders
          </Link>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span className="hidden sm:inline">
              Updated {formatTime(marketUpdatedAt)}
            </span>
            <button
              type="button"
              onClick={() => void load(false)}
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 font-semibold transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        <header className="flex flex-col gap-6 border-b border-[var(--border-default)] pb-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {trader.agent.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trader.agent.avatarUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl border border-[var(--border-default)] object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--status-live-border)] bg-[var(--status-live-bg)] text-[var(--status-live)] sm:h-20 sm:w-20">
                <Bot className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="truncate text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {trader.agent.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--status-live)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {trader.chain.autonomousTradingEnabled
                    ? "Autonomous trader"
                    : "Public onchain portfolio"}
                </span>
              </div>
              <p className="mt-1 font-mono text-sm text-[var(--text-secondary)]">
                ${tokenSymbol}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--status-live-border)] bg-[var(--status-live-bg)] px-2.5 text-xs font-medium text-[var(--status-live)]">
                  <Landmark className="h-3.5 w-3.5" />
                  Robinhood Chain
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!trader.chain.walletAddress) return;
                    await navigator.clipboard.writeText(
                      trader.chain.walletAddress,
                    );
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1_500);
                  }}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--border-default)] px-2.5 font-mono text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {shortAddress(trader.chain.walletAddress)}
                </button>
              </div>
            </div>
          </div>
          <a
            href={trader.tokenization.launchUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Trade on Equifold
            <ExternalLink className="h-4 w-4" />
          </a>
        </header>

        <section className="mt-5 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5">
            <Metric
              label="Token price"
              value={formatUsd(trader.market.priceUsd)}
            />
            <Metric
              label="Market cap"
              value={formatUsd(trader.market.marketCapUsd, true)}
            />
            <Metric
              label="24h volume"
              value={formatUsd(trader.market.volume24hUsd, true)}
            />
            <Metric
              label="Estimated liquidity"
              value={formatUsd(trader.market.liquidityUsd, true)}
              detail={
                trader.market.liquidityUsd
                  ? "Quote-side estimate"
                  : "Unavailable for this venue"
              }
            />
            <Metric
              label="Holders"
              value={(trader.market.holderCount ?? 0).toLocaleString()}
              detail={`${trader.market.buyCount ?? 0} buys · ${trader.market.sellCount ?? 0} sells`}
            />
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(340px,0.85fr)]">
          <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">${tokenSymbol} price</h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Indexed Equifold executions
                </p>
              </div>
              <p className="font-mono text-sm font-semibold text-[var(--status-live)]">
                {formatUsd(trader.market.priceUsd)}
              </p>
            </div>
            <div className="h-[340px] p-3 sm:h-[410px] sm:p-4">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 8, left: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="publicTraderPriceFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--color-accent)"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-accent)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--border-default)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      minTickGap={34}
                      tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="price"
                      orientation="right"
                      domain={["auto", "auto"]}
                      tickFormatter={(value) =>
                        Number(value).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumSignificantDigits: 4,
                        })
                      }
                      tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip
                      formatter={(value) => [formatUsd(String(value)), "Price"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.time
                          ? formatDateTime(String(payload[0].payload.time))
                          : ""
                      }
                      contentStyle={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 8,
                        color: "var(--text-primary)",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                      fill="url(#publicTraderPriceFill)"
                      activeDot={{ r: 4, fill: "var(--color-accent)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState>
                  Price history appears after at least two indexed trades.
                </EmptyState>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Live trades</h2>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--status-live)]" />
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                5s refresh
              </span>
            </div>
            {trader.liveTrades.length ? (
              <div className="max-h-[410px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-[var(--bg-surface)] text-[10px] text-[var(--text-muted)]">
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="px-4 py-2.5 font-medium">Time</th>
                      <th className="px-2 py-2.5 font-medium">Type</th>
                      <th className="px-2 py-2.5 text-right font-medium">
                        Price
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {trader.liveTrades.map((trade, index) => (
                      <tr
                        key={`${trade.transactionHash}-${index}`}
                        className="hover:bg-[var(--bg-hover)]"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[10px] text-[var(--text-muted)]">
                          {formatTime(trade.timestamp)}
                        </td>
                        <td
                          className={`px-2 py-2.5 font-semibold ${
                            trade.side === "BUY"
                              ? "text-[var(--status-live)]"
                              : "text-[var(--color-destructive)]"
                          }`}
                        >
                          {trade.side}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-[11px]">
                          {formatUsd(trade.priceUsd)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <a
                            href={`${trader.chain.explorerUrl}/tx/${trade.transactionHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--text-secondary)] hover:text-[var(--color-accent)]"
                          >
                            {formatUsd(trade.valueUsd)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>No indexed token trades yet.</EmptyState>
            )}
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[var(--color-accent)]" />
                <h2 className="text-sm font-semibold">Treasury</h2>
              </div>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {formatUsd(String(treasuryValue), true)}
              </span>
            </div>
            <div className="divide-y divide-[var(--border-default)] sm:hidden">
              {trader.chain.balances.map((balance) => {
                const usdValue = numeric(balance.usdValue) ?? 0;
                const allocation =
                  treasuryValue > 0 ? (usdValue / treasuryValue) * 100 : 0;
                return (
                  <div
                    key={balance.address ?? "native"}
                    className="space-y-2.5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--text-secondary)]">
                          {balance.symbol.slice(0, 2)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)]">
                            {balance.symbol}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
                            {balance.kind === "agent-token"
                              ? "Agent token"
                              : (balance.name ?? "Tracked asset")}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[11px] text-[var(--text-primary)]">
                          {formatTokenAmount(balance.balance, 6)}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                          {formatUsd(balance.usdValue)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)]"
                          style={{ width: `${Math.min(100, allocation)}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-[10px] text-[var(--text-muted)]">
                        {allocation.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="text-[10px] text-[var(--text-muted)]">
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="px-4 py-2.5 font-medium">Asset</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Balance
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      USD value
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Allocation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {trader.chain.balances.map((balance) => {
                    const usdValue = numeric(balance.usdValue) ?? 0;
                    const allocation =
                      treasuryValue > 0 ? (usdValue / treasuryValue) * 100 : 0;
                    return (
                      <tr
                        key={balance.address ?? "native"}
                        className="hover:bg-[var(--bg-hover)]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--text-secondary)]">
                              {balance.symbol.slice(0, 2)}
                            </span>
                            <div>
                              <p className="font-semibold text-[var(--text-primary)]">
                                {balance.symbol}
                              </p>
                              <p className="mt-0.5 max-w-40 truncate text-[10px] text-[var(--text-muted)]">
                                {balance.kind === "agent-token"
                                  ? "Agent token"
                                  : (balance.name ?? "Tracked asset")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-[11px]">
                          {formatTokenAmount(balance.balance, 6)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-[11px]">
                          {formatUsd(balance.usdValue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="ml-auto flex w-24 items-center justify-end gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                              <div
                                className="h-full rounded-full bg-[var(--color-accent)]"
                                style={{
                                  width: `${Math.min(100, allocation)}%`,
                                }}
                              />
                            </div>
                            <span className="w-9 text-right text-[10px] text-[var(--text-muted)]">
                              {allocation.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-3">
              <Landmark className="h-4 w-4 text-[var(--color-accent)]" />
              <h2 className="text-sm font-semibold">Token & account</h2>
            </div>
            <dl className="grid sm:grid-cols-2">
              {[
                [
                  "Token",
                  `${trader.token?.name ?? trader.agent.name} ($${tokenSymbol})`,
                ],
                ["Equifold project", trader.tokenization.projectId],
                ["Launch venue", trader.tokenization.launchVenue ?? "Unknown"],
                [
                  "Generation",
                  trader.tokenization.launchGeneration
                    ? `Gen ${trader.tokenization.launchGeneration}`
                    : "Unknown",
                ],
                ["Fee mode", trader.tokenization.feeMode],
                ["Account", trader.chain.accountType],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-[var(--border-default)] px-4 py-4 even:sm:border-l"
                >
                  <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {label}
                  </dt>
                  <dd className="mt-1.5 truncate text-sm font-medium text-[var(--text-primary)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="space-y-3 px-4 py-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Token contract
                </p>
                <a
                  href={`${trader.chain.explorerUrl}/address/${trader.tokenization.tokenAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex max-w-full items-center gap-1.5 font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--color-accent)]"
                >
                  <span className="truncate">
                    {trader.tokenization.tokenAddress}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-[var(--status-live-border)] bg-[var(--status-live-bg)] p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-live)]" />
                <p className="text-xs leading-5 text-[var(--text-secondary)]">
                  The creator is the agent&apos;s ERC-4337 account. Only
                  confirmed onchain activity is shown; private keys, policies
                  and pending jobs are never published.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--color-accent)]" />
              <h2 className="text-sm font-semibold">Onchain activity</h2>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              Confirmed agent actions and indexed token trades
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-default)] px-4 py-3">
            {(
              [
                ["all", "All activity", publicActivity.all.length],
                ["agent", "Agent actions", publicActivity.agent.length],
                ["market", "Token trades", publicActivity.market.length],
              ] as const
            ).map(([scope, label, count]) => (
              <button
                key={scope}
                type="button"
                onClick={() => {
                  setActivityScope(scope);
                  setActivityLimit(20);
                }}
                className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-semibold transition-colors ${
                  activityScope === scope
                    ? "border-[var(--color-accent)] bg-[var(--status-live-bg)] text-[var(--text-primary)]"
                    : "border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label}
                <span className="font-mono text-[10px] opacity-70">
                  {count}
                </span>
              </button>
            ))}
          </div>
          {scopedActivity.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left text-xs">
                  <thead className="text-[10px] text-[var(--text-muted)]">
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="px-4 py-2.5 font-medium">Time</th>
                      <th className="px-3 py-2.5 font-medium">Source</th>
                      <th className="px-3 py-2.5 font-medium">Type</th>
                      <th className="px-3 py-2.5 font-medium">Asset / pair</th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Amount
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        USD value
                      </th>
                      <th className="px-4 py-2.5 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {visibleActivity.map((activity) => (
                      <tr
                        key={activity.id}
                        className="hover:bg-[var(--bg-hover)]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[var(--text-muted)]">
                          {formatDateTime(activity.createdAt)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-[var(--text-secondary)]">
                            <Check className="h-3.5 w-3.5 text-[var(--status-live)]" />
                            {activitySource(activity)}
                          </span>
                        </td>
                        <td
                          className={`px-3 py-3 font-semibold ${actionTone(activity.action)}`}
                        >
                          {actionLabel(activity.action)}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px]">
                          {activity.pair}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-[11px]">
                          {formatTokenAmount(activity.amount, 6)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-[11px]">
                          {formatUsd(activity.amountUsd)}
                        </td>
                        <td className="max-w-sm px-4 py-3 text-[11px] leading-5 text-[var(--text-secondary)]">
                          <div className="flex items-start justify-between gap-3">
                            <span>
                              {activity.publicThesis ??
                                (activity.traderAddress
                                  ? `Trader ${shortAddress(activity.traderAddress)}`
                                  : "Indexed Equifold token trade")}
                            </span>
                            {activity.transactionHash ? (
                              <a
                                href={`${trader.chain.explorerUrl}/tx/${activity.transactionHash}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Open transaction"
                                className="shrink-0 text-[var(--text-muted)] hover:text-[var(--color-accent)]"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleActivity.length < scopedActivity.length ? (
                <div className="border-t border-[var(--border-default)] p-3 text-center">
                  <button
                    type="button"
                    onClick={() => setActivityLimit((limit) => limit + 20)}
                    className="inline-flex h-9 items-center rounded-md border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    Show 20 more ·{" "}
                    {scopedActivity.length - visibleActivity.length} remaining
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState>
              {activityScope === "agent"
                ? "No confirmed agent actions have been published yet."
                : "No indexed token trades have been published yet."}
            </EmptyState>
          )}
        </section>

        <footer className="mt-6 flex flex-col gap-2 border-t border-[var(--border-default)] pt-5 text-xs leading-5 text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Onchain data can be delayed by indexing. Values are informational
            and are not financial advice.
          </p>
          <p className="font-mono">Chain ID {trader.chain.chainId}</p>
        </footer>
      </div>
    </div>
  );
}
