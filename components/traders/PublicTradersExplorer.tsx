"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  ChevronDown,
  ExternalLink,
  Landmark,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { api, type PublicTraderDirectoryData } from "@/lib/api";

type Trader = PublicTraderDirectoryData["traders"][number];
type Sort = "marketCap" | "volume24h" | "newest" | "activity";
type Venue = "all" | "weth" | "sushi" | "stock";

const SORT_OPTIONS: Array<{ value: Sort; label: string }> = [
  { value: "marketCap", label: "Market cap" },
  { value: "volume24h", label: "24h volume" },
  { value: "activity", label: "Recent activity" },
  { value: "newest", label: "Newest launch" },
];

const VENUE_OPTIONS: Array<{ value: Venue; label: string }> = [
  { value: "all", label: "All venues" },
  { value: "weth", label: "WETH" },
  { value: "sushi", label: "SushiSwap" },
  { value: "stock", label: "Stock" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "running", label: "Running" },
  { value: "paused", label: "Paused" },
  { value: "sleeping", label: "Sleeping" },
] as const;

function numeric(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUsd(value: string | null | undefined, compact = false): string {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  if (compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(parsed);
  }
  const maximumFractionDigits =
    parsed >= 1 ? 2 : parsed >= 0.01 ? 4 : parsed >= 0.0001 ? 6 : 10;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(parsed);
}

function formatInteger(value: number | undefined): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(
    value ?? 0,
  );
}

function shortAddress(value: string | null): string {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Unavailable";
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return "No activity yet";
  const difference = Date.now() - Date.parse(value);
  if (!Number.isFinite(difference) || difference < 0) return "Just now";
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function activityLabel(action: string): string {
  if (action === "equifold_buy") return "BUY";
  if (action === "equifold_sell") return "SELL";
  if (action === "equifold_collect_fees") return "CLAIM FEES";
  if (action === "dex_swap") return "SWAP";
  if (action === "onchain_swap") return "SWAP";
  if (action === "equifold_burn") return "BURN";
  return action.replaceAll("_", " ").toUpperCase();
}

function activityTone(action: string): string {
  if (action === "equifold_sell") return "text-[var(--status-error)]";
  if (action === "equifold_burn") return "text-[var(--status-error)]";
  if (action === "dex_swap") return "text-[var(--color-info)]";
  if (action === "equifold_collect_fees") return "text-[var(--color-warning)]";
  return "text-[var(--status-live)]";
}

function SelectControl({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-0 pl-3 pr-9 text-sm font-medium text-[var(--text-secondary)] outline-none transition-colors hover:text-[var(--text-primary)] focus:border-[var(--color-accent)]"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
    </label>
  );
}

export function PublicTradersExplorer({
  initialData,
}: {
  initialData: PublicTraderDirectoryData | null;
}) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("marketCap");
  const [venue, setVenue] = useState<Venue>("all");
  const [status, setStatus] = useState("all");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [loading, setLoading] = useState(!initialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const hadInitialData = useRef(Boolean(initialData));

  useEffect(() => {
    if (hadInitialData.current && !hasInteracted) return;
    const currentRequest = ++requestId.current;
    const timeout = window.setTimeout(
      () => {
        setLoading(true);
        setError(null);
        void api
          .getPublicTraders({
            q: query.trim() || undefined,
            sort,
            venue,
            status,
            page: 1,
            limit: 24,
          })
          .then((response) => {
            if (currentRequest !== requestId.current) return;
            if (response.success) setData(response.data);
            else setError(response.error);
          })
          .finally(() => {
            if (currentRequest === requestId.current) setLoading(false);
          });
      },
      query ? 250 : 0,
    );
    return () => window.clearTimeout(timeout);
  }, [hasInteracted, query, sort, status, venue]);

  const traders = data?.traders ?? [];
  const publicCount = data?.pagination.total ?? 0;
  const updatedTime = useMemo(
    () =>
      data?.refreshedAt
        ? new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
          }).format(new Date(data.refreshedAt))
        : null,
    [data?.refreshedAt],
  );

  const updateQuery = (value: string) => {
    setHasInteracted(true);
    setQuery(value);
  };

  const loadMore = async () => {
    if (!data?.pagination.hasMore || loadingMore) return;
    setLoadingMore(true);
    const response = await api.getPublicTraders({
      q: query.trim() || undefined,
      sort,
      venue,
      status,
      page: data.pagination.page + 1,
      limit: data.pagination.limit,
    });
    if (response.success) {
      setData((current) => {
        if (!current) return response.data;
        const seen = new Set(current.traders.map((trader) => trader.agent.id));
        return {
          ...response.data,
          traders: [
            ...current.traders,
            ...response.data.traders.filter(
              (trader) => !seen.has(trader.agent.id),
            ),
          ],
        };
      });
    } else {
      setError(response.error);
    }
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <section className="border-b border-[var(--border-default)]">
        <div className="mx-auto w-full max-w-[1500px] px-4 pb-7 pt-10 sm:px-6 sm:pb-9 sm:pt-14 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                Explore traders
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                Follow public agent activity across Robinhood Chain.
              </p>
            </div>
            <Link
              href="/explore"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[var(--border-default)] px-3.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Explore all agents
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-[minmax(360px,1fr)_180px_170px_170px_auto]">
            <label className="relative block">
              <span className="sr-only">Search public traders</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Search agents, tokens, symbols, or wallets"
                className="h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--color-accent)]"
              />
            </label>
            <SelectControl
              value={sort}
              onChange={(value) => {
                setHasInteracted(true);
                setSort(value as Sort);
              }}
              label="Sort traders"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </SelectControl>
            <SelectControl
              value={venue}
              onChange={(value) => {
                setHasInteracted(true);
                setVenue(value as Venue);
              }}
              label="Filter by venue"
            >
              {VENUE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectControl>
            <SelectControl
              value={status}
              onChange={(value) => {
                setHasInteracted(true);
                setStatus(value);
              }}
              label="Filter by status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectControl>
            <div className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-sm font-medium text-[var(--text-secondary)]">
              <SlidersHorizontal className="h-4 w-4 text-[var(--text-muted)]" />
              {publicCount.toLocaleString()} public{" "}
              {publicCount === 1 ? "trader" : "traders"}
            </div>
          </div>

          <div className="mt-3 flex min-h-5 items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              {error ?? (loading ? "Refreshing verified market data…" : "")}
            </span>
            {updatedTime ? (
              <span className="hidden sm:inline">Updated {updatedTime}</span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div
          className={`overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] transition-opacity ${
            loading && data ? "opacity-60" : ""
          }`}
          aria-busy={loading}
        >
          <div className="hidden grid-cols-[minmax(300px,1.65fr)_minmax(110px,0.7fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_90px_minmax(155px,1fr)_90px_120px] gap-4 border-b border-[var(--border-default)] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] xl:grid">
            <span>Trader</span>
            <span>Token price</span>
            <span>Market cap</span>
            <span>24h volume</span>
            <span>Holders</span>
            <span>Last action</span>
            <span>Updated</span>
            <span className="text-right">Open</span>
          </div>

          {loading && !data ? (
            <DirectorySkeleton />
          ) : traders.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                <Search className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">
                {query || venue !== "all" || status !== "all"
                  ? "No matching public traders"
                  : "No public traders yet"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                {query || venue !== "all" || status !== "all"
                  ? "Try another agent, token, venue, wallet, or status."
                  : "Public trader pages appear here after an owner opts in for a verified Equifold tokenized agent."}
              </p>
              <Link
                href="/create"
                className="mt-6 inline-flex h-10 items-center rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-white"
              >
                Hatch an agent
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-default)]">
              {traders.map((trader) => (
                <TraderRow key={trader.agent.id} trader={trader} />
              ))}
            </div>
          )}
        </div>

        {data?.pagination.hasMore ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {loadingMore ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : null}
            {loadingMore ? "Loading traders…" : "Load more traders"}
          </button>
        ) : null}
      </section>
    </div>
  );
}

function TraderRow({ trader }: { trader: Trader }) {
  const activity = trader.lastActivity;
  const updatedAt =
    activity?.createdAt ??
    trader.market.updatedAt ??
    trader.tokenization.launchedAt;
  const statusLive =
    trader.agent.status === "active" || trader.agent.status === "running";

  return (
    <article className="group relative px-4 py-4 transition-colors hover:bg-[var(--bg-hover)] focus-within:bg-[var(--bg-hover)] xl:grid xl:grid-cols-[minmax(300px,1.65fr)_minmax(110px,0.7fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_90px_minmax(155px,1fr)_90px_120px] xl:items-center xl:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {trader.agent.avatarUrl ? (
          <span
            className="h-12 w-12 shrink-0 rounded-full border border-[var(--border-default)] bg-cover bg-center sm:h-14 sm:w-14"
            style={{ backgroundImage: `url("${trader.agent.avatarUrl}")` }}
            aria-hidden="true"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--status-live-border)] bg-[var(--status-live-bg)] text-[var(--status-live)] sm:h-14 sm:w-14">
            <Bot className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/agent/${encodeURIComponent(trader.agent.slug)}/trader`}
              className="truncate text-base font-semibold tracking-[-0.02em] hover:text-[var(--color-accent)] sm:text-lg"
            >
              {trader.agent.name}
            </Link>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--status-live)]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  statusLive ? "bg-current" : "border border-current"
                }`}
              />
              {trader.chain.autonomousTradingEnabled
                ? "Autonomous"
                : "Public portfolio"}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-[var(--text-secondary)]">
            ${trader.token.symbol}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            <span className="inline-flex h-6 items-center gap-1 rounded-md border border-[var(--status-live-border)] bg-[var(--status-live-bg)] px-2 text-[var(--status-live)]">
              <Landmark className="h-3 w-3" />
              Robinhood Chain
            </span>
            <span className="inline-flex h-6 items-center gap-1 rounded-md border border-[var(--border-default)] px-2 font-mono">
              <Wallet className="h-3 w-3" />
              {shortAddress(trader.chain.walletAddress)}
            </span>
            <a
              href={trader.tokenization.launchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-6 items-center gap-1 rounded-md border border-[var(--border-default)] px-2 transition-colors hover:text-[var(--text-primary)]"
            >
              {trader.tokenization.projectId}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4 xl:contents">
        <DirectoryMetric
          label="Token price"
          value={formatUsd(trader.market.priceUsd)}
          mono
        />
        <DirectoryMetric
          label="Market cap"
          value={formatUsd(trader.market.marketCapUsd, true)}
          mono
        />
        <DirectoryMetric
          label="24h volume"
          value={formatUsd(trader.market.volume24hUsd, true)}
          mono
        />
        <DirectoryMetric
          label="Holders"
          value={
            trader.market.available
              ? formatInteger(trader.market.holderCount)
              : "—"
          }
          mono
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 border-t border-[var(--border-default)] pt-4 xl:contents">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)] xl:hidden">
            Last action
          </p>
          {activity ? (
            <>
              <p
                className={`mt-1 text-xs font-semibold ${activityTone(activity.action)}`}
              >
                {activityLabel(activity.action)}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] text-[var(--text-secondary)]">
                {activity.pair}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              No confirmed action
            </p>
          )}
        </div>
        <p className="hidden text-xs text-[var(--text-muted)] xl:block">
          {relativeTime(updatedAt)}
        </p>
        <Link
          href={`/agent/${encodeURIComponent(trader.agent.slug)}/trader`}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors group-hover:border-[var(--color-accent)]/50 hover:text-[var(--text-primary)] xl:justify-self-end"
        >
          View trader
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function DirectoryMetric({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)] xl:hidden">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-semibold text-[var(--text-primary)] xl:mt-0 xl:text-xs ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="divide-y divide-[var(--border-default)]">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="grid animate-pulse gap-4 px-4 py-5 xl:grid-cols-[minmax(300px,1.65fr)_repeat(6,minmax(90px,0.7fr))_120px]"
        >
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-[var(--bg-elevated)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-[var(--bg-elevated)]" />
              <div className="h-3 w-52 rounded bg-[var(--bg-elevated)]" />
            </div>
          </div>
          {Array.from({ length: 7 }, (_, metric) => (
            <div
              key={metric}
              className="hidden h-4 rounded bg-[var(--bg-elevated)] xl:block"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
