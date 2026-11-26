"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AgentPitConnection, AgentPitEntry } from "@/lib/api/agentpit";
import { useAgentContext } from "../AgentContext";
import { AgentPitConnectCard } from "./AgentPitConnectCard";

const number = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
        value,
      );
const panel =
  "rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] px-4 text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";
const time = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
// Defense in depth for links from provider data, including test/older API responses.
function safeLink(value: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      [
        "agentpit.dev",
        "app.agentpit.dev",
        "polymarket.com",
        "www.polymarket.com",
      ].includes(url.hostname) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function Entries({
  title,
  rows,
  empty,
  kind,
  total,
}: {
  title: string;
  rows: AgentPitEntry[] | null;
  empty: string;
  kind: "positions" | "orders" | "activity";
  total?: number;
}) {
  return (
    <section className={panel} aria-label={title}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] p-5">
        <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="text-xs text-[var(--text-muted)]">
          {kind === "activity"
            ? "Latest 10 fills & payouts"
            : total === undefined
              ? ""
              : `${total} total`}
        </span>
      </div>
      {!rows ? (
        <p className="p-5 text-sm text-[var(--text-secondary)]">
          AgentPit did not return this data.
        </p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm text-[var(--text-secondary)]">{empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--border-default)]">
          {rows.map((row, index) => (
            <li
              key={index}
              className="flex flex-wrap items-start justify-between gap-3 p-5"
            >
              <div className="min-w-0 flex-1 basis-48">
                {safeLink(row.url) ? (
                  <a
                    href={safeLink(row.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-words text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--border-default)] underline-offset-4"
                  >
                    {row.title}
                  </a>
                ) : (
                  <p className="break-words text-sm font-medium text-[var(--text-primary)]">
                    {row.title}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {[
                    row.side,
                    row.outcome,
                    row.shares == null ? null : `${number(row.shares)} shares`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Details unavailable"}
                </p>
                {row.timestamp && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {time(row.timestamp)}
                  </p>
                )}
              </div>
              <div className="text-right text-sm tabular-nums text-[var(--text-primary)]">
                <p>
                  {number(row.valueUsd)}{" "}
                  <span className="text-xs text-[var(--text-muted)]">
                    apUSD
                  </span>
                </p>
                {kind === "positions" && row.sellUsd !== null && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Sell value {number(row.sellUsd)}
                  </p>
                )}
                {kind === "orders" && row.price !== null && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Limit {number(row.price * 100)}¢
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AgentPitTab() {
  const { agent, openChatWithDraft } = useAgentContext();
  const [data, setData] = useState<AgentPitConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [changingStrategy, setChangingStrategy] = useState(false);
  const sequence = useRef(0);
  const refresh = useCallback(async (quiet = false) => {
    const current = ++sequence.current;
    if (!quiet) setLoading(true);
    setError("");
    try {
      const result = await api.getAgentPitConnection(agent.id);
      if (current !== sequence.current) return;
      if (!result.success)
        throw new Error(result.error || "Unable to load AgentPit.");
      setData(result.data);
    } catch (e) {
      if (current === sequence.current)
        setError(e instanceof Error ? e.message : "Unable to load AgentPit.");
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [agent.id]);
  const invalidateRequests = useCallback(() => { sequence.current++; }, []);
  useEffect(() => {
    setData(null);
    void refresh();
    return () => {
      invalidateRequests();
    };
  }, [refresh, invalidateRequests]);
  useEffect(() => {
    if (changingStrategy || data?.status !== "connected") return;
    const update = () => { if (document.visibilityState === "visible") void refresh(true); };
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, [changingStrategy, data?.status, refresh]);
  useEffect(() => {
    setName(data?.account?.name ?? "");
  }, [data?.account?.name]);
  const discuss = () =>
    openChatWithDraft(
      "Read my current AgentPit paper portfolio and automatic strategy status. Help me adapt the strategy in AGENTPIT_STRATEGY.md to my preferences. I choose the risk, trade sizes and markets; Hatcher adds no paper risk limits. Save the agreed strategy before researching or trading. Explain the current schedule and do not create a duplicate. If paused, leave it paused while we discuss.",
    );
  async function changeStrategy(enabled: boolean) {
    invalidateRequests();
    setLoading(false);
    setChangingStrategy(true);
    setError("");
    try {
      const result = await api.setAgentPitStrategy(agent.id, enabled);
      if (!result.success) throw new Error(result.error || "Unable to change the strategy.");
      setData(current => current ? {...current, autopilot: result.data} : current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change the strategy.");
    } finally {
      setChangingStrategy(false);
    }
  }
  async function rename(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    setError("");
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(name)) {
      setError("Use 1–15 letters, digits or underscores.");
      return;
    }
    setSaving(true);
    try {
      const result = await api.renameAgentPitAccount(agent.id, name);
      if (!result.success)
        throw new Error(result.error || "Unable to rename this account.");
      setNotice("Name saved in AgentPit.");
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to rename this account.",
      );
    } finally {
      setSaving(false);
    }
  }
  const p = data?.portfolio;
  return (
    <div className="space-y-5" aria-label="AgentPit workspace">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={22} />
            <h2 className="text-xl font-semibold">AgentPit</h2>
            <span className="rounded-full border border-[var(--border-default)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Paper trading
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Your agent’s prediction-market portfolio. Simulated apUSD, live
            market prices.
          </p>
        </div>
        <button
          type="button"
          className={button}
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh portfolio
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-4 text-sm text-[var(--color-destructive)]"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-[var(--text-secondary)]">
          {notice}
        </p>
      )}
      {!data && loading && (
        <p
          role="status"
          className="flex items-center gap-2 py-8 text-sm text-[var(--text-secondary)]"
        >
          <Loader2 size={18} className="animate-spin" />
          Loading your AgentPit portfolio…
        </p>
      )}
      {data?.status === "not_connected" && (
        <AgentPitConnectCard
          agentId={agent.id}
          connected={false}
          onConnected={refresh}
          onDiscuss={discuss}
        />
      )}
      {data?.status === "connected" && data.account && (
        <>
          <section
            className={`${panel} flex flex-wrap items-start justify-between gap-5 p-5 sm:p-6`}
            aria-label="AgentPit account"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--status-live)]">
                Connected
              </p>
              <h3 className="mt-1 break-words text-xl font-semibold">
                {data.account.name}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                SKALE Base · Paper account
              </p>
              <p className="mt-2 break-all font-mono text-xs text-[var(--text-muted)]">
                {data.account.address}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <button
                type="button"
                className={`${button} bg-[var(--text-primary)] text-[var(--bg-base)]`}
                onClick={discuss}
              >
                <MessageSquare size={16} />
                Discuss strategy
              </button>
              {safeLink(p?.profileUrl ?? null) && (
                <a
                  href={safeLink(p?.profileUrl ?? null)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={button}
                >
                  Public profile
                  <ExternalLink size={14} />
                </a>
              )}
              {!safeLink(p?.profileUrl ?? null) && (
                <div className="flex max-w-60 flex-col gap-2">
                  <a href="https://app.agentpit.dev" target="_blank" rel="noopener noreferrer" className={button}>
                    Open AgentPit <ExternalLink size={14} />
                  </a>
                  <p className="text-xs text-[var(--text-muted)]">Your public profile appears after the first filled trade.</p>
                </div>
              )}
            </div>
          </section>
          <section className={`${panel} p-5 sm:p-6`} aria-label="Automatic paper strategy">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Automatic paper strategy</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {data.autopilot?.status === "active" ? `Enabled · ${data.autopilot.schedule}` : data.autopilot?.status === "paused" ? "Paused" : data.autopilot?.status === "starting" ? "Starting…" : data.autopilot?.status === "error" ? "Needs attention" : "Ready to start"}
                </p>
              </div>
              <button type="button" className={button} disabled={changingStrategy || data.autopilot?.status === "starting"}
                onClick={() => void changeStrategy(data.autopilot?.status !== "active")}>
                {changingStrategy && <Loader2 size={15} className="animate-spin" />}
                {changingStrategy ? "Updating…" : data.autopilot?.status === "active" ? "Pause strategy" : data.autopilot?.status === "paused" ? "Resume strategy" : data.autopilot?.status === "error" ? "Retry strategy" : "Start strategy"}
              </button>
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Your agent follows the strategy you agree on in chat. Starting reuses an existing AgentPit schedule, or creates an hourly review. A review may trade or choose to wait.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              You choose the risk, trade sizes, markets and cash reserve. Hatcher imposes no paper risk limits. Reviews use your AI Credits.
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Use Discuss strategy to adjust preferences. Pause stops future orders; an order already submitted can still finish.</p>
            {data.autopilot?.lastRun && <p className="mt-3 text-xs text-[var(--text-secondary)]">Last review {time(data.autopilot.lastRun)}{data.autopilot.status === "active" && data.autopilot.nextRun ? ` · Next review ${time(data.autopilot.nextRun)}` : ""}</p>}
            {data.autopilot?.status === "active" && data.autopilot.scheduleStatus && data.autopilot.scheduleStatus !== "active" && <p role="status" className="mt-3 text-xs text-[var(--text-secondary)]">{data.autopilot.scheduleStatus === "runtime_stopped" ? "Start your Hatcher agent to continue scheduled reviews." : "The schedule is paused or unavailable. Check Automations, or pause and resume this strategy to repair it."}</p>}
            {data.autopilot?.error && <p role="alert" className="mt-3 text-sm text-[var(--color-destructive)]">{data.autopilot.error}</p>}
          </section>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Portfolio value", data.account.equityUsd],
              ["Available cash", data.account.cashUsd],
              ["Positions value", p?.positionsValueUsd],
              ["Profit / loss", p?.pnlUsd],
            ].map(([label, value]) => (
              <div key={String(label)} className={`${panel} p-4 sm:p-5`}>
                <p className="text-xs text-[var(--text-secondary)]">{label}</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">
                  {number(value as number | undefined)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">apUSD</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
            <span>{number(p?.trades)} filled trades</span>
            <span>
              Return {p?.returnPct == null ? "—" : `${number(p.returnPct)}%`}
            </span>
            <span>
              {p?.rank == null ? "Not ranked yet" : `Rank #${p.rank}`}
            </span>
            {data.checkedAt && (
              <span className="text-xs text-[var(--text-muted)]">
                Updated {time(data.checkedAt)}
              </span>
            )}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Entries
              title="Positions"
              rows={p?.positions ?? null}
              kind="positions"
              total={p?.positionsTotal}
              empty="No open positions. Eligible trades will appear after a strategy review."
            />
            <Entries
              title="Open orders"
              rows={p?.openOrders ?? null}
              kind="orders"
              total={p?.openOrdersTotal}
              empty="No resting orders."
            />
          </div>
          <Entries
            title="Recent activity"
            rows={p?.activity ?? null}
            kind="activity"
            empty="No fills or payouts yet. Strategy reviews can choose to wait for a suitable market."
          />
          <section
            className={`${panel} p-5 sm:p-6`}
            aria-label="AgentPit settings"
          >
            <h3 className="font-semibold">Account name</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              This changes your AgentPit leaderboard name. Your Hatcher agent
              name stays the same.
            </p>
            <form
              onSubmit={rename}
              className="mt-4 grid max-w-xl grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
                <label
                  htmlFor="agentpit-name"
                  className="text-xs font-medium text-[var(--text-secondary)] sm:col-span-2"
                >
                  AgentPit name
                </label>
                <input
                  id="agentpit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={15}
                  pattern="[a-zA-Z0-9_]{1,15}"
                  required
                  disabled={saving}
                  aria-describedby="agentpit-name-help"
                  className="block h-11 min-w-0 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
              <button
                type="submit"
                disabled={saving || name === data.account.name}
                className={`${button} row-start-4 mt-2 h-11 sm:row-start-auto sm:mt-0`}
              >
                {saving && <Loader2 size={15} className="animate-spin" />}Save
                name
              </button>
              <p id="agentpit-name-help" className="text-xs text-[var(--text-muted)] sm:col-span-2">
                1–15 letters, digits or underscores.
              </p>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
