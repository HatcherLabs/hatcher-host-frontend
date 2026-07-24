"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Check,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { api, type RobinhoodHub, type RobinhoodPolicy } from "@/lib/api";
import {
  GlassCard,
  Skeleton,
  tabContentVariants,
  useAgentContext,
} from "../AgentContext";

type Section = "overview" | "wallet" | "tokenize" | "trading" | "activity";
type Busy =
  "refresh" | "launch" | "policy" | "fees" | "trade" | "brokerage" | null;

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "wallet", label: "Smart account" },
  { id: "tokenize", label: "Tokenize" },
  { id: "trading", label: "Trading" },
  { id: "activity", label: "Activity" },
];

function shortAddress(value: string | null): string {
  return value ? `${value.slice(0, 7)}…${value.slice(-5)}` : "Not provisioned";
}

function formatBalance(value: string | null): string {
  if (value === null) return "Unavailable";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString(undefined, { maximumFractionDigits: 6 })
    : value;
}

function statusTone(status: string): string {
  if (
    [
      "ready",
      "wallet-ready",
      "smart-account-ready",
      "launched",
      "confirmed",
    ].includes(status)
  ) {
    return "border-[var(--status-live-border)] bg-[var(--status-live-bg)] text-[var(--status-live)]";
  }
  if (["prepared", "pending", "authorization_required"].includes(status)) {
    return "border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]";
  }
  return "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]";
}

function StatusPill({ label, status }: { label: string; status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(status)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";
const primaryButton =
  "inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-50";

export function RobinhoodTab() {
  const { agent } = useAgentContext();
  const [section, setSection] = useState<Section>("overview");
  const [hub, setHub] = useState<RobinhoodHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokenName, setTokenName] = useState(`${agent.name} Agent`);
  const [tokenSymbol, setTokenSymbol] = useState(
    agent.name
      .replace(/[^a-z0-9]/giu, "")
      .slice(0, 10)
      .toUpperCase() || "AGENT",
  );
  const [tokenDescription, setTokenDescription] = useState(
    agent.description || `Tokenized Hatcher agent ${agent.name}.`,
  );
  const [venue, setVenue] = useState<"weth" | "sushi">("weth");
  const [feeMode, setFeeMode] = useState<"WALLET" | "BURN" | "COMPOUND">(
    "WALLET",
  );
  const [initialBuyEth, setInitialBuyEth] = useState("");
  const [policy, setPolicy] = useState<RobinhoodPolicy | null>(null);
  const [feeRecipients, setFeeRecipients] = useState<
    Array<{ address: string; bps: number }>
  >([]);
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");

  const load = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError(null);
      try {
        const response = await api.getRobinhoodHub(agent.id);
        if (!response.success)
          throw new Error(response.error || "Failed to load Robinhood hub");
        setHub(response.data);
        setPolicy(response.data.chain.policy);
        setFeeMode(response.data.tokenization.feeMode);
        if (
          response.data.tokenization.launchVenue === "weth" ||
          response.data.tokenization.launchVenue === "sushi"
        ) {
          setVenue(response.data.tokenization.launchVenue);
        }
        setFeeRecipients(
          response.data.tokenization.creatorFeeSplit.length
            ? response.data.tokenization.creatorFeeSplit
            : response.data.chain.walletAddress
              ? [{ address: response.data.chain.walletAddress, bps: 10_000 }]
              : [],
        );
      } catch (loadError) {
        setError((loadError as Error).message);
      } finally {
        setLoading(false);
        setBusy(null);
      }
    },
    [agent.id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (
    kind: Exclude<Busy, "refresh" | null>,
    action: () => Promise<string>,
  ) => {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      setNotice(await action());
      await load(false);
    } catch (actionError) {
      setError((actionError as Error).message);
      setBusy(null);
    }
  };

  const launchToken = () =>
    run("launch", async () => {
      const response = await api.launchEquifoldAgentToken(agent.id, {
        name: tokenName.trim(),
        symbol: tokenSymbol.trim(),
        description: tokenDescription.trim(),
        venue,
        feeMode,
        ...(initialBuyEth.trim()
          ? { initialBuyEth: initialBuyEth.trim() }
          : {}),
        ownerApproved: true,
      });
      if (!response.success)
        throw new Error(response.error || "Equifold agent launch failed");
      return (
        response.data.warning ??
        `${response.data.projectId} launched by the agent smart account.`
      );
    });

  const savePolicy = () => {
    if (!policy) return;
    void run("policy", async () => {
      const response = await api.updateRobinhoodPolicy(agent.id, policy);
      if (!response.success)
        throw new Error(response.error || "Could not save owner policy");
      return `Owner policy v${response.data.policyVersion} saved.`;
    });
  };

  const saveCreatorFees = () =>
    run("fees", async () => {
      const response = await api.updateRobinhoodCreatorFees(agent.id, {
        feeMode,
        recipients: feeRecipients.map((recipient) => ({
          address: recipient.address.trim(),
          bps: recipient.bps,
        })),
      });
      if (!response.success)
        throw new Error(response.error || "Could not update creator fees");
      return `Creator fee mode changed to ${feeMode}.`;
    });

  const trade = () =>
    run("trade", async () => {
      const response = await api.tradeRobinhoodAgentToken(agent.id, {
        side: tradeSide,
        amount: tradeAmount.trim(),
        ownerApproved: true,
      });
      if (!response.success)
        throw new Error(response.error || "Onchain trade failed");
      return `${tradeSide === "buy" ? "Buy" : "Sell"} confirmed for approximately $${response.data.amountUsd.toFixed(2)}.`;
    });

  const connectBrokerage = () =>
    run("brokerage", async () => {
      const returnPath = `${window.location.pathname}?tab=robinhood`;
      const response = await api.connectRobinhoodTrading(agent.id, returnPath);
      if (!response.success)
        throw new Error(
          response.error || "Could not start Robinhood authentication",
        );
      window.location.assign(response.data.authorizationUrl);
      return "Opening Robinhood…";
    });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const executable = hub?.chain.accountAbstraction.canExecute === true;
  const launched = hub?.tokenization.status === "launched";
  const feeSplitTotal = feeRecipients.reduce(
    (sum, recipient) => sum + recipient.bps,
    0,
  );

  return (
    <motion.div
      key="robinhood"
      variants={tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="relative px-5 py-5 sm:px-6">
          <div
            className="absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.08),transparent_68%)]"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--status-live-border)] bg-[var(--status-live-bg)] text-[var(--status-live)]">
                <Landmark size={19} />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Robinhood Chain
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
                  Agent-owned ERC-4337 account, Equifold token launch,
                  policy-controlled onchain trading and optional Robinhood
                  brokerage MCP.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setBusy("refresh");
                void load(false);
              }}
              disabled={busy === "refresh"}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={busy === "refresh" ? "animate-spin" : ""}
              />{" "}
              Refresh
            </button>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2">
            <StatusPill
              label="ERC-4337 smart account"
              status={hub?.chain.status ?? "planned"}
            />
            <StatusPill
              label={executable ? "Execution ready" : "Setup required"}
              status={executable ? "ready" : "pending"}
            />
            <StatusPill
              label={
                launched
                  ? `${hub?.tokenization.projectId} live`
                  : "Token not launched"
              }
              status={hub?.tokenization.status ?? "not_started"}
            />
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-[var(--border-default)] px-3 py-2">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${section === item.id ? "bg-[var(--control-active)] text-[var(--control-active-text)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-4 py-3 text-sm text-[var(--color-destructive)]">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-[var(--status-live-border)] bg-[var(--status-live-bg)] px-4 py-3 text-sm text-[var(--status-live)]">
          {notice}
        </div>
      ) : null}
      {!executable && hub?.chain.accountAbstraction.blocker ? (
        <div className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-warning)]">
          {hub.chain.accountAbstraction.blocker}
        </div>
      ) : null}

      {section === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <MetricCard
            label="Agent account"
            value={shortAddress(hub?.chain.walletAddress ?? null)}
            detail={hub?.chain.accountType ?? "ERC-4337"}
          />
          <MetricCard
            label="Agent token"
            value={hub?.tokenization.projectId ?? "Not launched"}
            detail={
              hub?.tokenization.creatorVerifiedAt
                ? "Creator verified onchain"
                : "Launch from the Tokenize section"
            }
          />
          <MetricCard
            label="Owner policy"
            value={`v${hub?.chain.policyVersion ?? 1}`}
            detail={
              policy?.tradingEnabled
                ? `$${policy.maxTradeUsd} max per trade`
                : "Autonomous trading disabled"
            }
          />
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Wallet size={17} className="text-[var(--accent)]" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Smart-account balances
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Read directly from Robinhood Chain
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="ETH"
                value={formatBalance(hub?.chain.balances.eth ?? null)}
                detail="Gas / native trading"
              />
              <MetricCard
                label="WETH"
                value={formatBalance(hub?.chain.balances.weth ?? null)}
                detail="Wrapped ETH"
              />
              <MetricCard
                label="USDG"
                value={formatBalance(hub?.chain.balances.usdg ?? null)}
                detail="Canonical stable asset"
              />
            </div>
          </GlassCard>
          <GlassCard>
            <ShieldCheck size={18} className="text-[var(--status-live)]" />
            <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              Keys stay out of the agent
            </h3>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              The runtime calls Hatcher&apos;s typed relay. Owner limits are
              enforced server-side; session-key installation adds onchain
              enforcement when configured.
            </p>
          </GlassCard>
        </div>
      ) : null}

      {section === "wallet" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <GlassCard>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  ERC-4337 modular account
                </p>
                <p className="mt-2 break-all font-mono text-sm text-[var(--text-primary)]">
                  {hub?.chain.walletAddress}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (hub?.chain.walletAddress)
                      await navigator.clipboard.writeText(
                        hub.chain.walletAddress,
                      );
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)]"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                {hub?.chain.walletAddress ? (
                  <a
                    href={`${hub.chain.explorerUrl}/address/${hub.chain.walletAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Explorer <ExternalLink size={13} />
                  </a>
                ) : null}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Root owner"
                value={shortAddress(hub?.chain.ownerAddress ?? null)}
                detail="Encrypted in Hatcher custody"
              />
              <MetricCard
                label="Session signer"
                value={shortAddress(hub?.chain.sessionKeyAddress ?? null)}
                detail={
                  hub?.chain.sessionInstalled
                    ? "Installed with onchain permissions"
                    : "Generated; installation pending"
                }
              />
              <MetricCard
                label="Bundler"
                value={
                  hub?.chain.accountAbstraction.bundlerConfigured
                    ? "Configured"
                    : "Missing"
                }
                detail="Alchemy Robinhood bundler"
              />
              <MetricCard
                label="Gas sponsorship"
                value={
                  hub?.chain.accountAbstraction.gasSponsored
                    ? "Active"
                    : "Inactive"
                }
                detail="Owner gas policy"
              />
            </div>
          </GlassCard>
          {policy ? (
            <GlassCard>
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-[var(--accent)]" />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Owner limits
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Applied to agent-initiated actions
                  </p>
                </div>
              </div>
              <label className="mt-4 flex items-center justify-between text-sm text-[var(--text-secondary)]">
                Allow agent trading
                <input
                  type="checkbox"
                  checked={policy.tradingEnabled}
                  onChange={(event) =>
                    setPolicy({
                      ...policy,
                      tradingEnabled: event.target.checked,
                    })
                  }
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-xs text-[var(--text-secondary)]">
                  Max trade USD
                  <input
                    type="number"
                    min="1"
                    value={policy.maxTradeUsd}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        maxTradeUsd: Number(event.target.value),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs text-[var(--text-secondary)]">
                  Daily USD
                  <input
                    type="number"
                    min="1"
                    value={policy.dailyLimitUsd}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        dailyLimitUsd: Number(event.target.value),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs text-[var(--text-secondary)]">
                  Max slippage bps
                  <input
                    type="number"
                    min="1"
                    max="2500"
                    value={policy.maxSlippageBps}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        maxSlippageBps: Number(event.target.value),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs text-[var(--text-secondary)]">
                  Approval above USD
                  <input
                    type="number"
                    min="0"
                    value={policy.requireOwnerApprovalAboveUsd}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        requireOwnerApprovalAboveUsd: Number(
                          event.target.value,
                        ),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
              <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5">
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Creator-fee control
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  Owner only
                </p>
              </div>
              <button
                type="button"
                onClick={savePolicy}
                disabled={busy === "policy"}
                className={`mt-4 ${primaryButton}`}
              >
                {busy === "policy" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ShieldCheck size={15} />
                )}{" "}
                Save limits
              </button>
            </GlassCard>
          ) : null}
        </div>
      ) : null}

      {section === "tokenize" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <GlassCard>
            <div className="flex items-center gap-3">
              <CircleDollarSign size={18} className="text-[var(--accent)]" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Launch the agent token
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  The ERC-4337 account signs and becomes Equifold&apos;s onchain
                  creator.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Token name
                <input
                  value={tokenName}
                  maxLength={128}
                  onChange={(event) => setTokenName(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Symbol
                <input
                  value={tokenSymbol}
                  maxLength={32}
                  onChange={(event) =>
                    setTokenSymbol(event.target.value.toUpperCase())
                  }
                  className={`${fieldClass} font-mono`}
                />
              </label>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Venue
                <select
                  value={venue}
                  onChange={(event) =>
                    setVenue(event.target.value as "weth" | "sushi")
                  }
                  className={fieldClass}
                >
                  <option value="weth">Uniswap v4 · WETH</option>
                  <option value="sushi">SushiSwap v3</option>
                </select>
              </label>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Initial agent buy (ETH)
                <input
                  value={initialBuyEth}
                  placeholder="Optional"
                  onChange={(event) => setInitialBuyEth(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-medium text-[var(--text-secondary)] sm:col-span-2">
                Description
                <textarea
                  value={tokenDescription}
                  maxLength={2000}
                  rows={4}
                  onChange={(event) => setTokenDescription(event.target.value)}
                  className={`${fieldClass} resize-y`}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(["WALLET", "BURN", "COMPOUND"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFeeMode(mode)}
                  className={`rounded-xl border p-3 text-left text-xs ${feeMode === mode ? "border-[var(--accent)] bg-[var(--control-active)] text-[var(--text-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}
                >
                  <span className="font-semibold">{mode}</span>
                  <span className="mt-1 block">
                    {mode === "WALLET"
                      ? "Pay creator split"
                      : mode === "BURN"
                        ? "Buy and burn"
                        : "Compound into locked LP"}
                  </span>
                </button>
              ))}
            </div>
            {!launched ? (
              <button
                type="button"
                onClick={() => void launchToken()}
                disabled={
                  busy === "launch" ||
                  !executable ||
                  !tokenName.trim() ||
                  !tokenSymbol.trim()
                }
                className={`mt-5 ${primaryButton}`}
              >
                {busy === "launch" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Bot size={15} />
                )}{" "}
                Approve & launch as agent
              </button>
            ) : null}
          </GlassCard>
          <GlassCard>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Creator economics
            </p>
            <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
              {hub?.tokenization.projectId ?? "Available after launch"}
            </p>
            <p className="mt-2 break-all font-mono text-[11px] text-[var(--text-muted)]">
              {hub?.tokenization.tokenAddress ?? "No token address yet"}
            </p>
            {launched ? (
              <>
                <label className="mt-4 block text-xs text-[var(--text-secondary)]">
                  Fee mode
                  <select
                    value={feeMode}
                    onChange={(event) =>
                      setFeeMode(event.target.value as typeof feeMode)
                    }
                    className={fieldClass}
                  >
                    <option value="WALLET">Wallet split</option>
                    <option value="BURN">Buy & burn</option>
                    <option value="COMPOUND">Compound LP</option>
                  </select>
                </label>
                {feeMode === "WALLET" ? (
                  <div className="mt-4 space-y-3">
                    {feeRecipients.map((recipient, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[minmax(0,1fr)_92px_36px] gap-2"
                      >
                        <label className="text-xs text-[var(--text-secondary)]">
                          Recipient
                          <input
                            value={recipient.address}
                            onChange={(event) =>
                              setFeeRecipients((current) =>
                                current.map((item, row) =>
                                  row === index
                                    ? { ...item, address: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className={`${fieldClass} font-mono`}
                          />
                        </label>
                        <label className="text-xs text-[var(--text-secondary)]">
                          Bps
                          <input
                            type="number"
                            min="1"
                            max="10000"
                            value={recipient.bps}
                            onChange={(event) =>
                              setFeeRecipients((current) =>
                                current.map((item, row) =>
                                  row === index
                                    ? {
                                        ...item,
                                        bps: Number(event.target.value),
                                      }
                                    : item,
                                ),
                              )
                            }
                            className={fieldClass}
                          />
                        </label>
                        <button
                          type="button"
                          aria-label="Remove fee recipient"
                          onClick={() =>
                            setFeeRecipients((current) =>
                              current.filter((_, row) => row !== index),
                            )
                          }
                          disabled={feeRecipients.length === 1}
                          className="mt-6 flex h-10 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFeeRecipients((current) => [
                            ...current,
                            { address: "", bps: 1 },
                          ])
                        }
                        disabled={feeRecipients.length >= 10}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] disabled:opacity-40"
                      >
                        <Plus size={13} /> Add recipient
                      </button>
                      <span
                        className={`text-xs font-semibold ${
                          feeSplitTotal === 10_000
                            ? "text-[var(--status-live)]"
                            : "text-[var(--color-destructive)]"
                        }`}
                      >
                        {feeSplitTotal.toLocaleString()} / 10,000 bps
                      </span>
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void saveCreatorFees()}
                  disabled={
                    busy === "fees" ||
                    !executable ||
                    (feeMode === "WALLET" &&
                      (feeSplitTotal !== 10_000 ||
                        feeRecipients.some(
                          (recipient) => !recipient.address.trim(),
                        )))
                  }
                  className={`mt-4 ${primaryButton}`}
                >
                  {busy === "fees" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CircleDollarSign size={15} />
                  )}{" "}
                  Apply onchain
                </button>
                {hub?.tokenization.launchUrl ? (
                  <a
                    href={hub.tokenization.launchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex items-center gap-2 text-xs font-semibold text-[var(--accent)]"
                  >
                    Open on Equifold <ExternalLink size={13} />
                  </a>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-xs leading-5 text-[var(--text-secondary)]">
                At launch, the smart account—not the browser wallet—is recorded
                as creator. Fixed supply means the agent controls creator
                economics and actions, not arbitrary minting.
              </p>
            )}
          </GlassCard>
        </div>
      ) : null}

      {section === "trading" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard>
            <div className="flex items-center gap-3">
              <Bot size={18} className="text-[var(--accent)]" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Equifold onchain trading
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Typed buy/sell actions through the smart account and owner
                  policy.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {(["buy", "sell"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setTradeSide(side)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tradeSide === side ? "border-[var(--accent)] bg-[var(--control-active)] text-[var(--text-primary)]" : "border-[var(--border-default)] text-[var(--text-muted)]"}`}
                >
                  {side === "buy" ? "Buy with ETH" : "Sell token"}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-xs text-[var(--text-secondary)]">
              {tradeSide === "buy" ? "ETH amount" : "Token amount"}
              <input
                value={tradeAmount}
                onChange={(event) => setTradeAmount(event.target.value)}
                placeholder={tradeSide === "buy" ? "0.01" : "1000"}
                className={fieldClass}
              />
            </label>
            <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
              Max ${policy?.maxTradeUsd ?? 0}/trade · $
              {policy?.dailyLimitUsd ?? 0}/day ·{" "}
              {(policy?.maxSlippageBps ?? 0) / 100}% slippage. This click is
              explicit owner approval.
            </p>
            <button
              type="button"
              onClick={() => void trade()}
              disabled={
                busy === "trade" ||
                !executable ||
                !launched ||
                hub?.tokenization.launchVenue !== "weth" ||
                !tradeAmount.trim() ||
                !policy?.tradingEnabled
              }
              className={`mt-4 ${primaryButton}`}
            >
              {busy === "trade" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Activity size={15} />
              )}{" "}
              Review policy & execute
            </button>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center gap-3">
              <Landmark size={18} className="text-[var(--accent)]" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Robinhood Agentic Trading
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Separate brokerage account through Robinhood&apos;s official
                  MCP.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Brokerage MCP
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {hub?.trading.status === "ready"
                    ? `${hub.trading.toolCount} tools discovered`
                    : "OAuth connection required"}
                </p>
              </div>
              <StatusPill
                label={
                  hub?.trading.status === "ready" ? "Connected" : "Disconnected"
                }
                status={hub?.trading.status ?? "disconnected"}
              />
            </div>
            {hub?.trading.status !== "ready" ? (
              <button
                type="button"
                onClick={() => void connectBrokerage()}
                disabled={busy === "brokerage"}
                className={`mt-5 ${primaryButton}`}
              >
                {busy === "brokerage" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ExternalLink size={15} />
                )}{" "}
                Connect Robinhood
              </button>
            ) : null}
            <p className="mt-4 text-xs leading-5 text-[var(--text-secondary)]">
              Brokerage positions never mix with the Robinhood Chain smart
              account. Each surface has its own permissions and revocation path.
            </p>
          </GlassCard>
        </div>
      ) : null}

      {section === "activity" ? (
        <GlassCard>
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Robinhood activity
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Current onchain and brokerage state.
              </p>
            </div>
          </div>
          <div className="mt-5 divide-y divide-[var(--border-default)] rounded-xl border border-[var(--border-default)]">
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Smart account
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {shortAddress(hub?.chain.walletAddress ?? null)}
                </p>
              </div>
              <StatusPill
                label={hub?.chain.status ?? "planned"}
                status={hub?.chain.status ?? "planned"}
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Equifold creator binding
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {hub?.tokenization.creatorVerifiedAt
                    ? `${hub.tokenization.projectId} · verified`
                    : "No verified launch"}
                </p>
              </div>
              <StatusPill
                label={hub?.tokenization.status ?? "not started"}
                status={hub?.tokenization.status ?? "not_started"}
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Brokerage MCP
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {hub?.trading.lastCheckedAt
                    ? `Last checked ${new Date(hub.trading.lastCheckedAt).toLocaleString()}`
                    : "Never connected"}
                </p>
              </div>
              <StatusPill
                label={hub?.trading.status ?? "disconnected"}
                status={hub?.trading.status ?? "disconnected"}
              />
            </div>
          </div>
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Onchain actions
            </p>
            {hub?.actions.length ? (
              <div className="mt-3 divide-y divide-[var(--border-default)] rounded-xl border border-[var(--border-default)]">
                {hub.actions.map((action) => (
                  <div
                    key={action.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize text-[var(--text-primary)]">
                        {action.action.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {action.amount
                          ? `${action.amount} ${action.asset ?? ""}`
                          : "Smart-account action"}
                        {action.amountUsd
                          ? ` · $${Number(action.amountUsd).toFixed(2)}`
                          : ""}
                        {` · ${new Date(action.createdAt).toLocaleString()}`}
                      </p>
                      {action.errorMessage ? (
                        <p className="mt-1 text-xs text-[var(--color-destructive)]">
                          {action.errorMessage}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill
                        label={action.status}
                        status={action.status}
                      />
                      {action.transactionHash ? (
                        <a
                          href={`${hub.chain.explorerUrl}/tx/${action.transactionHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--accent)]"
                          aria-label="Open transaction in explorer"
                        >
                          <ExternalLink size={14} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                No onchain actions yet.
              </p>
            )}
          </div>
        </GlassCard>
      ) : null}
    </motion.div>
  );
}
