"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownUp,
  Bot,
  Check,
  CircleDollarSign,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Landmark,
  Loader2,
  ImageUp,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  api,
  type RobinhoodDexQuote,
  type RobinhoodHub,
  type RobinhoodPolicy,
} from "@/lib/api";
import {
  GlassCard,
  Skeleton,
  tabContentVariants,
  useAgentContext,
} from "../AgentContext";

type Section = "overview" | "wallet" | "tokenize" | "trading" | "activity";
type Busy =
  | "refresh"
  | "launch"
  | "media"
  | "prepare"
  | "policy"
  | "fees"
  | "collect"
  | "trade"
  | "dexQuote"
  | "dexSwap"
  | "brokerage"
  | "publicTrader"
  | null;

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "wallet", label: "Smart account" },
  { id: "tokenize", label: "Tokenize" },
  { id: "trading", label: "Trading" },
  { id: "activity", label: "Activity" },
];

function newLaunchIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (digit) => {
    const random = Math.floor(Math.random() * 16);
    return (digit === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

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

function formatUsd18(value: string | null): string {
  if (!value) return "Price unavailable";
  const parsed = Number(value) / 1e18;
  return Number.isFinite(parsed)
    ? `$${parsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "Price unavailable";
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
const COMPLETE_POSITIVE_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;
const EDITABLE_DECIMAL = /^(?:0|[1-9]\d*)?(?:\.\d{0,18})?$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function decimalInput(value: string): string | null {
  const normalized = value.replace(",", ".");
  return EDITABLE_DECIMAL.test(normalized) ? normalized : null;
}

function isPositiveDecimal(value: string): boolean {
  return COMPLETE_POSITIVE_DECIMAL.test(value) && Number(value) > 0;
}

function isDexToken(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.toUpperCase() === "ETH" || EVM_ADDRESS.test(trimmed);
}

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
  const [venue, setVenue] = useState<"weth" | "sushi" | "stock">("weth");
  const [stockAsset, setStockAsset] = useState("");
  const [feeMode, setFeeMode] = useState<"WALLET" | "BURN" | "COMPOUND">(
    "WALLET",
  );
  const [initialBuyEth, setInitialBuyEth] = useState("");
  const [tokenImageSource, setTokenImageSource] = useState<"agent" | "custom">(
    "agent",
  );
  const [tokenImageUri, setTokenImageUri] = useState("");
  const [tokenImageName, setTokenImageName] = useState("");
  const [launchIdempotencyKey, setLaunchIdempotencyKey] = useState(
    newLaunchIdempotencyKey,
  );
  const callbackHandled = useRef(false);
  const dexDefaultsSet = useRef(false);
  const [policy, setPolicy] = useState<RobinhoodPolicy | null>(null);
  const [watchedWalletsText, setWatchedWalletsText] = useState("");
  const watchedWalletsInitialized = useRef(false);
  const [feeRecipients, setFeeRecipients] = useState<
    Array<{ address: string; bps: number }>
  >([]);
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeIdempotencyKey, setTradeIdempotencyKey] = useState(
    newLaunchIdempotencyKey,
  );
  const [dexTokenIn, setDexTokenIn] = useState("ETH");
  const [dexTokenOut, setDexTokenOut] = useState("");
  const [dexAmount, setDexAmount] = useState("");
  const [dexQuote, setDexQuote] = useState<RobinhoodDexQuote | null>(null);
  const [dexIdempotencyKey, setDexIdempotencyKey] = useState(
    newLaunchIdempotencyKey,
  );

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
        if (!watchedWalletsInitialized.current) {
          setWatchedWalletsText(
            (response.data.chain.policy.watchedWallets ?? []).join("\n"),
          );
          watchedWalletsInitialized.current = true;
        }
        if (!dexDefaultsSet.current) {
          setDexTokenOut(
            response.data.tokenization.tokenAddress ??
              response.data.chain.assets.usdg,
          );
          dexDefaultsSet.current = true;
        }
        setFeeMode(response.data.tokenization.feeMode);
        if (
          response.data.tokenization.launchVenue === "weth" ||
          response.data.tokenization.launchVenue === "sushi" ||
          response.data.tokenization.launchVenue === "stock"
        ) {
          setVenue(response.data.tokenization.launchVenue);
        }
        setStockAsset((current) => {
          const available = response.data.equifold.stockAssets.filter(
            (asset) => asset.enabled,
          );
          return available.some(
            (asset) => asset.address.toLowerCase() === current.toLowerCase(),
          )
            ? current
            : (available[0]?.address ?? "");
        });
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

  useEffect(() => {
    if (callbackHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("equifoldProjectId");
    const tokenAddress = params.get("tokenAddress");
    const transactionHash = params.get("txHash");
    if (!projectId || !tokenAddress || !transactionHash) return;
    callbackHandled.current = true;
    void (async () => {
      setBusy("prepare");
      setError(null);
      const response = await api.confirmEquifoldTokenization(agent.id, {
        projectId,
        tokenAddress,
        transactionHash,
      });
      if (response.success) {
        setNotice(`${projectId} connected to this Hatcher agent.`);
        params.delete("equifoldProjectId");
        params.delete("tokenAddress");
        params.delete("txHash");
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`,
        );
        await load(false);
      } else {
        setError(response.error || "Could not confirm Equifold launch");
        setBusy(null);
      }
    })();
  }, [agent.id, load]);

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
        ...(venue === "stock" ? { stockAsset } : {}),
        feeMode,
        ...(initialBuyEth.trim()
          ? { initialBuyEth: initialBuyEth.trim() }
          : {}),
        ...(tokenImageSource === "custom" && tokenImageUri
          ? { imageUri: tokenImageUri }
          : {}),
        idempotencyKey: launchIdempotencyKey,
        ownerApproved: true,
      });
      if (!response.success)
        throw new Error(response.error || "Equifold agent launch failed");
      setLaunchIdempotencyKey(newLaunchIdempotencyKey());
      return (
        response.data.warning ??
        `${response.data.projectId} launched by the agent smart account on Equifold Gen ${response.data.launchGeneration}.`
      );
    });

  const uploadTokenImage = async (file: File) => {
    setBusy("media");
    setError(null);
    setNotice(null);
    const response = await api.uploadEquifoldAgentMedia(agent.id, file);
    if (!response.success) {
      setError(response.error || "Could not upload token image");
      setBusy(null);
      return;
    }
    setTokenImageSource("custom");
    setTokenImageUri(response.data.uri);
    setTokenImageName(file.name);
    setNotice("Image uploaded through Equifold and ready for token metadata.");
    setBusy(null);
  };

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
      return response.data.warning
        ? `Creator fee mode changed to ${feeMode}. ${response.data.warning}`
        : `Creator fee mode changed to ${feeMode}.`;
    });

  const collectCreatorFees = () =>
    run("collect", async () => {
      const response = await api.collectRobinhoodAgentFees(agent.id);
      if (!response.success)
        throw new Error(response.error || "Could not collect creator fees");
      return "Equifold fees collected and routed using the active fee mode.";
    });

  const trade = () =>
    run("trade", async () => {
      const response = await api.tradeRobinhoodAgentToken(agent.id, {
        side: tradeSide,
        amount: tradeAmount.trim(),
        ownerApproved: true,
        idempotencyKey: tradeIdempotencyKey,
      });
      if (!response.success)
        throw new Error(response.error || "Onchain trade failed");
      setTradeIdempotencyKey(newLaunchIdempotencyKey());
      return `${tradeSide === "buy" ? "Buy" : "Sell"} confirmed for approximately $${response.data.amountUsd.toFixed(2)}.`;
    });

  const quoteDexSwap = async () => {
    setBusy("dexQuote");
    setError(null);
    setNotice(null);
    setDexQuote(null);
    try {
      const response = await api.quoteRobinhoodDexSwap(agent.id, {
        tokenIn: dexTokenIn.trim(),
        tokenOut: dexTokenOut.trim(),
        amount: dexAmount.trim(),
      });
      if (!response.success)
        throw new Error(response.error || "Could not quote this route");
      setDexQuote(response.data);
      setDexIdempotencyKey(newLaunchIdempotencyKey());
    } catch (quoteError) {
      setError((quoteError as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const executeDexSwap = async () => {
    if (!dexQuote) return;
    setBusy("dexSwap");
    setError(null);
    setNotice(null);
    try {
      const response = await api.executeRobinhoodDexSwap(agent.id, {
        tokenIn: dexTokenIn.trim(),
        tokenOut: dexTokenOut.trim(),
        amount: dexAmount.trim(),
        idempotencyKey: dexIdempotencyKey,
        ownerApproved: true,
      });
      if (!response.success)
        throw new Error(response.error || "Onchain swap failed");
      setNotice(
        `Swap confirmed: ${response.data.quote.amountIn} ${response.data.quote.tokenIn.symbol} → approximately ${response.data.quote.amountOut} ${response.data.quote.tokenOut.symbol}.`,
      );
      setDexQuote(null);
      setDexIdempotencyKey(newLaunchIdempotencyKey());
      await load(false);
    } catch (swapError) {
      setError((swapError as Error).message);
      setBusy(null);
    }
  };

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

  const togglePublicTrader = () => {
    if (!hub) return;
    const enabled = !hub.tokenization.publicTraderPageEnabled;
    void run("publicTrader", async () => {
      const response = await api.updateRobinhoodPublicTrader(agent.id, enabled);
      if (!response.success) {
        throw new Error(
          response.error || "Could not update the public trader page",
        );
      }
      return enabled
        ? `Public trader page enabled at ${response.data.publicUrl}.`
        : "Public trader page disabled.";
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const executable = hub?.chain.accountAbstraction.canExecute === true;
  const funded = Number(hub?.chain.balances.eth ?? "0") > 0;
  const launched = hub?.tokenization.status === "launched";
  const initialBuyValid =
    initialBuyEth.trim() === "" || isPositiveDecimal(initialBuyEth.trim());
  const tradeAmountValid = isPositiveDecimal(tradeAmount.trim());
  const dexFormValid =
    isDexToken(dexTokenIn) &&
    isDexToken(dexTokenOut) &&
    dexTokenIn.trim().toLowerCase() !== dexTokenOut.trim().toLowerCase() &&
    isPositiveDecimal(dexAmount.trim());
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
              label={executable ? "Relay ready" : "Relay setup required"}
              status={executable ? "ready" : "pending"}
            />
            <StatusPill
              label={funded ? "Wallet funded" : "Funding required"}
              status={funded ? "ready" : "pending"}
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
      {executable && !funded ? (
        <div className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-warning)]">
          The relay is available, but the agent wallet has no native ETH for the
          launch fee, initial buy, or self-funded gas.
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
                ? `Creator verified onchain${
                    hub.tokenization.launchGeneration
                      ? ` · Gen ${hub.tokenization.launchGeneration}`
                      : ""
                  }`
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
          <GlassCard className="lg:col-span-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]">
                  {hub?.tokenization.publicTraderPageEnabled ? (
                    <Eye size={18} />
                  ) : (
                    <EyeOff size={18} />
                  )}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Public trader page
                  </h3>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">
                    Publish this agent&apos;s Equifold token metrics, Robinhood
                    Chain balances and confirmed onchain activity. Policies,
                    pending jobs and private execution details remain hidden.
                  </p>
                  {!agent.isPublic ? (
                    <p className="mt-2 text-xs font-medium text-[var(--color-warning)]">
                      Make the agent public before enabling this page.
                    </p>
                  ) : !launched ? (
                    <p className="mt-2 text-xs font-medium text-[var(--color-warning)]">
                      Launch and verify the agent token first.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {hub?.tokenization.publicTraderPageEnabled ? (
                  <a
                    href={`/agent/${encodeURIComponent(agent.slug ?? agent.id)}/trader`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    View page <ExternalLink size={13} />
                  </a>
                ) : null}
                <button
                  type="button"
                  role="switch"
                  aria-checked={
                    hub?.tokenization.publicTraderPageEnabled === true
                  }
                  onClick={togglePublicTrader}
                  disabled={
                    busy === "publicTrader" ||
                    (!hub?.tokenization.publicTraderPageEnabled &&
                      (!agent.isPublic || !launched))
                  }
                  className={`relative h-7 w-12 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    hub?.tokenization.publicTraderPageEnabled
                      ? "border-[var(--status-live-border)] bg-[var(--status-live)]"
                      : "border-[var(--border-default)] bg-[var(--bg-elevated)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      hub?.tokenization.publicTraderPageEnabled
                        ? "translate-x-5"
                        : "translate-x-0.5"
                    }`}
                  />
                  <span className="sr-only">
                    {hub?.tokenization.publicTraderPageEnabled
                      ? "Disable public trader page"
                      : "Enable public trader page"}
                  </span>
                </button>
              </div>
            </div>
          </GlassCard>
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
                    : "Self-funded"
                }
                detail={
                  hub?.chain.accountAbstraction.gasSponsored
                    ? "Hatcher covers eligible gas only"
                    : "Paid from agent ETH balance"
                }
              />
            </div>
            <div className="mt-4 rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-accent-bg)] px-4 py-3 text-xs leading-5 text-[var(--text-secondary)]">
              Fund this smart-account address with native ETH. It can receive
              funds before its first onchain deployment; the ETH pays for
              account deployment, token launch, the initial buy, and agent
              trading. Do not fund the root owner or session signer addresses.
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
              <label className="mt-3 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
                Allow routed DEX swaps
                <input
                  type="checkbox"
                  checked={policy.allowedActions.includes("dex_swap")}
                  onChange={(event) =>
                    setPolicy({
                      ...policy,
                      allowedActions: event.target.checked
                        ? Array.from(
                            new Set([...policy.allowedActions, "dex_swap"]),
                          )
                        : policy.allowedActions.filter(
                            (action) => action !== "dex_swap",
                          ),
                    })
                  }
                />
              </label>
              <label className="mt-3 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
                <span>
                  Allow selling the agent&apos;s own token
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    Off by default. The agent can still buy, burn and add liquidity for its own
                    token.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={policy.allowOwnTokenSell}
                  onChange={(event) =>
                    setPolicy({
                      ...policy,
                      allowOwnTokenSell: event.target.checked,
                    })
                  }
                />
              </label>
              <label className="mt-3 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
                Allow own-token burns
                <input
                  type="checkbox"
                  checked={policy.allowedActions.includes("equifold_burn")}
                  onChange={(event) =>
                    setPolicy({
                      ...policy,
                      allowedActions: event.target.checked
                        ? Array.from(
                            new Set([
                              ...policy.allowedActions,
                              "equifold_burn" as const,
                            ]),
                          )
                        : policy.allowedActions.filter(
                            (action) => action !== "equifold_burn",
                          ),
                    })
                  }
                />
              </label>
              <label className="mt-3 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
                Allow wallet-funded LP
                <input
                  type="checkbox"
                  checked={
                    policy.allowedActions.includes("equifold_lp_add") &&
                    policy.allowedActions.includes("equifold_lp_compound")
                  }
                  onChange={(event) =>
                    setPolicy({
                      ...policy,
                      allowedActions: event.target.checked
                        ? Array.from(
                            new Set([
                              ...policy.allowedActions,
                              "equifold_lp_add" as const,
                              "equifold_lp_compound" as const,
                            ]),
                          )
                        : policy.allowedActions.filter(
                            (action) =>
                              action !== "equifold_lp_add" &&
                              action !== "equifold_lp_compound",
                          ),
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
                  Max price impact bps
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={policy.maxPriceImpactBps}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        maxPriceImpactBps: Number(event.target.value),
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
                <label className="text-xs text-[var(--text-secondary)]">
                  Native reserve ETH
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={policy.minNativeReserveEth}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        minNativeReserveEth: Number(event.target.value),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs text-[var(--text-secondary)]">
                  Min pool liquidity ETH
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={policy.minPoolLiquidityEth}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        minPoolLiquidityEth: Number(event.target.value),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
              <p className="mt-3 text-[11px] leading-4 text-[var(--text-muted)]">
                An empty token allowlist permits any contract address selected
                by the owner or agent. Every route is still bounded by trade,
                daily, slippage, and price-impact limits.
              </p>
              <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5">
                <label className="flex items-center justify-between gap-4 text-xs font-medium text-[var(--text-secondary)]">
                  Autonomous fee claims
                  <input
                    type="checkbox"
                    checked={
                      policy.creatorFeeManagement === "agent_within_policy"
                    }
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        creatorFeeManagement: event.target.checked
                          ? "agent_within_policy"
                          : "owner_only",
                      })
                    }
                  />
                </label>
                <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
                  In COMPOUND fee mode, an authorized claim adds fees to the
                  canonical locked LP on this token&apos;s Sushi v3 or Uniswap
                  v4 venue. Wallet-funded LP is separate and stays owned by the
                  agent smart account.
                </p>
              </div>
              <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5">
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Risk guard
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                  The server re-quotes open positions every ~2 minutes and
                  executes exits through the same policy limits. The
                  agent&apos;s own token is never auto-sold.
                </p>
                <label className="mt-3 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
                  Automatic stop-loss
                  <input
                    type="checkbox"
                    checked={policy.autoStopLossEnabled !== false}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        autoStopLossEnabled: event.target.checked,
                      })
                    }
                  />
                </label>
                <label className="mt-2 flex items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
                  Stop-loss trigger (% below cost)
                  <input
                    type="number"
                    min="5"
                    max="95"
                    step="1"
                    value={Math.round(
                      (1 - (policy.autoStopLossRatio ?? 0.75)) * 100,
                    )}
                    onChange={(event) => {
                      const pct = Math.min(
                        95,
                        Math.max(5, Number(event.target.value) || 25),
                      );
                      setPolicy({
                        ...policy,
                        autoStopLossRatio:
                          Math.round((1 - pct / 100) * 100) / 100,
                      });
                    }}
                    className={`${fieldClass} max-w-24`}
                  />
                </label>
                <label className="mt-2 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
                  <span>
                    Automatic take-profit
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      Sells half at 2x cost, the rest at 3x.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={policy.autoTakeProfitEnabled !== false}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        autoTakeProfitEnabled: event.target.checked,
                      })
                    }
                  />
                </label>
              </div>
              <label className="mt-3 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
                <span>
                  Allow established-market tokens
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    Verified tokens with 1,000+ holders, $50k+ liquidity and 3+
                    days of trading are tradeable without an approved launch
                    factory.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={policy.allowEstablishedTokens !== false}
                  onChange={(event) =>
                    setPolicy({
                      ...policy,
                      allowEstablishedTokens: event.target.checked,
                    })
                  }
                />
              </label>
              <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5">
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Market scan thresholds
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                  Candidates must clear every gate; near-misses are still
                  reported with the exact reason they failed.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs text-[var(--text-secondary)]">
                    Min 24h volume USD
                    <input
                      type="number"
                      min="0"
                      value={policy.scanMinVolume24hUsd ?? 3000}
                      onChange={(event) =>
                        setPolicy({
                          ...policy,
                          scanMinVolume24hUsd: Number(event.target.value),
                        })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs text-[var(--text-secondary)]">
                    Min liquidity USD
                    <input
                      type="number"
                      min="0"
                      value={policy.scanMinLiquidityUsd ?? 2000}
                      onChange={(event) =>
                        setPolicy({
                          ...policy,
                          scanMinLiquidityUsd: Number(event.target.value),
                        })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs text-[var(--text-secondary)]">
                    Max token age (hours)
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={policy.scanMaxAgeHours ?? 48}
                      onChange={(event) =>
                        setPolicy({
                          ...policy,
                          scanMaxAgeHours: Number(event.target.value),
                        })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs text-[var(--text-secondary)]">
                    Min pool depth ETH
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={policy.scanMinPoolWethDepthEth ?? 0.05}
                      onChange={(event) =>
                        setPolicy({
                          ...policy,
                          scanMinPoolWethDepthEth: Number(event.target.value),
                        })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs text-[var(--text-secondary)]">
                    Min 24h transactions
                    <input
                      type="number"
                      min="0"
                      value={policy.scanMinTxns24h ?? 20}
                      onChange={(event) =>
                        setPolicy({
                          ...policy,
                          scanMinTxns24h: Number(event.target.value),
                        })
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5">
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Watched wallets
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                  Your own conviction sources, one address per line (max 10).
                  When two or more buy the same token, the scan flags it as
                  high conviction. Signals only — every trade still passes
                  safety and policy gates.
                </p>
                <textarea
                  value={watchedWalletsText}
                  onChange={(event) => {
                    setWatchedWalletsText(event.target.value);
                    const wallets = event.target.value
                      .split(/[\s,;]+/u)
                      .map((wallet) => wallet.trim())
                      .filter((wallet) => /^0x[0-9a-fA-F]{40}$/u.test(wallet))
                      .slice(0, 10);
                    setPolicy({
                      ...policy,
                      watchedWallets: Array.from(new Set(wallets)),
                    });
                  }}
                  rows={4}
                  placeholder={"0x…\n0x…"}
                  className={`${fieldClass} mt-2 w-full font-mono text-[11px]`}
                />
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {(policy.watchedWallets ?? []).length} valid wallet
                  {(policy.watchedWallets ?? []).length === 1 ? "" : "s"} will
                  be saved.
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
                  creator across all live Gen4 venues.
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
                    setVenue(event.target.value as "weth" | "sushi" | "stock")
                  }
                  className={fieldClass}
                >
                  {(
                    hub?.equifold.venues ?? [
                      {
                        id: "weth" as const,
                        label: "Uniswap v4 · WETH",
                        enabled: true,
                      },
                      {
                        id: "sushi" as const,
                        label: "SushiSwap v3",
                        enabled: true,
                      },
                    ]
                  ).map((option) => (
                    <option
                      key={option.id}
                      value={option.id}
                      disabled={!option.enabled}
                    >
                      {option.label}
                      {!option.enabled ? " · unavailable" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {venue === "stock" ? (
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Backing stock
                  <select
                    value={stockAsset}
                    onChange={(event) => setStockAsset(event.target.value)}
                    className={fieldClass}
                  >
                    {hub?.equifold.stockAssets
                      .filter((asset) => asset.enabled)
                      .map((asset) => (
                        <option key={asset.address} value={asset.address}>
                          {asset.symbol} · {asset.name} ·{" "}
                          {formatUsd18(asset.priceUsd18)}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Initial agent buy (ETH)
                <input
                  value={initialBuyEth}
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Optional"
                  onChange={(event) => {
                    const value = decimalInput(event.target.value);
                    if (value !== null) setInitialBuyEth(value);
                  }}
                  className={fieldClass}
                />
                <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                  Positive ETH amount, up to 18 decimal places.
                </span>
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
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Token image
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTokenImageSource("agent");
                      setTokenImageUri("");
                      setTokenImageName("");
                    }}
                    className={`rounded-xl border p-3 text-left text-xs ${
                      tokenImageSource === "agent"
                        ? "border-[var(--accent)] bg-[var(--control-active)] text-[var(--control-active-text)]"
                        : "border-[var(--border-default)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <span className="font-semibold">Use agent avatar</span>
                    <span className="mt-1 block">
                      Hatcher downloads it safely and uploads it through
                      Equifold&apos;s media/IPFS pipeline.
                    </span>
                  </button>
                  <label
                    className={`cursor-pointer rounded-xl border p-3 text-left text-xs ${
                      tokenImageSource === "custom"
                        ? "border-[var(--accent)] bg-[var(--control-active)] text-[var(--control-active-text)]"
                        : "border-[var(--border-default)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      {busy === "media" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ImageUp size={14} />
                      )}
                      Upload custom image
                    </span>
                    <span className="mt-1 block truncate">
                      {tokenImageName || "PNG, JPEG, WebP, or GIF · up to 8 MB"}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      disabled={busy === "media"}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadTokenImage(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(["WALLET", "BURN", "COMPOUND"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFeeMode(mode)}
                  className={`rounded-xl border p-3 text-left text-xs ${feeMode === mode ? "border-[var(--accent)] bg-[var(--control-active)] text-[var(--control-active-text)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}
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
                  !funded ||
                  !tokenName.trim() ||
                  !tokenSymbol.trim() ||
                  !initialBuyValid ||
                  (tokenImageSource === "custom" && !tokenImageUri) ||
                  (venue === "stock" && !stockAsset)
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
                    hub?.tokenization.creatorConfigLocked ||
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
                {hub?.tokenization.creatorConfigLocked ? (
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    The creator&apos;s one configuration change has been used.
                    Equifold admins retain the protocol override.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    Equifold allows the creator one post-launch fee
                    configuration change.
                  </p>
                )}
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
                <button
                  type="button"
                  onClick={() => void collectCreatorFees()}
                  disabled={
                    busy === "collect" || !executable || !policy?.tradingEnabled
                  }
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-50"
                >
                  {busy === "collect" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CircleDollarSign size={14} />
                  )}
                  Collect & route token fees
                </button>
                <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
                  Agents can run the same permissionless fee crank without
                  Robinhood MCP. WALLET pays the configured split; BURN and
                  COMPOUND route fees on-chain automatically.
                </p>
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
          <GlassCard className="lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <ArrowDownUp size={18} className="text-[var(--accent)]" />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Open DEX swap
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Enter any Robinhood Chain token contract. Hatcher routes
                    executable SushiSwap and Uniswap liquidity.
                  </p>
                </div>
              </div>
              <StatusPill
                label={
                  hub?.dex.available
                    ? "Arbitrary tokens enabled"
                    : "Mainnet unavailable"
                }
                status={hub?.dex.available ? "ready" : "pending"}
              />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] md:items-end">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Pay token
                <input
                  value={dexTokenIn}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ETH or 0x…"
                  onChange={(event) => {
                    setDexTokenIn(event.target.value);
                    setDexQuote(null);
                  }}
                  className={`${fieldClass} font-mono`}
                />
              </label>
              <button
                type="button"
                aria-label="Swap input and output tokens"
                onClick={() => {
                  setDexTokenIn(dexTokenOut);
                  setDexTokenOut(dexTokenIn);
                  setDexQuote(null);
                }}
                className="mb-0.5 flex h-10 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <ArrowDownUp size={15} />
              </button>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Receive token
                <input
                  value={dexTokenOut}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="0x token contract"
                  onChange={(event) => {
                    setDexTokenOut(event.target.value);
                    setDexQuote(null);
                  }}
                  className={`${fieldClass} font-mono`}
                />
              </label>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Exact input amount
                <input
                  value={dexAmount}
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="0.01"
                  onChange={(event) => {
                    const value = decimalInput(event.target.value);
                    if (value !== null) {
                      setDexAmount(value);
                      setDexQuote(null);
                    }
                  }}
                  className={fieldClass}
                />
              </label>
              <button
                type="button"
                onClick={() => void quoteDexSwap()}
                disabled={
                  busy === "dexQuote" ||
                  busy === "dexSwap" ||
                  !hub?.dex.available ||
                  !dexFormValid
                }
                className={primaryButton}
              >
                {busy === "dexQuote" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                Get executable quote
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-4 text-[var(--text-muted)]">
              No curated token list is used. Confirm contract addresses
              independently—symbols and names are display metadata, not token
              identity.
            </p>
            {dexQuote ? (
              <div className="mt-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                      Fresh route
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {dexQuote.amountIn} {dexQuote.tokenIn.symbol} →{" "}
                      {Number(dexQuote.amountOut).toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}{" "}
                      {dexQuote.tokenOut.symbol}
                    </p>
                  </div>
                  <StatusPill
                    label={
                      dexQuote.canExecuteWithOwnerApproval
                        ? "Executable"
                        : "Blocked by policy"
                    }
                    status={
                      dexQuote.canExecuteWithOwnerApproval ? "ready" : "pending"
                    }
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Input value"
                    value={`$${dexQuote.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    detail="Policy accounting value"
                  />
                  <MetricCard
                    label="Price impact"
                    value={`${(dexQuote.priceImpactBps / 100).toFixed(2)}%`}
                    detail={`Owner max ${(dexQuote.maxPriceImpactBps / 100).toFixed(2)}%`}
                  />
                  <MetricCard
                    label="Liquidity"
                    value={
                      dexQuote.liquidityProviders.length
                        ? dexQuote.liquidityProviders.join(" + ")
                        : "Aggregated"
                    }
                    detail={`Max slippage ${dexQuote.maxSlippageBps / 100}%`}
                  />
                  <MetricCard
                    label="Token safety"
                    value={dexQuote.safety.verdict.toUpperCase()}
                    detail={
                      dexQuote.safety.approvedLaunchpad
                        ? `Verified ${dexQuote.safety.approvedLaunchpad} origin`
                        : "Unapproved launch origin"
                    }
                  />
                  <MetricCard
                    label="Round trip"
                    value={
                      dexQuote.safety.roundTripLossBps === null
                        ? "Unavailable"
                        : `${(dexQuote.safety.roundTripLossBps / 100).toFixed(2)}%`
                    }
                    detail={
                      dexQuote.safety.explorerVerified
                        ? "Contract verified on explorer"
                        : "Contract verification missing"
                    }
                  />
                </div>
                {dexQuote.safety.warnings.length ? (
                  <div className="mt-4 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning)]">
                    Safety review: {dexQuote.safety.warnings.join(" · ")}
                  </div>
                ) : null}
                {dexQuote.blockers.length ? (
                  <div className="mt-4 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning)]">
                    {dexQuote.blockers.join(" · ")}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void executeDexSwap()}
                    disabled={
                      busy === "dexSwap" ||
                      !executable ||
                      !dexQuote.canExecuteWithOwnerApproval
                    }
                    className={primaryButton}
                  >
                    {busy === "dexSwap" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Activity size={15} />
                    )}
                    Approve & execute swap
                  </button>
                  <p className="text-xs text-[var(--text-muted)]">
                    {dexQuote.ownerApprovalRequired
                      ? "Above the autonomous threshold; this owner action supplies explicit approval."
                      : dexQuote.canExecuteAutonomously
                        ? "The agent can execute the same route autonomously under this policy."
                        : "Owner policy must permit the route before execution."}
                  </p>
                </div>
              </div>
            ) : null}
          </GlassCard>
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
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tradeSide === side ? "border-[var(--accent)] bg-[var(--control-active)] text-[var(--control-active-text)]" : "border-[var(--border-default)] text-[var(--text-muted)]"}`}
                >
                  {side === "buy" ? "Buy with ETH" : "Sell token"}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-xs text-[var(--text-secondary)]">
              {tradeSide === "buy" ? "ETH amount" : "Token amount"}
              <input
                value={tradeAmount}
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  const value = decimalInput(event.target.value);
                  if (value !== null) setTradeAmount(value);
                }}
                placeholder={tradeSide === "buy" ? "0.01" : "1000"}
                className={fieldClass}
              />
            </label>
            <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
              Max ${policy?.maxTradeUsd ?? 0}/trade · $
              {policy?.dailyLimitUsd ?? 0}/day ·{" "}
              {(policy?.maxSlippageBps ?? 0) / 100}% slippage. Agents use the
              same policy-gated onchain relay autonomously; Robinhood MCP is not
              required. This button is the owner&apos;s manual execution path.
            </p>
            <button
              type="button"
              onClick={() => void trade()}
              disabled={
                busy === "trade" ||
                !executable ||
                !launched ||
                !["weth", "sushi", "stock"].includes(
                  hub?.tokenization.launchVenue ?? "",
                ) ||
                !tradeAmountValid ||
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
