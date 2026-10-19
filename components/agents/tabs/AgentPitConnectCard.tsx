"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Check } from "lucide-react";
import { api } from "@/lib/api";

type Flow = {
  verificationUrl: string;
  userCode: string;
  expiresAt: string;
  interval: number;
};
export function AgentPitConnectCard({
  agentId,
  connected,
  onConnected,
}: {
  agentId: string;
  connected: boolean;
  onConnected: () => void;
}) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setFlow(null);
    setError("");
  }, [agentId]);
  useEffect(() => {
    if (!flow || connected) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (Date.now() >= Date.parse(flow.expiresAt)) {
        setFlow(null);
        setError("Sign-in expired. Connect again.");
        return;
      }
      try {
        const result = await api.pollAgentPitConnect(agentId);
        if (stopped) return;
        if (!result.success) {
          setError(result.error || "Unable to finish AgentPit sign-in.");
          setFlow(null);
          return;
        }
        if (result.data.status === "connected") {
          setFlow(null);
          onConnected();
          return;
        }
        if (result.data.status === "expired") {
          setFlow(null);
          setError("Sign-in expired. Connect again.");
          return;
        }
        timer = setTimeout(
          poll,
          Math.max(5, result.data.interval ?? flow.interval) * 1000,
        );
      } catch {
        if (!stopped) {
          setFlow(null);
          setError(
            "Connection interrupted. Connect again to check its status.",
          );
        }
      }
    };
    timer = setTimeout(poll, flow.interval * 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [agentId, connected, flow, onConnected]);
  async function connect() {
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    setBusy(true);
    setError("");
    try {
      const result = await api.beginAgentPitConnect(agentId);
      if (!result.success)
        throw new Error(result.error || "Unable to connect AgentPit.");
      if (result.data.status === "connected") {
        popup?.close();
        onConnected();
        return;
      }
      const { verificationUrl, userCode, expiresAt, interval } = result.data;
      if (!verificationUrl || !userCode || !expiresAt)
        throw new Error("AgentPit did not return a sign-in link.");
      const url = new URL(verificationUrl);
      if (
        url.origin !== "https://supportive-banquet-05.authkit.app" ||
        url.pathname !== "/device"
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
      setError(e instanceof Error ? e.message : "Unable to connect.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5"
      aria-label="AgentPit"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">AgentPit</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Prediction markets with $100,000 in paper money. Sign in once to
            connect this agent.
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            No real funds. Trading actions keep your approval settings;
            connecting does not start a trading schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={connected || busy || !!flow}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-default)] px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-60"
        >
          {connected ? (
            <Check size={16} />
          ) : busy || flow ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ExternalLink size={16} />
          )}
          {connected
            ? "Connected"
            : busy
              ? "Preparing…"
              : flow
                ? "Waiting for sign-in…"
                : "Connect AgentPit"}
        </button>
      </div>
      {flow && (
        <div className="mt-4 text-sm text-[var(--text-secondary)]">
          <a
            href={flow.verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Finish signing in to AgentPit
          </a>
          <span className="ml-3 font-mono">Code: {flow.userCode}</span>
          <p className="mt-1 text-xs">
            Approve the code shown here. This page will update automatically.
          </p>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-[var(--color-destructive)]"
        >
          {error}
        </p>
      )}
    </section>
  );
}
