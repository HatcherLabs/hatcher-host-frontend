"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";

type Flow = {
  verificationUrl: string;
  userCode?: string;
  expiresAt: string;
  interval: number;
};
type Account = {
  name: string;
  address: string;
  cashUsd: number;
  equityUsd?: number;
};
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

export function AgentPitConnectCard({
  agentId,
  connected,
  onConnected,
  onDiscuss,
  onOpenPortfolio,
}: {
  agentId: string;
  connected: boolean;
  onConnected: () => void;
  onDiscuss: () => void;
  onOpenPortfolio?: () => void;
}) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(connected);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const request = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const id = ++request.current;
    setChecking(true);
    setError("");
    try {
      const result = await api.getAgentPitConnection(agentId);
      if (!mounted.current || id !== request.current) return;
      if (!result.success)
        throw new Error(
          result.error || "Unable to check your AgentPit connection.",
        );
      setReady(result.data.status === "connected");
      setAccount(result.data.account ?? null);
    } catch (e) {
      if (mounted.current && id === request.current)
        setError(
          e instanceof Error
            ? e.message
            : "Unable to check your connection. Try again.",
        );
    } finally {
      if (mounted.current && id === request.current) setChecking(false);
    }
  }, [agentId]);
  useEffect(() => {
    void refresh();
  }, [refresh, connected]);

  useEffect(() => {
    if (!flow || ready) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (Date.now() >= Date.parse(flow.expiresAt)) {
        setFlow(null);
        setError("Your sign-in link expired. Connect again to get a new link.");
        return;
      }
      try {
        const result = await api.pollAgentPitConnect(agentId);
        if (stopped) return;
        if (!result.success)
          throw new Error(result.error || "Unable to finish AgentPit sign-in.");
        if (result.data.status === "connected") {
          setFlow(null);
          setReady(true);
          onConnected();
          void refresh();
          return;
        }
        if (result.data.status === "failed") {
          throw new Error(
            result.data.error ||
              "AgentPit did not approve sign-in. Connect again.",
          );
        }
        if (result.data.status === "expired") {
          setFlow(null);
          setError(
            "Your sign-in link expired. Connect again to get a new link.",
          );
          return;
        }
        timer = setTimeout(
          poll,
          Math.max(5, result.data.interval ?? flow.interval) * 1000,
        );
      } catch (e) {
        if (!stopped) {
          setFlow(null);
          setError(
            e instanceof Error
              ? e.message
              : "Connection interrupted. Connect again to check its status.",
          );
        }
      }
    };
    timer = setTimeout(poll, flow.interval * 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [agentId, ready, flow, onConnected, refresh]);

  async function connect() {
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    setBusy(true);
    setError("");
    try {
      const result = await api.beginAgentPitConnect(agentId);
      if (!mounted.current) {
        popup?.close();
        return;
      }
      if (!result.success)
        throw new Error(result.error || "Unable to connect AgentPit.");
      if (result.data.status === "connected") {
        popup?.close();
        setReady(true);
        onConnected();
        void refresh();
        return;
      }
      const { verificationUrl, userCode, expiresAt, interval } = result.data;
      if (
        !verificationUrl ||
        !expiresAt ||
        !Number.isFinite(Date.parse(expiresAt)) ||
        Date.parse(expiresAt) <= Date.now()
      )
        throw new Error(
          "AgentPit did not return a valid sign-in link. Try again.",
        );
      const url = new URL(verificationUrl);
      if (
        url.origin !== "https://supportive-banquet-05.authkit.app" ||
        !(url.pathname === "/device" || url.pathname === "/oauth2/authorize")
      )
        throw new Error("Unexpected sign-in address.");
      setFlow({
        verificationUrl,
        userCode,
        expiresAt,
        interval: Math.max(5, interval ?? 5),
      });
      if (popup) popup.location.href = verificationUrl;
    } catch (e) {
      popup?.close();
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "Unable to connect. Try again.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const button =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 disabled:opacity-60";
  return (
    <section
      aria-label="AgentPit"
      className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-5 p-5 sm:p-6">
        <div className="flex min-w-0 basis-full gap-3 sm:flex-1">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
            <TrendingUp size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                AgentPit
              </h3>
              <span className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Paper trading
              </span>
            </div>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
              {ready
                ? "Your paper portfolio is connected. Open AgentPit to check or pause your strategy."
                : "Connect a $100,000 simulated portfolio. Hermes and OpenClaw start the default Favorites strategy immediately, then review hourly. Reviews use AI Credits; you can pause or adapt the strategy anytime."}
            </p>
          </div>
        </div>
        {ready ? (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-live-border)] bg-[var(--status-live-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--status-live)]"
          >
            <Check size={14} aria-hidden />
            Connected
          </span>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={checking || busy || !!flow}
            className={`${button} w-full bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 sm:w-auto`}
          >
            {checking || busy || flow ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <ExternalLink size={16} aria-hidden />
            )}
            {checking
              ? "Checking connection…"
              : busy
                ? "Preparing sign-in…"
                : flow
                  ? "Waiting for sign-in…"
                  : "Connect AgentPit"}
          </button>
        )}
      </div>
      <div className="border-t border-[var(--border-default)] px-5 py-4 sm:px-6">
        {ready ? (
          <div className="space-y-4">
            {account ? (
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <dt className="text-xs text-[var(--text-muted)]">
                    AgentPit account
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                    {account.name}
                  </dd>
                  <dd
                    title={account.address}
                    className="mt-1 font-mono text-xs text-[var(--text-muted)]"
                  >
                    {account.address.slice(0, 6)}…{account.address.slice(-4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">
                    Available cash
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                    {money(account.cashUsd)}{" "}
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      apUSD
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">
                    Portfolio value
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                    {account.equityUsd === undefined
                      ? "—"
                      : money(account.equityUsd)}{" "}
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      apUSD
                    </span>
                  </dd>
                </div>
              </dl>
            ) : (
              <p role="status" className="text-sm text-[var(--text-secondary)]">
                {checking
                  ? "Loading your paper portfolio…"
                  : "Connected. Refresh to load your paper portfolio."}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onDiscuss}
                className={`${button} w-full bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 sm:w-auto`}
              >
                <MessageSquare size={16} aria-hidden />
                Discuss strategy
                <ArrowRight size={16} aria-hidden />
              </button>
              <button
                type="button"
                disabled={checking}
                onClick={() => void refresh()}
                className={`${button} text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]`}
              >
                <RefreshCw
                  size={15}
                  className={checking ? "animate-spin" : ""}
                  aria-hidden
                />
                Refresh portfolio
              </button>
            </div>
            {onOpenPortfolio && <button type="button" onClick={onOpenPortfolio} className={`${button} border border-[var(--border-default)] text-[var(--text-primary)]`}>Open AgentPit portfolio<ArrowRight size={15}/></button>}
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              Check automatic trading in the AgentPit tab. Use Discuss strategy to adapt your preferences; Pause strategy stops future paper orders.
            </p>
          </div>
        ) : flow ? (
          <div role="status" className="space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Finish signing in in the AgentPit tab
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Use your existing AgentPit email or Google account, then approve
              the connection.
              {flow.userCode && (
                <>
                  {" "}
                  If asked, confirm this code:{" "}
                  <strong className="whitespace-nowrap rounded border border-[var(--border-default)] px-2 py-1 font-mono text-[var(--text-primary)]">
                    {flow.userCode}
                  </strong>
                </>
              )}
            </p>
            <a
              href={flow.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--text-primary)] underline underline-offset-4"
            >
              Open AgentPit sign-in
              <ExternalLink size={14} aria-hidden />
            </a>
            <p className="text-xs text-[var(--text-muted)]">
              This page updates automatically after you approve. No API key to
              copy.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs leading-relaxed text-[var(--text-muted)]">
            <span>Email or Google · No API keys to copy</span>
            <span>Simulated funds only · Trading starts when you ask</span>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-3 text-sm text-[var(--color-destructive)]"
          >
            <p>{error}</p>
            {!ready && !flow && (
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-2 min-h-9 font-semibold underline underline-offset-4"
              >
                Check connection again
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
