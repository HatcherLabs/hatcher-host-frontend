'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { ArrowUpRight, ChevronDown, Coins, Lock, RefreshCcw, Sparkles, Wallet } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  bytesToBase64,
  formatRewardFundingSources,
  formatStakingTokenAmount,
  formatStakingWalletStepNotice,
  resolveStakingLinkedWalletAddress,
  resolveStakingWalletStep,
  shouldUseWalletSignInForLinking,
  WALLET_LINK_SIWS_STATEMENT,
} from '@/lib/staking-state';
import {
  estimateActiveStakeRewards,
  estimateStakingRewards,
} from '@/lib/staking-reward-estimator';
import { groupActiveStakesByPool, stakesInExpandedPoolGroups } from '@/lib/staking-active-stakes';
import { isWalletTrustRevokedError, isWalletUserCancellationError } from '@/lib/wallet-errors';
import { buildPhantomBrowseUrl } from '@/lib/wallet-links';
import {
  baseUnitsToHatcherString,
  claimHatcherRewardsWithStreamflow,
  fetchHatcherWalletBalance,
  fetchHatcherRewardStatusWithStreamflow,
  isStakeUnlocked,
  MIN_HATCHER_STAKE_BASE_UNITS,
  parseHatcherAmountToBaseUnits,
  percentOfHatcherBalance,
  stakeHatcherWithStreamflow,
  unstakeHatcherWithStreamflow,
  type HatcherRewardStatus,
} from '@/lib/streamflow-staking';
import type {
  StakingClaimResponse,
  StakingConfigResponse,
  StakingPoolConfig,
  StakingPoolKey,
  StakingStakeEntry,
  UserStakingSummary,
} from '@/lib/api';

const DAY_MS = 86_400_000;
const STAKE_PERCENTAGES = [25, 50, 75, 100] as const;
const HATCHER_REWARD_STATUS_CONCURRENCY = 2;

type HatcherRewardUiStatus = HatcherRewardStatus & {
  loading: boolean;
  error: string | null;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex] as T);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );

  return results;
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function rewardShare(pool: StakingPoolConfig): string {
  return `${pool.rewardShareBps / 100}%`;
}

function formatApr(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value) || value <= 0) return '-';
  return `${formatNumber(value, 2)}%`;
}

function formatEstimatePercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '-';
  return `${formatNumber(value, value < 0.01 ? 4 : 2)}%`;
}

function shortAddress(address: string | null | undefined): string {
  if (!address) return 'none';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function hatcherRewardStatusLabel(status: HatcherRewardUiStatus | undefined): string {
  if (!status || status.loading) return 'Checking...';
  if (status.error) return 'Unavailable';
  if (!status.rewardEntryExists) return 'Not initialized';
  if (!status.canClaim) return '0 HATCHER';
  return 'Claimable';
}

function hatcherRewardClaimReason(status: HatcherRewardUiStatus | undefined): string {
  if (!status || status.loading) return 'Checking HATCHER rewards';
  if (status.error) return status.error;
  if (!status.rewardEntryExists) return 'Reward tracking account is missing for this stake.';
  if (!status.canClaim) return status.reason ?? 'No HATCHER rewards are available to claim yet.';
  return 'Claim HATCHER rewards';
}

function canClaimHatcherReward(status: HatcherRewardUiStatus | undefined): boolean {
  return Boolean(status && !status.loading && !status.error && status.rewardEntryExists && status.canClaim);
}

function isMobileWalletLinkRuntime(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
    || (/Macintosh|Mac OS/i.test(userAgent) && navigator.maxTouchPoints > 1);
}

class WalletFlowStepRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletFlowStepRequiredError';
  }
}

function isWalletFlowStepRequiredError(error: unknown): error is WalletFlowStepRequiredError {
  return error instanceof WalletFlowStepRequiredError;
}

async function waitForConnectedWallet(walletRef: MutableRefObject<WalletContextState>): Promise<string> {
  const start = Date.now();
  while (!walletRef.current.connected || !walletRef.current.publicKey) {
    if (Date.now() - start > 60_000) throw new Error('Wallet connection timed out');
    const current = walletRef.current;
    if (!current.wallet && !current.connecting && Date.now() - start > 1_000) {
      throw new Error('Cancelled');
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return walletRef.current.publicKey.toBase58();
}

function futureUnlockDate(pool: StakingPoolConfig | null): string {
  if (!pool) return 'Select a pool';
  return formatDate(new Date(Date.now() + pool.durationDays * DAY_MS));
}

function PoolSelectorCard({
  pool,
  selected,
  onSelect,
}: {
  pool: StakingPoolConfig;
  selected: boolean;
  onSelect: (poolKey: StakingPoolKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pool.key)}
      className={`min-w-0 w-full overflow-hidden rounded-lg border p-4 text-left transition hover:bg-[var(--bg-elevated)] sm:p-5 ${
        selected
          ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
          : 'border-[var(--border-default)] bg-[var(--bg-card)]'
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Lock period</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{pool.label}</h2>
        </div>
        <span
          className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
            pool.configured
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          }`}
        >
          {pool.configured ? 'Live' : 'Pending'}
        </span>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div className="min-w-0">
          <p className="text-[var(--text-muted)]">Reward share</p>
          <p className="font-semibold text-[var(--accent)]">{rewardShare(pool)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[var(--text-muted)]">Staked</p>
          <p className="font-semibold text-[var(--text-primary)]">
            {formatStakingTokenAmount(pool.totalStakedHatcher ?? 0, 2)}
          </p>
        </div>
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <p className="text-[var(--text-muted)]">APR at cap</p>
          <p className="break-words font-semibold text-[var(--text-primary)]">
            {formatApr(pool.estimatedAprAtCap)}
          </p>
        </div>
      </div>
    </button>
  );
}

export function StakingClient() {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();
  const walletRef = useRef(wallet);
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { isAuthenticated, isLoading: authLoading, user, refreshUser } = useAuth();
  const [config, setConfig] = useState<StakingConfigResponse | null>(null);
  const [summary, setSummary] = useState<UserStakingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [selectedPoolKey, setSelectedPoolKey] = useState<StakingPoolKey>('90d');
  const [stakeAmount, setStakeAmount] = useState('');
  const [walletBalanceBaseUnits, setWalletBalanceBaseUnits] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [staking, setStaking] = useState(false);
  const [stakeTxId, setStakeTxId] = useState<string | null>(null);
  const [unstakeTxId, setUnstakeTxId] = useState<string | null>(null);
  const [hatcherRewardTxId, setHatcherRewardTxId] = useState<string | null>(null);
  const [claimingHatcherStake, setClaimingHatcherStake] = useState<string | null>(null);
  const [unstakingStake, setUnstakingStake] = useState<string | null>(null);
  const [expandedStakePoolKeys, setExpandedStakePoolKeys] = useState<Set<StakingPoolKey>>(() => new Set());
  const [hatcherRewardStatuses, setHatcherRewardStatuses] = useState<Record<string, HatcherRewardUiStatus>>({});
  const [linkingWallet, setLinkingWallet] = useState(false);
  const [optimisticLinkedWalletAddress, setOptimisticLinkedWalletAddress] = useState<string | null>(null);
  const [phantomBrowseUrl, setPhantomBrowseUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<StakingClaimResponse | null>(null);

  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, summaryRes] = await Promise.all([
        api.getStakingConfig(),
        api.getMyStaking(),
      ]);

      if (configRes.success) setConfig(configRes.data);
      else setError(configRes.error);

      if (summaryRes.success) setSummary(summaryRes.data);
      else if (summaryRes.error !== 'Unauthorized') setError(summaryRes.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load staking data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const target = new URL('/staking', window.location.origin);
    setPhantomBrowseUrl(buildPhantomBrowseUrl(target.toString(), window.location.origin));
  }, []);

  useEffect(() => {
    if (!config?.pools.length) return;
    if (!config.pools.some((pool) => pool.key === selectedPoolKey)) {
      setSelectedPoolKey(config.pools[0]?.key ?? '90d');
    }
  }, [config, selectedPoolKey]);

  const connectedWalletAddress = wallet.publicKey?.toBase58() ?? null;
  const linkedWalletAddress = resolveStakingLinkedWalletAddress({
    userWalletAddress: user?.walletAddress,
    summaryWalletAddress: summary?.walletAddress,
    optimisticLinkedWalletAddress,
  });
  const walletMatchesAccount = Boolean(
    connectedWalletAddress && linkedWalletAddress && connectedWalletAddress === linkedWalletAddress,
  );
  const walletStep = resolveStakingWalletStep({
    isAuthenticated,
    connectedWalletAddress,
    linkedWalletAddress,
    walletMatchesAccount,
  });
  const canClaimAiCredits = Boolean(
    summary
      && summary.claimableAiCredits > 0
      && linkedWalletAddress
      && (!connectedWalletAddress || walletMatchesAccount),
  );

  const selectedPool = useMemo(() => {
    if (!config?.pools.length) return null;
    return config.pools.find((pool) => pool.key === selectedPoolKey) ?? config.pools[0] ?? null;
  }, [config, selectedPoolKey]);
  const activeStakeGroups = useMemo(() => groupActiveStakesByPool(
    summary?.activeStakes ?? [],
    config?.pools ?? [],
  ), [config?.pools, summary?.activeStakes]);
  const visibleRewardStatusStakes = useMemo(
    () => stakesInExpandedPoolGroups(activeStakeGroups, expandedStakePoolKeys),
    [activeStakeGroups, expandedStakePoolKeys],
  );

  const rewardSplitSummary = useMemo(() => {
    if (!config?.pools.length) return null;
    return config.pools.map((pool) => `${pool.label}: ${rewardShare(pool)}`).join(' / ');
  }, [config]);
  const fundingSourcesLabel = useMemo(
    () => formatRewardFundingSources(config?.rewardFundingSources ?? []),
    [config?.rewardFundingSources],
  );

  useEffect(() => {
    if (
      optimisticLinkedWalletAddress
      && connectedWalletAddress
      && optimisticLinkedWalletAddress !== connectedWalletAddress
    ) {
      setOptimisticLinkedWalletAddress(null);
    }
  }, [connectedWalletAddress, optimisticLinkedWalletAddress]);

  const amountBaseUnits = useMemo(
    () => parseHatcherAmountToBaseUnits(stakeAmount),
    [stakeAmount],
  );
  const amountEntered = stakeAmount.trim().length > 0;
  const amountInvalid = amountEntered && amountBaseUnits === null;
  const amountPositive = amountBaseUnits !== null && amountBaseUnits > 0n;
  const amountTooLow = amountPositive && amountBaseUnits < MIN_HATCHER_STAKE_BASE_UNITS;
  const amountTooHigh = Boolean(
    amountBaseUnits !== null
      && walletBalanceBaseUnits !== null
      && amountBaseUnits > walletBalanceBaseUnits,
  );
  const rewardEstimate = useMemo(() => {
    if (!selectedPool || amountBaseUnits === null || amountBaseUnits < MIN_HATCHER_STAKE_BASE_UNITS) return null;
    return estimateStakingRewards(selectedPool, Number(amountBaseUnits) / 1_000_000);
  }, [amountBaseUnits, selectedPool]);
  const needsAccountPrep = walletStep !== 'ready';
  const poolReady = Boolean(selectedPool?.configured && selectedPool.poolAddress);
  const stakeSubmitDisabled = staking
    || linkingWallet
    || authLoading
    || !poolReady
    || (!needsAccountPrep && (!amountEntered || amountInvalid || !amountPositive || amountTooLow || amountTooHigh));

  const balanceLabel = useMemo(() => {
    if (!connectedWalletAddress) return 'Connect wallet';
    if (balanceLoading) return 'Loading...';
    if (walletBalanceBaseUnits === null) return 'Unavailable';
    return `${baseUnitsToHatcherString(walletBalanceBaseUnits, 2)} HATCHER`;
  }, [balanceLoading, connectedWalletAddress, walletBalanceBaseUnits]);

  const stakeButtonLabel = useMemo((): string => {
    if (staking) return 'Staking';
    if (linkingWallet) return 'Preparing wallet';
    if (authLoading) return 'Loading';
    if (!poolReady) return 'Pool pending';
    if (walletStep === 'sign-in') return 'Sign in to stake';
    if (walletStep === 'connect-wallet') return 'Connect wallet';
    if (walletStep === 'link-wallet') return 'Link wallet';
    if (!amountEntered) return 'Enter amount';
    if (amountInvalid) return 'Invalid amount';
    if (!amountPositive) return 'Enter amount';
    if (amountTooLow) return 'Minimum 1 HATCHER';
    if (amountTooHigh) return 'Insufficient balance';
    return 'Stake HATCHER';
  }, [
    amountEntered,
    amountInvalid,
    amountPositive,
    amountTooLow,
    amountTooHigh,
    authLoading,
    linkingWallet,
    poolReady,
    staking,
    walletStep,
  ]);

  const loadWalletBalance = useCallback(async () => {
    const currentPublicKey = walletRef.current.publicKey;
    if (!currentPublicKey) {
      setWalletBalanceBaseUnits(null);
      setBalanceError(null);
      return;
    }

    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const balance = await fetchHatcherWalletBalance(connection, currentPublicKey);
      setWalletBalanceBaseUnits(balance);
    } catch (err) {
      setWalletBalanceBaseUnits(null);
      setBalanceError(err instanceof Error ? err.message : 'Could not load HATCHER balance');
    } finally {
      setBalanceLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    void loadWalletBalance();
  }, [connectedWalletAddress, loadWalletBalance]);

  useEffect(() => {
    const activeStakeKeys = new Set((summary?.activeStakes ?? []).map((stake) => stake.stakeEntryAddress));
    setHatcherRewardStatuses((current) => {
      const entries = Object.entries(current).filter(([stakeEntryAddress]) => activeStakeKeys.has(stakeEntryAddress));
      if (entries.length === Object.keys(current).length) return current;
      return Object.fromEntries(entries);
    });
  }, [summary?.activeStakes]);

  useEffect(() => {
    const activePoolKeys = new Set(activeStakeGroups.map((group) => group.poolKey));
    setExpandedStakePoolKeys((current) => {
      const next = new Set(Array.from(current).filter((poolKey) => activePoolKeys.has(poolKey)));
      return next.size === current.size ? current : next;
    });
  }, [activeStakeGroups]);

  const setStakePoolGroupExpanded = useCallback((poolKey: StakingPoolKey, expanded: boolean) => {
    setExpandedStakePoolKeys((current) => {
      if (current.has(poolKey) === expanded) return current;
      const next = new Set(current);
      if (expanded) next.add(poolKey);
      else next.delete(poolKey);
      return next;
    });
  }, []);

  useEffect(() => {
    if (visibleRewardStatusStakes.length === 0) return;

    let cancelled = false;
    setHatcherRewardStatuses((current) => {
      const next = { ...current };
      for (const stake of visibleRewardStatusStakes) {
        next[stake.stakeEntryAddress] = {
          loading: true,
          canClaim: current[stake.stakeEntryAddress]?.canClaim ?? false,
          rewardEntryExists: current[stake.stakeEntryAddress]?.rewardEntryExists ?? false,
          reason: current[stake.stakeEntryAddress]?.reason ?? null,
          error: null,
        };
      }
      return next;
    });

    void mapWithConcurrency(
      visibleRewardStatusStakes,
      HATCHER_REWARD_STATUS_CONCURRENCY,
      async (stake): Promise<[string, HatcherRewardUiStatus]> => {
        try {
          const status = await fetchHatcherRewardStatusWithStreamflow({
            walletAddress: stake.walletAddress,
            stakePoolAddress: stake.poolAddress,
            stakeEntryAddress: stake.stakeEntryAddress,
            depositNonce: stake.depositNonce,
          });
          return [stake.stakeEntryAddress, { ...status, loading: false, error: null }];
        } catch (err) {
          return [stake.stakeEntryAddress, {
            loading: false,
            canClaim: false,
            rewardEntryExists: false,
            reason: null,
            error: err instanceof Error ? err.message : 'Could not load HATCHER rewards',
          }];
        }
      },
    ).then((entries) => {
      if (cancelled) return;
      setHatcherRewardStatuses((current) => ({
        ...current,
        ...Object.fromEntries(entries),
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [visibleRewardStatusStakes]);

  const connectWalletOnly = useCallback(async (): Promise<string> => {
    const current = walletRef.current;
    if (current.connected && current.publicKey) return current.publicKey.toBase58();

    if (current.wallet && !current.connecting) {
      try {
        await current.connect();
      } catch {
        // Fall through to explicit wallet picker.
      }
    }

    if (!walletRef.current.connected || !walletRef.current.publicKey) {
      setWalletModalVisible(true);
    }
    return waitForConnectedWallet(walletRef);
  }, [setWalletModalVisible]);

  const forceReconnectWallet = useCallback(async (): Promise<string> => {
    const current = walletRef.current;
    try {
      await current.disconnect();
    } catch {
      // Continue to re-prompt even if the adapter cannot disconnect cleanly.
    }
    try {
      current.select(null as unknown as never);
    } catch {
      // Some wallet adapters do not expose select.
    }
    try {
      localStorage.removeItem('walletName');
      localStorage.removeItem('WalletAdapterWalletName');
    } catch {
      // Storage can be unavailable in private browser contexts.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    setWalletModalVisible(true);
    return waitForConnectedWallet(walletRef);
  }, [setWalletModalVisible]);

  const signAndLinkWallet = useCallback(async (walletAddress: string): Promise<string> => {
    const challenge = await api.getWalletChallenge(walletAddress);
    if (!challenge.success) throw new Error(challenge.error);

    if (shouldUseWalletSignInForLinking({
      walletName: walletRef.current.wallet?.adapter.name,
      signInSupported: Boolean(walletRef.current.signIn),
      isMobileRuntime: isMobileWalletLinkRuntime(),
    })) {
      const signed = await walletRef.current.signIn!({
        domain: window.location.host,
        address: walletAddress,
        statement: WALLET_LINK_SIWS_STATEMENT,
        uri: window.location.origin,
        version: '1',
        nonce: challenge.data.nonce,
        issuedAt: new Date().toISOString(),
      });
      if (signed.account.address !== walletAddress) {
        throw new Error('The signed wallet does not match the connected wallet. Switch wallets and try again.');
      }
      const linked = await api.linkWallet(
        walletAddress,
        bytesToBase64(signed.signature),
        bytesToBase64(signed.signedMessage),
      );
      if (!linked.success) throw new Error(linked.error);

      setOptimisticLinkedWalletAddress(linked.data.walletAddress);
      await refreshUser();
      await load();
      return linked.data.walletAddress;
    }

    if (!walletRef.current.signMessage) {
      throw new Error('This wallet does not support message signing. Use Phantom, Solflare, or another compatible Solana wallet.');
    }

    const messageBytes = new TextEncoder().encode(challenge.data.message);
    const signature = await walletRef.current.signMessage(messageBytes);
    const linked = await api.linkWallet(
      walletAddress,
      bytesToBase64(signature),
      bytesToBase64(messageBytes),
    );
    if (!linked.success) throw new Error(linked.error);

    setOptimisticLinkedWalletAddress(linked.data.walletAddress);
    await refreshUser();
    await load();
    return linked.data.walletAddress;
  }, [load, refreshUser]);

  const linkCurrentWallet = useCallback(async (): Promise<string> => {
    if (!isAuthenticated) {
      router.push('/login?return=/staking');
      throw new Error('Sign in to Hatcher before staking so AI Credits can be assigned to your account.');
    }

    const publicKey = walletRef.current.publicKey;
    if (!walletRef.current.connected || !publicKey) {
      throw new Error('Connect your wallet before linking it.');
    }

    const walletAddress = publicKey.toBase58();
    if (linkedWalletAddress === walletAddress) return walletAddress;

    setLinkingWallet(true);
    try {
      try {
        return await signAndLinkWallet(walletAddress);
      } catch (err) {
        if (isWalletUserCancellationError(err)) throw new Error('Cancelled');
        if (!isWalletTrustRevokedError(err)) throw err;
        await forceReconnectWallet();
        throw new WalletFlowStepRequiredError('Wallet permission was refreshed. Tap Link wallet again to sign and finish linking.');
      }
    } finally {
      setLinkingWallet(false);
    }
  }, [forceReconnectWallet, isAuthenticated, linkedWalletAddress, router, signAndLinkWallet]);

  const connectAndLinkWallet = useCallback(async (forceSwitch = false) => {
    setError(null);
    setNotice(null);
    setClaimResult(null);
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?return=/staking');
      return;
    }

    try {
      if (forceSwitch && walletRef.current.connected) {
        const walletAddress = await forceReconnectWallet();
        await loadWalletBalance();
        setNotice(
          linkedWalletAddress === walletAddress
            ? 'Wallet connected. You can stake now.'
            : 'Wallet connected. Tap Link connected wallet to sign and link it.',
        );
        return;
      }

      if (!walletRef.current.connected || !walletRef.current.publicKey) {
        const walletAddress = await connectWalletOnly();
        await loadWalletBalance();
        setNotice(
          linkedWalletAddress === walletAddress
            ? 'Wallet connected. Tap Stake HATCHER again to submit the staking transaction.'
            : formatStakingWalletStepNotice('connect-wallet'),
        );
        return;
      }

      await linkCurrentWallet();
      await loadWalletBalance();
      setNotice('Wallet linked. You can stake now.');
    } catch (err) {
      if (isWalletFlowStepRequiredError(err)) {
        setNotice(err.message);
        return;
      }
      const message = err instanceof Error ? err.message : 'Could not link wallet';
      if (message !== 'Cancelled') setError(message);
    }
  }, [
    authLoading,
    connectWalletOnly,
    isAuthenticated,
    linkedWalletAddress,
    linkCurrentWallet,
    loadWalletBalance,
    forceReconnectWallet,
    router,
  ]);

  const submitStake = useCallback(async () => {
    setError(null);
    setClaimResult(null);
    setStakeTxId(null);
    setUnstakeTxId(null);
    setHatcherRewardTxId(null);
    setNotice(null);

    if (authLoading || staking || linkingWallet) return;
    if (!selectedPool?.poolAddress || !selectedPool.configured) {
      setError('This staking pool is not configured yet.');
      return;
    }
    if (!isAuthenticated) {
      router.push('/login?return=/staking');
      return;
    }

    try {
      if (walletStep === 'connect-wallet') {
        const walletAddress = await connectWalletOnly();
        await loadWalletBalance();
        setNotice(
          linkedWalletAddress === walletAddress
            ? 'Wallet connected. Tap Stake HATCHER again to submit the staking transaction.'
            : formatStakingWalletStepNotice('connect-wallet'),
        );
        return;
      }

      if (walletStep === 'link-wallet') {
        await linkCurrentWallet();
        await loadWalletBalance();
        setNotice(formatStakingWalletStepNotice('link-wallet'));
        return;
      }

      const amount = parseHatcherAmountToBaseUnits(stakeAmount);
      if (!amount || amount <= 0n) throw new Error('Enter a HATCHER amount greater than zero.');
      if (amount < MIN_HATCHER_STAKE_BASE_UNITS) throw new Error('Minimum stake is 1 HATCHER.');

      const publicKey = walletRef.current.publicKey;
      if (!publicKey) throw new Error('Connect a wallet before staking.');

      const balance = walletBalanceBaseUnits ?? await fetchHatcherWalletBalance(connection, publicKey);
      if (amount > balance) throw new Error('Insufficient HATCHER balance.');

      setStaking(true);
      const result = await stakeHatcherWithStreamflow({
        wallet: walletRef.current,
        stakePoolAddress: selectedPool.poolAddress,
        amountBaseUnits: amount,
        durationDays: selectedPool.durationDays,
        onTransactionSubmitted: setStakeTxId,
      });

      if (result.preparedOnly) {
        setNotice('Streamflow receipt setup submitted. No HATCHER was staked in that transaction; tap Stake HATCHER again after it confirms.');
        await loadWalletBalance();
        return;
      }

      setStakeTxId(result.txId);
      setStakeAmount('');
      await Promise.all([load(), loadWalletBalance()]);
    } catch (err) {
      if (isWalletFlowStepRequiredError(err)) {
        setNotice(err.message);
        return;
      }
      const message = err instanceof Error ? err.message : 'Could not stake HATCHER';
      if (message !== 'Cancelled') {
        if (/block height exceeded|signature .*expired/i.test(message)) {
          setError('Solana confirmation expired before the site could verify the transaction. If this was the receipt setup step, no HATCHER was staked; wait a few seconds, refresh the wallet balance, and try Stake HATCHER again.');
        } else {
          setError(message);
        }
      }
    } finally {
      setStaking(false);
    }
  }, [
    authLoading,
    connectWalletOnly,
    connection,
    isAuthenticated,
    linkedWalletAddress,
    linkCurrentWallet,
    linkingWallet,
    load,
    loadWalletBalance,
    router,
    selectedPool,
    stakeAmount,
    staking,
    walletBalanceBaseUnits,
    walletStep,
  ]);

  const walletActionLabel = useCallback((): string => {
    if (authLoading || linkingWallet) return 'Preparing wallet';
    if (!isAuthenticated) return 'Sign in to link wallet';
    if (!connectedWalletAddress) return 'Connect wallet';
    if (!linkedWalletAddress) return 'Link connected wallet';
    if (!walletMatchesAccount) return 'Link connected wallet';
    return 'Switch wallet';
  }, [authLoading, connectedWalletAddress, isAuthenticated, linkedWalletAddress, linkingWallet, walletMatchesAccount]);

  const claimHatcherRewards = useCallback(async (stake: StakingStakeEntry) => {
    setError(null);
    setNotice(null);
    setClaimResult(null);
    setHatcherRewardTxId(null);
    if (claimingHatcherStake || unstakingStake) return;

    setClaimingHatcherStake(stake.stakeEntryAddress);
    try {
      const wasConnected = Boolean(walletRef.current.connected && walletRef.current.publicKey);
      const walletAddress = await connectWalletOnly();
      if (walletAddress !== stake.walletAddress) {
        throw new Error('Connect the wallet that owns this stake before claiming HATCHER rewards.');
      }
      if (!wasConnected) {
        await loadWalletBalance();
        setNotice('Wallet connected. Tap Claim HATCHER rewards again to submit the claim transaction.');
        return;
      }

      const result = await claimHatcherRewardsWithStreamflow({
        wallet: walletRef.current,
        stakePoolAddress: stake.poolAddress,
        stakeEntryAddress: stake.stakeEntryAddress,
        depositNonce: stake.depositNonce,
      });

      setHatcherRewardTxId(result.txIds[result.txIds.length - 1] ?? null);
      await Promise.all([load(), loadWalletBalance()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not claim HATCHER rewards';
      if (message !== 'Cancelled') setError(message);
    } finally {
      setClaimingHatcherStake(null);
    }
  }, [claimingHatcherStake, connectWalletOnly, load, loadWalletBalance, unstakingStake]);

  const unstakeHatcherStake = useCallback(async (stake: StakingStakeEntry) => {
    setError(null);
    setNotice(null);
    setClaimResult(null);
    setStakeTxId(null);
    setUnstakeTxId(null);
    if (claimingHatcherStake || unstakingStake) return;

    if (!isStakeUnlocked(stake.unlockAt)) {
      setError(`This stake unlocks on ${formatDate(stake.unlockAt)}.`);
      return;
    }

    setUnstakingStake(stake.stakeEntryAddress);
    try {
      const wasConnected = Boolean(walletRef.current.connected && walletRef.current.publicKey);
      const walletAddress = await connectWalletOnly();
      if (walletAddress !== stake.walletAddress) {
        throw new Error('Connect the wallet that owns this stake before unstaking.');
      }
      if (!wasConnected) {
        await loadWalletBalance();
        setNotice('Wallet connected. Tap Unstake again to submit the unstake transaction.');
        return;
      }

      const result = await unstakeHatcherWithStreamflow({
        wallet: walletRef.current,
        stakePoolAddress: stake.poolAddress,
        depositNonce: stake.depositNonce,
        unlockAt: stake.unlockAt,
        onTransactionSubmitted: setUnstakeTxId,
      });

      setUnstakeTxId(result.txId);
      setNotice('Stake unstaked. Streamflow will return the unlocked HATCHER and available rewards to your wallet.');
      await Promise.all([load(), loadWalletBalance()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not unstake HATCHER';
      if (message !== 'Cancelled') setError(message);
    } finally {
      setUnstakingStake(null);
    }
  }, [claimingHatcherStake, connectWalletOnly, load, loadWalletBalance, unstakingStake]);

  const claim = async () => {
    setClaiming(true);
    setError(null);
    try {
      const res = await api.claimStakingAiCredits();
      if (res.success) {
        setClaimResult(res.data);
        await load();
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim AI Credits');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-[var(--bg-base)] px-0 py-10 text-[var(--text-primary)]">
      <div className="mx-auto box-border w-full min-w-0 max-w-6xl overflow-hidden px-3 sm:px-4">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="mb-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              <Sparkles size={14} aria-hidden />
              Continuous Streamflow staking
            </p>
            <h1 className="text-4xl font-semibold tracking-normal text-[var(--text-primary)] md:text-5xl">
              Hatcher Staking
            </h1>
            <p className="mt-3 max-w-[330px] break-words text-sm leading-6 text-[var(--text-secondary)] sm:max-w-3xl md:text-base">
              Stake directly from your wallet for HATCHER rewards, fixed AI Credits, and continuously funded pool top-ups by lock tier.
            </p>
            <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Total staked</p>
                <p className="mt-1 break-words text-lg font-semibold text-[var(--text-primary)]">
                  {config ? formatStakingTokenAmount(config.totalStakedHatcher ?? 0, 2) : '-'}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Monthly rewards</p>
                <p className="mt-1 break-words text-lg font-semibold text-[var(--text-primary)]">
                  {config ? formatStakingTokenAmount(config.monthlyEmissionHatcher) : '-'}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Funding</p>
                <p className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">
                  {fundingSourcesLabel}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void load();
              void loadWalletBalance();
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] sm:w-auto"
          >
            <RefreshCcw size={16} aria-hidden />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        <section className="mb-8 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Lock size={16} aria-hidden />
              Choose a rewards pool
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-4">
              {(config?.pools ?? []).map((pool) => (
                <PoolSelectorCard
                  key={pool.key}
                  pool={pool}
                  selected={selectedPool?.key === pool.key}
                  onSelect={setSelectedPoolKey}
                />
              ))}
              {loading && !config && (
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
                  Loading staking pools...
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitStake();
            }}
            className="min-w-0 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 sm:p-5"
          >
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Stake & Earn</p>
                <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                  {selectedPool ? selectedPool.label : 'Select pool'}
                </h2>
              </div>
              <div className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-left sm:w-auto sm:text-right">
                <p className="text-xs text-[var(--text-muted)]">Reward share</p>
                <p className="text-lg font-semibold text-[var(--accent)]">
                  {selectedPool ? rewardShare(selectedPool) : '-'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex min-w-0 flex-col items-start gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="staking-amount" className="font-semibold text-[var(--text-primary)]">
                  Amount
                </label>
                <button
                  type="button"
                  onClick={() => void loadWalletBalance()}
                  disabled={!connectedWalletAddress || balanceLoading}
                  className="inline-flex max-w-full items-center gap-1.5 break-words text-left text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw size={13} aria-hidden />
                  Balance: {balanceLabel}
                </button>
              </div>
              <div className="flex min-h-16 w-full min-w-0 max-w-full flex-col items-stretch justify-center gap-1 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 sm:min-h-14 sm:flex-row sm:items-center sm:gap-0 sm:px-4 sm:py-0">
                <input
                  id="staking-amount"
                  inputMode="decimal"
                  value={stakeAmount}
                  onChange={(event) => setStakeAmount(event.target.value)}
                  placeholder="0"
                  className="min-w-0 w-full flex-1 bg-transparent text-xl font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] sm:text-2xl"
                />
                <span className="max-w-full shrink-0 truncate text-[11px] font-semibold uppercase leading-none text-[var(--text-muted)] sm:ml-3 sm:max-w-none sm:text-sm sm:normal-case sm:leading-normal">HATCHER</span>
              </div>
              {amountInvalid && (
                <p className="mt-2 text-xs font-medium text-amber-400">Use a numeric HATCHER amount.</p>
              )}
              {amountTooLow && (
                <p className="mt-2 text-xs font-medium text-amber-400">Minimum stake is 1 HATCHER.</p>
              )}
              {amountTooHigh && (
                <p className="mt-2 text-xs font-medium text-amber-400">Amount is higher than your connected wallet balance.</p>
              )}
              {balanceError && (
                <p className="mt-2 text-xs font-medium text-amber-400">Balance unavailable: {balanceError}</p>
              )}
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                Minimum stake is 1 HATCHER. A new pool may require a separate Streamflow receipt setup transaction first; that uses a small SOL rent/network fee and does not move HATCHER.
              </p>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
              {STAKE_PERCENTAGES.map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => {
                    if (walletBalanceBaseUnits !== null) {
                      setStakeAmount(percentOfHatcherBalance(walletBalanceBaseUnits, percent));
                    }
                  }}
                  disabled={walletBalanceBaseUnits === null || walletBalanceBaseUnits <= 0n || balanceLoading}
                  className="min-w-0 rounded-lg border border-[var(--border-default)] px-2 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
                >
                  {percent}%
                </button>
              ))}
            </div>

            <div className="mt-6 border-t border-[var(--border-default)] pt-5">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Reward estimate</p>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {rewardEstimate
                      ? `${formatStakingTokenAmount(rewardEstimate.estimatedHatcherRewards, 2)} estimated`
                      : 'Enter an amount to simulate rewards'}
                  </h3>
                </div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  {selectedPool ? selectedPool.label : 'Select pool'}
                </p>
              </div>

              {rewardEstimate ? (
                <>
                  <div className="mt-4 grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-[var(--text-muted)]">Your pool share</p>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {formatEstimatePercent(rewardEstimate.poolSharePercent)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--text-muted)]">Reward pool estimate</p>
                      <p className="break-words font-semibold text-[var(--text-primary)]">
                        {formatStakingTokenAmount(rewardEstimate.rewardBudgetForLock, 2)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--text-muted)]">Pool after stake</p>
                      <p className="break-words font-semibold text-[var(--text-primary)]">
                        {formatStakingTokenAmount(rewardEstimate.poolTotalAfterStake, 2)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--text-muted)]">APR after stake</p>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {formatApr(rewardEstimate.estimatedAprAfterStake)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--text-muted)]">AI Credits for full lock</p>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {formatNumber(rewardEstimate.estimatedAiCredits)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--text-muted)]">Based on stake</p>
                      <p className="break-words font-semibold text-[var(--text-primary)]">
                        {formatStakingTokenAmount(rewardEstimate.amountHatcher, 2)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                    Estimate only. HATCHER rewards depend on live pool size, Streamflow reward balance, and future top-ups. If more users stake in this pool, your share changes.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                  Add at least 1 HATCHER to preview pool share, estimated HATCHER rewards, AI Credits, and APR before submitting a transaction.
                </p>
              )}
            </div>

            <div className="mt-6 grid gap-3 border-t border-[var(--border-default)] pt-5 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-[var(--text-muted)]">Lock period</p>
                <p className="font-semibold text-[var(--text-primary)]">{selectedPool?.label ?? '-'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text-muted)]">Unlock date</p>
                <p className="font-semibold text-[var(--text-primary)]">{futureUnlockDate(selectedPool)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text-muted)]">AI Credits</p>
                <p className="break-words font-semibold text-[var(--text-primary)]">
                  {selectedPool ? `${selectedPool.aiCreditsPerDayPerMillion}/day per 1M $HATCHER` : '-'}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text-muted)]">HATCHER rewards</p>
                <p className="font-semibold text-[var(--text-primary)]">Streamflow pool top-ups</p>
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text-muted)]">Pool staked</p>
                <p className="break-words font-semibold text-[var(--text-primary)]">
                  {selectedPool ? formatStakingTokenAmount(selectedPool.totalStakedHatcher ?? 0, 2) : '-'}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text-muted)]">APR at cap</p>
                <p className="font-semibold text-[var(--text-primary)]">{formatApr(selectedPool?.estimatedAprAtCap)}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={stakeSubmitDisabled}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wallet size={16} aria-hidden />
              {stakeButtonLabel}
            </button>

            {stakeTxId && (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                Stake transaction submitted: {shortAddress(stakeTxId)}
              </div>
            )}

            {unstakeTxId && (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                Unstake transaction submitted: {shortAddress(unstakeTxId)}
              </div>
            )}

            {hatcherRewardTxId && (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                HATCHER reward claim submitted: {shortAddress(hatcherRewardTxId)}
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
              The connected wallet is linked to your Hatcher account before staking so AI Credits accrue to the same account.
            </p>
            {phantomBrowseUrl && (
              <a
                href={phantomBrowseUrl}
                className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                Mobile wallet not opening? Open staking in Phantom.
              </a>
            )}
          </form>
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
          <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]">
            <div className="flex flex-col gap-4 border-b border-[var(--border-default)] p-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Your active stakes</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Linked wallet: {shortAddress(linkedWalletAddress)}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Connected wallet: {shortAddress(connectedWalletAddress)}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Claimable AI Credits: {formatNumber(summary?.claimableAiCredits ?? 0)}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Reward estimates use current pool size and configured lock budgets. Streamflow top-ups and new stakes can change them.
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Positions are grouped by pool for readability; each Streamflow position keeps its own unlock date and actions.
                </p>
                {connectedWalletAddress && linkedWalletAddress && !walletMatchesAccount && (
                  <p className="mt-2 text-sm font-medium text-amber-400">
                    Link the connected wallet before staking if you want AI Credits on this account.
                  </p>
                )}
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row md:shrink-0">
                <button
                  type="button"
                  onClick={() => void connectAndLinkWallet(walletMatchesAccount)}
                  disabled={linkingWallet || authLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Wallet size={16} aria-hidden />
                  {walletActionLabel()}
                </button>
                <button
                  type="button"
                  onClick={() => void claim()}
                  disabled={claiming || !canClaimAiCredits}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Sparkles size={16} aria-hidden />
                  {claiming ? 'Claiming' : 'Claim credits'}
                </button>
              </div>
            </div>

            <div>
              {activeStakeGroups.length === 0 ? (
                <div className="p-6 text-sm text-[var(--text-muted)]">
                  No active Streamflow stakes found for your linked Solana wallet.
                </div>
              ) : (
                <div className="space-y-3 p-4 sm:p-5">
                  {activeStakeGroups.map((group) => {
                    const groupExpanded = expandedStakePoolKeys.has(group.poolKey);
                    const claimableHatcherPositionCount = group.stakes.filter((stake) => (
                      canClaimHatcherReward(hatcherRewardStatuses[stake.stakeEntryAddress])
                    )).length;
                    const unlockedStakeCount = group.stakes.filter((stake) => isStakeUnlocked(stake.unlockAt)).length;

                    return (
                      <details
                        key={group.poolKey}
                        open={groupExpanded}
                        onToggle={(event) => setStakePoolGroupExpanded(group.poolKey, event.currentTarget.open)}
                        className="group overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]"
                      >
                        <summary className="flex cursor-pointer list-none flex-col gap-4 p-4 transition hover:bg-[var(--bg-elevated)] sm:p-5 [&::-webkit-details-marker]:hidden">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Pool</p>
                              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                                <h3 className="break-words text-xl font-semibold text-[var(--text-primary)]">
                                  {group.poolLabel}
                                </h3>
                                <span className="rounded-lg border border-[var(--border-default)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                                  {group.positionCount === 1 ? '1 position' : `${group.positionCount} positions`}
                                </span>
                                {unlockedStakeCount > 0 && (
                                  <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                    {unlockedStakeCount === 1 ? '1 unlocked' : `${unlockedStakeCount} unlocked`}
                                  </span>
                                )}
                                {claimableHatcherPositionCount > 0 && (
                                  <span className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                                    {claimableHatcherPositionCount === 1
                                      ? '1 HATCHER claimable'
                                      : `${claimableHatcherPositionCount} HATCHER claimable`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronDown
                              size={18}
                              aria-hidden
                              className="mt-1 shrink-0 text-[var(--text-muted)] transition group-open:rotate-180"
                            />
                          </div>

                          <div className="grid min-w-0 grid-cols-2 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-5">
                            <div className="min-w-0">
                              <p className="text-xs text-[var(--text-muted)]">Total staked</p>
                              <p className="break-words font-semibold text-[var(--text-primary)]">
                                {formatStakingTokenAmount(group.totalStakedHatcher, 2)}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-[var(--text-muted)]">Est. rewards</p>
                              <p className="break-words font-semibold text-[var(--text-primary)]">
                                {group.estimatedHatcherRewards !== null
                                  ? `~${formatStakingTokenAmount(group.estimatedHatcherRewards, 2)}`
                                  : '-'}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-[var(--text-muted)]">Pool share</p>
                              <p className="font-semibold text-[var(--text-primary)]">
                                {group.poolSharePercent !== null
                                  ? formatEstimatePercent(group.poolSharePercent)
                                  : '-'}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-[var(--text-muted)]">Next unlock</p>
                              <p className="font-semibold text-[var(--text-primary)]">
                                {group.nextUnlockAt ? formatDate(group.nextUnlockAt) : 'Unknown'}
                              </p>
                            </div>
                            <div className="col-span-2 min-w-0 sm:col-span-1">
                              <p className="text-xs text-[var(--text-muted)]">AI Credits</p>
                              <p className="font-semibold text-[var(--text-primary)]">
                                {formatNumber(group.totalClaimableAiCredits)} claimable
                              </p>
                            </div>
                          </div>
                        </summary>

                        <div className="divide-y divide-[var(--border-default)] border-t border-[var(--border-default)]">
                          {group.stakes.map((stake) => {
                            const hatcherStatus = hatcherRewardStatuses[stake.stakeEntryAddress];
                            const hatcherClaimable = canClaimHatcherReward(hatcherStatus);
                            const stakeUnlocked = isStakeUnlocked(stake.unlockAt);
                            const hatcherClaimDisabled = Boolean(claimingHatcherStake || unstakingStake) || !hatcherClaimable;
                            const unstakeDisabled = Boolean(claimingHatcherStake || unstakingStake) || !stakeUnlocked;
                            const activeStakeEstimate = estimateActiveStakeRewards(group.pool, stake.stakedHatcher);

                            return (
                              <div key={stake.stakeEntryAddress} className="grid min-w-0 gap-3 p-4 md:grid-cols-5">
                                <div className="min-w-0">
                                  <p className="text-xs text-[var(--text-muted)]">Staked</p>
                                  <p className="break-words font-semibold">{formatNumber(stake.stakedHatcher, 2)} HATCHER</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-[var(--text-muted)]">Unlock</p>
                                  <p className="font-semibold">{formatDate(stake.unlockAt)}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-[var(--text-muted)]">AI Credits</p>
                                  <p className="font-semibold">{formatNumber(stake.claimableAiCredits)} claimable</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-[var(--text-muted)]">HATCHER rewards</p>
                                  <p className="font-semibold">{hatcherRewardStatusLabel(hatcherStatus)}</p>
                                  <p className="mt-2 text-xs text-[var(--text-muted)]">Est. full-lock rewards</p>
                                  <p className="break-words text-sm font-semibold text-[var(--text-primary)]">
                                    {activeStakeEstimate
                                      ? `~${formatStakingTokenAmount(activeStakeEstimate.estimatedHatcherRewards, 2)}`
                                      : '-'}
                                  </p>
                                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                                    {activeStakeEstimate
                                      ? `${formatEstimatePercent(activeStakeEstimate.poolSharePercent)} pool share`
                                      : 'Pool total unavailable'}
                                  </p>
                                  {hatcherStatus?.error && (
                                    <p className="mt-1 text-xs text-amber-400">{hatcherStatus.error}</p>
                                  )}
                                </div>
                                <div className="flex min-w-0 flex-col items-stretch gap-2 md:items-end">
                                  <button
                                    type="button"
                                    onClick={() => void claimHatcherRewards(stake)}
                                    disabled={hatcherClaimDisabled}
                                    title={hatcherRewardClaimReason(hatcherStatus)}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                                  >
                                    <Coins size={14} aria-hidden />
                                    {claimingHatcherStake === stake.stakeEntryAddress
                                      ? 'Claiming'
                                      : hatcherStatus?.loading
                                        ? 'Checking'
                                        : hatcherClaimable
                                          ? 'Claim HATCHER'
                                          : 'No rewards'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void unstakeHatcherStake(stake)}
                                    disabled={unstakeDisabled}
                                    title={stakeUnlocked ? 'Unstake unlocked HATCHER and available rewards' : `Locked until ${formatDate(stake.unlockAt)}`}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                                  >
                                    {stakeUnlocked ? <ArrowUpRight size={14} aria-hidden /> : <Lock size={14} aria-hidden />}
                                    {unstakingStake === stake.stakeEntryAddress
                                      ? 'Unstaking'
                                      : stakeUnlocked
                                        ? 'Unstake'
                                        : 'Locked'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="min-w-0 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center gap-2">
              <Coins size={17} aria-hidden />
              <h2 className="text-lg font-semibold">Reward controls</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm text-[var(--text-secondary)]">
              <p className="break-words">
                HATCHER rewards use a continuous funding model instead of a one-time fixed pool. Creator fees, buybacks, and the dev wallet can keep adding top-ups into the Streamflow staking pools over time.
              </p>
              <p className="break-words">
                Funding sources are {fundingSourcesLabel}. When new rewards are added, the campaign allocation is routed by lock tier{rewardSplitSummary ? `: ${rewardSplitSummary}.` : ' across 7, 30, and 90 day locks.'}
              </p>
              <p className="break-words">
                Each Streamflow pool distributes its own reward balance pro-rata. Your HATCHER rewards depend on your wallet's share of total staked HATCHER in that tier, plus how long the position stays active.
              </p>
              <p className="break-words">
                Additional top-ups increase the reward balance available to that tier. The page tracks total staked live so rewards can be evaluated against the current pool size, not only the initial campaign cap.
              </p>
              <p className="break-words">
                AI Credits are fixed by tier, capped at{' '}
                <strong className="text-[var(--text-primary)]">{formatNumber(config?.aiCreditsPerWalletMonthlyCap ?? 100000)} per wallet per month</strong>, and expire after{' '}
                <strong className="text-[var(--text-primary)]">{config?.aiCreditExpiryDays ?? 90} days</strong>.
              </p>
              {claimResult && (
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
                  Claimed {formatNumber(claimResult.creditsGranted)} AI Credits. Balance: {formatNumber(claimResult.balance)}.
                </div>
              )}
              <Link
                href="/token"
                className="inline-flex max-w-full flex-wrap items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                View token mechanics <ArrowUpRight size={15} aria-hidden />
              </Link>
            </div>
          </aside>
        </section>

        <div className="mt-10 flex justify-center">
          <a
            href="https://streamflow.finance/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-center text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            Powered by Streamflow <ArrowUpRight size={15} aria-hidden />
          </a>
        </div>
      </div>
    </main>
  );
}
