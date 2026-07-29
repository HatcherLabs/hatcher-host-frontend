import BN from 'bn.js';
import type { Connection, VersionedTransaction } from '@solana/web3.js';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import type { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import {
  SolanaStakingClient,
  deriveRewardEntryPDA,
  deriveRewardPoolPDA,
  deriveStakeEntryPDA,
  deriveStakeMintPDA,
} from '@streamflow/staking';
import { ICluster, prepareTransaction } from '@streamflow/common';
import {
  HATCH_TOKEN_MINT,
  SOLANA_NETWORK,
  SOLANA_RPC_BROWSER_ENDPOINT,
} from '@/lib/config';

export const HATCHER_TOKEN_DECIMALS = 6;
export const MIN_HATCHER_STAKE_BASE_UNITS = 1_000_000n;

export type HatcherRewardStatusKind =
  | 'claimable'
  | 'no_rewards'
  | 'entry_missing'
  | 'pool_missing'
  | 'simulation_error'
  | 'rpc_error';

export type HatcherRewardStatus = {
  canClaim: boolean;
  rewardEntryExists: boolean;
  kind: HatcherRewardStatusKind;
  reason: string | null;
  detail?: string;
};

export type HatcherRewardUiStatus = HatcherRewardStatus & {
  loading: boolean;
  error: string | null;
};

export type HatcherRewardPoolResolution = {
  nonce: number;
  source: 'discovered' | 'fallback';
};

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const HATCHER_MINT = new PublicKey(HATCH_TOKEN_MINT);
// Used when on-chain reward pool discovery finds nothing (or fails): today's pools live at nonce 0.
const HATCHER_REWARD_POOL_FALLBACK_NONCE = 0;
// Dynamic reward-pool account layout: 8-byte anchor discriminator + bump (u8) + nonce (u8), then
// stake_pool. Verified against the reward_pool_dynamic IDL bundled with @streamflow/staking 12.5.0.
// Note the dynamic layout inserts `governor` before `mint` (mint sits at byte 74, not the fixed
// layout's 42), so pools must be filtered by mint on the DECODED account, never with a mint memcmp.
const DYNAMIC_REWARD_POOL_STAKE_POOL_OFFSET = 10;
// Dynamic reward-entry account layout: 8-byte discriminator, then reward_pool (32) and stake_entry.
const DYNAMIC_REWARD_ENTRY_STAKE_ENTRY_OFFSET = 40;
// Streamflow dynamic reward-pool program errors that genuinely mean "nothing to claim right now".
const NOTHING_TO_CLAIM_PROGRAM_ERROR_CODES = new Set([
  6012, // ClaimTooEarly: claim period has not passed yet
  6013, // RewardPoolDrained: pool does not have enough rewards for claiming
]);
const SIMULATION_DETAIL_LOG_LINES = 4;
const NO_REWARDS_REASON = 'No HATCHER rewards are available to claim yet.';
const ENTRY_MISSING_REASON = 'Reward tracking account is missing for this stake.';
const POOL_MISSING_REASON = 'Rewards for this stake are tracked under a different reward pool. Refresh to re-sync reward data.';
const SIMULATION_ERROR_REASON = 'HATCHER reward check failed. Refresh and try again.';
const RPC_ERROR_REASON = 'Could not verify HATCHER rewards right now. Refresh and try again.';
// Streamflow fetches a governor when this is undefined; Hatcher dynamic reward pools are permissionless.
const HATCHER_DYNAMIC_REWARD_GOVERNOR = null as unknown as PublicKey;
const STAKING_PREFLIGHT_ERROR_MESSAGE = 'Staking transaction failed preflight simulation. Refresh staking data and try again.';
const STAKING_BROADCAST_ERROR_MESSAGE = 'Staking transaction failed after broadcast. Refresh staking data and try again.';
const POST_SUBMIT_CONFIRMATION_TIMEOUT_MS = 4_000;
const POST_SUBMIT_STATUS_TIMEOUT_MS = 2_500;
let resolvedHatcherTokenProgramId: PublicKey | null = null;

export type StakeHatcherResult = {
  txId: string;
  setupIncluded?: boolean;
};

function cluster(): ICluster {
  if (SOLANA_NETWORK === 'devnet') return ICluster.Devnet;
  if (SOLANA_NETWORK === 'testnet') return ICluster.Testnet;
  if (SOLANA_NETWORK === 'local') return ICluster.Local;
  return ICluster.Mainnet;
}

function randomNonce(): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] ?? Math.floor(Math.random() * 0xffffffff);
}

function parsedTokenAmount(raw: unknown): bigint {
  if (!raw || typeof raw !== 'object') return 0n;
  const amount = (raw as { amount?: unknown }).amount;
  if (typeof amount !== 'string' || !/^\d+$/.test(amount)) return 0n;
  return BigInt(amount);
}

async function getHatcherTokenProgramId(connection: Connection): Promise<PublicKey> {
  if (resolvedHatcherTokenProgramId) return resolvedHatcherTokenProgramId;

  const account = await connection.getAccountInfo(HATCHER_MINT, 'confirmed');
  if (account?.owner.equals(TOKEN_PROGRAM_ID) || account?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    resolvedHatcherTokenProgramId = account.owner;
    return account.owner;
  }

  resolvedHatcherTokenProgramId = TOKEN_2022_PROGRAM_ID;
  return resolvedHatcherTokenProgramId;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function keyString(value: unknown): string {
  if (value && typeof (value as { toBase58?: unknown }).toBase58 === 'function') {
    return (value as { toBase58: () => string }).toBase58();
  }
  return String(value);
}

function toBigIntSafe(value: unknown): bigint {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
    const text = typeof value === 'string'
      ? value
      : value != null && typeof (value as { toString?: unknown }).toString === 'function'
        ? (value as { toString: () => string }).toString()
        : '';
    if (/^\d+$/.test(text)) return BigInt(text);
  } catch {
    // fall through to 0n
  }
  return 0n;
}

type DynamicRewardPoolAccountRecord = {
  account: {
    nonce: number;
    mint: PublicKey;
    fundedAmount?: unknown;
    createdTs?: unknown;
  };
};

const hatcherRewardPoolCache = new Map<string, HatcherRewardPoolResolution>();

export function resetHatcherRewardPoolCache(): void {
  hatcherRewardPoolCache.clear();
}

function invalidateHatcherRewardPoolCache(stakePool: PublicKey): void {
  hatcherRewardPoolCache.delete(stakePool.toBase58());
}

// Deterministic pick when a stake pool has several HATCHER reward pools (e.g. a refill created a
// new one): funded beats unfunded, then the most recently created, then the highest nonce.
function preferHatcherRewardPool(
  best: DynamicRewardPoolAccountRecord,
  candidate: DynamicRewardPoolAccountRecord,
): DynamicRewardPoolAccountRecord {
  const bestFunded = toBigIntSafe(best.account.fundedAmount) > 0n;
  const candidateFunded = toBigIntSafe(candidate.account.fundedAmount) > 0n;
  if (bestFunded !== candidateFunded) return bestFunded ? best : candidate;
  const bestCreated = toBigIntSafe(best.account.createdTs);
  const candidateCreated = toBigIntSafe(candidate.account.createdTs);
  if (bestCreated !== candidateCreated) return bestCreated > candidateCreated ? best : candidate;
  return candidate.account.nonce > best.account.nonce ? candidate : best;
}

export async function resolveHatcherRewardPool(
  client: SolanaStakingClient,
  stakePool: PublicKey,
): Promise<HatcherRewardPoolResolution> {
  const cacheKey = stakePool.toBase58();
  const cached = hatcherRewardPoolCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Hatcher pools are DYNAMIC reward pools; SolanaStakingClient.searchRewardPools queries the
    // fixed rewardPoolProgram and returns nothing for them, so query the dynamic program directly.
    const pools = await client.programs.rewardPoolDynamicProgram.account.rewardPool.all([
      { memcmp: { offset: DYNAMIC_REWARD_POOL_STAKE_POOL_OFFSET, bytes: cacheKey } },
    ]) as unknown as DynamicRewardPoolAccountRecord[];
    const hatcherPools = pools.filter((pool) => pool.account.mint.equals(HATCHER_MINT));
    const resolution: HatcherRewardPoolResolution = hatcherPools.length === 0
      ? { nonce: HATCHER_REWARD_POOL_FALLBACK_NONCE, source: 'fallback' }
      : { nonce: hatcherPools.reduce(preferHatcherRewardPool).account.nonce, source: 'discovered' };
    hatcherRewardPoolCache.set(cacheKey, resolution);
    return resolution;
  } catch (err) {
    // Do not cache the failure path so a transient RPC error does not pin the fallback nonce.
    console.warn('[staking] HATCHER reward pool discovery failed; using fallback nonce.', err);
    return { nonce: HATCHER_REWARD_POOL_FALLBACK_NONCE, source: 'fallback' };
  }
}

function associatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  tokenProgramId: PublicKey,
): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return address;
}

function createAssociatedTokenAccountIdempotentInstruction(params: {
  payer: PublicKey;
  associatedToken: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  tokenProgramId: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: params.associatedToken, isSigner: false, isWritable: true },
      { pubkey: params.owner, isSigner: false, isWritable: false },
      { pubkey: params.mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: params.tokenProgramId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}

async function preparePreflightedWalletTransaction(params: {
  connection: Connection;
  payer: PublicKey;
  instructions: TransactionInstruction[];
}): Promise<{
  tx: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const { tx, hash } = await prepareTransaction(
    params.connection,
    params.instructions,
    params.payer,
    'confirmed',
  );

  if (
    tx.message.header.numRequiredSignatures !== 1
    || !tx.message.staticAccountKeys[0]?.equals(params.payer)
  ) {
    throw new Error('Staking transaction must be signed only by the connected wallet.');
  }

  const simulation = await params.connection.simulateTransaction(tx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
  });
  if (simulation.value.err) {
    throw new Error(STAKING_PREFLIGHT_ERROR_MESSAGE);
  }

  return {
    tx,
    blockhash: hash.blockhash,
    lastValidBlockHeight: hash.lastValidBlockHeight,
  };
}

async function signAndBroadcastPreparedTransaction(params: {
  wallet: WalletContextState;
  connection: Connection;
  prepared: Awaited<ReturnType<typeof preparePreflightedWalletTransaction>>;
  onTransactionSubmitted?: (txId: string) => void;
}): Promise<string> {
  if (!params.wallet.signTransaction) {
    throw new Error('Connect a wallet that supports Solana transaction signing.');
  }

  const signed = await params.wallet.signTransaction(params.prepared.tx);
  const txId = await params.connection.sendRawTransaction(signed.serialize(), {
    preflightCommitment: 'confirmed',
    skipPreflight: false,
    maxRetries: 3,
  });
  params.onTransactionSubmitted?.(txId);

  await confirmSubmittedTransaction({
    connection: params.connection,
    signature: txId,
    blockhash: params.prepared.blockhash,
    lastValidBlockHeight: params.prepared.lastValidBlockHeight,
  });

  return txId;
}

async function confirmSubmittedTransaction(params: {
  connection: Connection;
  signature: string;
  blockhash: string;
  lastValidBlockHeight: number;
}): Promise<void> {
  const confirmation = await settleWithin(params.connection.confirmTransaction({
    signature: params.signature,
    blockhash: params.blockhash,
    lastValidBlockHeight: params.lastValidBlockHeight,
  }, 'confirmed'), POST_SUBMIT_CONFIRMATION_TIMEOUT_MS);

  if (confirmation.status === 'fulfilled') {
    if (confirmation.value.value.err) {
      throw new Error(STAKING_BROADCAST_ERROR_MESSAGE);
    }
    return;
  }

  const statusResult = await settleWithin(
    params.connection.getSignatureStatuses([params.signature]),
    POST_SUBMIT_STATUS_TIMEOUT_MS,
  );
  if (statusResult.status !== 'fulfilled') return;

  const signatureStatus = statusResult.value.value[0];
  if (signatureStatus?.err) {
    throw new Error(STAKING_BROADCAST_ERROR_MESSAGE);
  }
}

function settleWithin<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown }
  | { status: 'timeout' }
> {
  return new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (result:
      | { status: 'fulfilled'; value: T }
      | { status: 'rejected'; reason: unknown }
      | { status: 'timeout' }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    timeout = setTimeout(() => finish({ status: 'timeout' }), timeoutMs);
    promise.then(
      (value) => finish({ status: 'fulfilled', value }),
      (reason) => finish({ status: 'rejected', reason }),
    );
  });
}

async function sendPreparedWalletTransaction(params: {
  wallet: WalletContextState;
  connection: Connection;
  prepared: Awaited<ReturnType<typeof preparePreflightedWalletTransaction>>;
  onTransactionSubmitted?: (txId: string) => void;
}): Promise<string> {
  if (params.wallet.sendTransaction) {
    const txId = await params.wallet.sendTransaction(params.prepared.tx, params.connection, {
      preflightCommitment: 'confirmed',
      skipPreflight: false,
      maxRetries: 3,
    });
    params.onTransactionSubmitted?.(txId);

    await confirmSubmittedTransaction({
      connection: params.connection,
      signature: txId,
      blockhash: params.prepared.blockhash,
      lastValidBlockHeight: params.prepared.lastValidBlockHeight,
    });

    return txId;
  }

  return signAndBroadcastPreparedTransaction(params);
}

function isStakingPreflightSimulationError(err: unknown): boolean {
  return err instanceof Error && err.message === STAKING_PREFLIGHT_ERROR_MESSAGE;
}

export async function fetchHatcherWalletBalance(
  connection: Connection,
  owner: PublicKey,
): Promise<bigint> {
  const tokenProgramId = await getHatcherTokenProgramId(connection);
  const accounts = await connection.getParsedTokenAccountsByOwner(
    owner,
    { programId: tokenProgramId },
    'confirmed',
  );

  return accounts.value.reduce((sum, row) => {
    const parsed = 'parsed' in row.account.data ? row.account.data.parsed : null;
    const info = parsed && typeof parsed === 'object'
      ? (parsed as { info?: { mint?: string; owner?: string; tokenAmount?: unknown } }).info
      : null;
    if (!info || info.mint !== HATCHER_MINT.toBase58() || info.owner !== owner.toBase58()) {
      return sum;
    }
    return sum + parsedTokenAmount(info.tokenAmount);
  }, 0n);
}

export function baseUnitsToHatcherString(baseUnits: bigint, maximumFractionDigits = 6): string {
  const base = 10n ** BigInt(HATCHER_TOKEN_DECIMALS);
  const whole = baseUnits / base;
  const fraction = baseUnits % base;
  if (fraction === 0n) return whole.toString();

  const trimmedFraction = fraction
    .toString()
    .padStart(HATCHER_TOKEN_DECIMALS, '0')
    .slice(0, maximumFractionDigits)
    .replace(/0+$/, '');
  return trimmedFraction ? `${whole.toString()}.${trimmedFraction}` : whole.toString();
}

export function parseHatcherAmountToBaseUnits(value: string): bigint | null {
  const normalized = value.trim().replace(/,/g, '');
  if (!/^\d*(?:\.\d*)?$/.test(normalized)) return null;
  if (!normalized || normalized === '.') return null;

  const [wholeRaw = '0', fractionRaw = ''] = normalized.split('.');
  const whole = wholeRaw || '0';
  const fraction = fractionRaw.slice(0, HATCHER_TOKEN_DECIMALS).padEnd(HATCHER_TOKEN_DECIMALS, '0');
  const raw = `${whole}${fraction}`.replace(/^0+(?=\d)/, '');
  return BigInt(raw || '0');
}

export function percentOfHatcherBalance(balanceBaseUnits: bigint, percent: number): string {
  if (balanceBaseUnits <= 0n || percent <= 0) return '0';
  const baseUnits = (balanceBaseUnits * BigInt(percent)) / 100n;
  return baseUnitsToHatcherString(baseUnits);
}

export async function stakeHatcherWithStreamflow(params: {
  wallet: WalletContextState;
  stakePoolAddress: string;
  amountBaseUnits: bigint;
  durationDays: number;
  onTransactionSubmitted?: (txId: string) => void;
}): Promise<StakeHatcherResult> {
  if (!params.wallet.publicKey || (!params.wallet.sendTransaction && !params.wallet.signTransaction)) {
    throw new Error('Connect a wallet that supports Solana transaction signing.');
  }
  if (params.amountBaseUnits <= 0n) {
    throw new Error('Enter an amount greater than zero.');
  }
  if (params.amountBaseUnits < MIN_HATCHER_STAKE_BASE_UNITS) {
    throw new Error('Minimum stake is 1 HATCHER.');
  }

  const client = new SolanaStakingClient({
    clusterUrl: SOLANA_RPC_BROWSER_ENDPOINT,
    cluster: cluster(),
    commitment: 'confirmed',
  });
  const tokenProgramId = await getHatcherTokenProgramId(client.connection);
  const invoker = params.wallet as unknown as SignerWalletAdapter;
  const stakePool = new PublicKey(params.stakePoolAddress);
  const { nonce: rewardPoolNonce } = await resolveHatcherRewardPool(client, stakePool);
  const stakeMint = deriveStakeMintPDA(client.getCurrentProgramId('stakePoolProgram'), stakePool);
  const receiptTokenAccount = associatedTokenAddress(stakeMint, params.wallet.publicKey, tokenProgramId);
  const receiptAccountInfo = await client.connection.getAccountInfo(receiptTokenAccount, 'confirmed');
  const setupInstructions = receiptAccountInfo
    ? []
    : [createAssociatedTokenAccountIdempotentInstruction({
      payer: params.wallet.publicKey,
      associatedToken: receiptTokenAccount,
      owner: params.wallet.publicKey,
      mint: stakeMint,
      tokenProgramId,
    })];

  const { ixs } = await client.prepareStakeAndCreateEntriesInstructions({
    stakePool: params.stakePoolAddress,
    stakePoolMint: HATCHER_MINT,
    tokenProgramId,
    amount: new BN(params.amountBaseUnits.toString()),
    duration: new BN(params.durationDays * 86_400),
    nonce: randomNonce(),
    rewardPools: [{
      nonce: rewardPoolNonce,
      mint: HATCHER_MINT,
      tokenProgramId,
      rewardPoolType: 'dynamic',
    }],
  }, {
    invoker,
  });

  const prepared = await preparePreflightedWalletTransaction({
    connection: client.connection,
    payer: params.wallet.publicKey,
    instructions: [...setupInstructions, ...ixs],
  });
  const txId = await sendPreparedWalletTransaction({
    wallet: params.wallet,
    connection: client.connection,
    prepared,
    onTransactionSubmitted: params.onTransactionSubmitted,
  });
  return { txId, setupIncluded: setupInstructions.length > 0 || undefined };
}

export function isStakeUnlocked(unlockAt: string | Date, now = new Date()): boolean {
  const unlockDate = typeof unlockAt === 'string' ? new Date(unlockAt) : unlockAt;
  return !Number.isNaN(unlockDate.getTime()) && unlockDate.getTime() <= now.getTime();
}

export async function unstakeHatcherWithStreamflow(params: {
  wallet: WalletContextState;
  stakePoolAddress: string;
  depositNonce: number;
  unlockAt: string | Date;
  onTransactionSubmitted?: (txId: string) => void;
}): Promise<{ txId: string; rewardsIncluded?: boolean }> {
  if (!params.wallet.publicKey || (!params.wallet.sendTransaction && !params.wallet.signTransaction)) {
    throw new Error('Connect a wallet that supports Solana transaction signing.');
  }
  if (!isStakeUnlocked(params.unlockAt)) {
    throw new Error('This stake is still locked. Unstake is available after the lock period ends.');
  }

  const client = new SolanaStakingClient({
    clusterUrl: SOLANA_RPC_BROWSER_ENDPOINT,
    cluster: cluster(),
    commitment: 'confirmed',
  });
  const tokenProgramId = await getHatcherTokenProgramId(client.connection);
  const invoker = params.wallet as unknown as SignerWalletAdapter;
  const { nonce: rewardPoolNonce } = await resolveHatcherRewardPool(
    client,
    new PublicKey(params.stakePoolAddress),
  );

  const { ixs } = await client.prepareUnstakeAndClaimInstructions({
    stakePool: params.stakePoolAddress,
    stakePoolMint: HATCHER_MINT,
    tokenProgramId,
    nonce: params.depositNonce,
    rewardPools: [{
      nonce: rewardPoolNonce,
      mint: HATCHER_MINT,
      tokenProgramId,
      rewardPoolType: 'dynamic',
      governor: HATCHER_DYNAMIC_REWARD_GOVERNOR,
    }],
  }, { invoker });

  try {
    const prepared = await preparePreflightedWalletTransaction({
      connection: client.connection,
      payer: params.wallet.publicKey,
      instructions: ixs,
    });
    const txId = await sendPreparedWalletTransaction({
      wallet: params.wallet,
      connection: client.connection,
      prepared,
      onTransactionSubmitted: params.onTransactionSubmitted,
    });
    return { txId };
  } catch (err) {
    if (!isStakingPreflightSimulationError(err)) throw err;

    const { ixs: unstakeOnlyIxs } = await client.prepareUnstakeInstructions({
      stakePool: params.stakePoolAddress,
      stakePoolMint: HATCHER_MINT,
      tokenProgramId,
      nonce: params.depositNonce,
    }, { invoker });
    const prepared = await preparePreflightedWalletTransaction({
      connection: client.connection,
      payer: params.wallet.publicKey,
      instructions: unstakeOnlyIxs,
    });
    const txId = await sendPreparedWalletTransaction({
      wallet: params.wallet,
      connection: client.connection,
      prepared,
      onTransactionSubmitted: params.onTransactionSubmitted,
    });
    return { txId, rewardsIncluded: false };
  }
}

async function fetchHatcherRewardStatusFromClient(params: {
  client: SolanaStakingClient;
  walletAddress: string;
  stakePoolAddress: string;
  stakeEntryAddress: string;
  depositNonce: number;
}): Promise<HatcherRewardStatus> {
  const stakePool = new PublicKey(params.stakePoolAddress);
  const stakeEntry = new PublicKey(params.stakeEntryAddress);
  const walletAddress = new PublicKey(params.walletAddress);
  const stakeEntryFromNonce = deriveStakeEntryPDA(
    params.client.getCurrentProgramId('stakePoolProgram'),
    stakePool,
    walletAddress,
    params.depositNonce,
  );
  if (!stakeEntryFromNonce.equals(stakeEntry)) {
    throw new Error('Stake entry changed or is out of sync. Refresh staking data and try again.');
  }

  const rewardPoolProgramId = params.client.getCurrentProgramId('rewardPoolDynamicProgram');
  const { nonce: rewardPoolNonce } = await resolveHatcherRewardPool(params.client, stakePool);
  const rewardPool = deriveRewardPoolPDA(
    rewardPoolProgramId,
    stakePool,
    HATCHER_MINT,
    rewardPoolNonce,
  );
  const rewardEntry = deriveRewardEntryPDA(rewardPoolProgramId, rewardPool, stakeEntry);

  const rewardEntryData = await params.client.programs.rewardPoolDynamicProgram.account.rewardEntry.fetchNullable(rewardEntry);
  if (!rewardEntryData) {
    return diagnoseMissingRewardEntry({
      client: params.client,
      stakePool,
      stakeEntry,
      expectedRewardPool: rewardPool,
    });
  }

  const tokenProgramId = await getHatcherTokenProgramId(params.client.connection);
  const invoker = { publicKey: walletAddress } as SignerWalletAdapter;
  const { ixs } = await params.client.prepareClaimRewardsInstructions({
    stakePool,
    stakePoolMint: HATCHER_MINT,
    tokenProgramId,
    depositNonce: params.depositNonce,
    rewardPoolNonce,
    rewardMint: HATCHER_MINT,
    rewardPoolType: 'dynamic',
    governor: HATCHER_DYNAMIC_REWARD_GOVERNOR,
  }, { invoker });

  const transaction = new Transaction();
  transaction.feePayer = walletAddress;
  transaction.add(...ixs);

  let simulation: { value: { err: unknown; logs?: string[] | null } };
  try {
    simulation = await params.client.connection.simulateTransaction(transaction, undefined, false);
  } catch (err) {
    console.warn('[staking] HATCHER reward claim simulation request failed.', err);
    return {
      canClaim: false,
      rewardEntryExists: true,
      kind: 'rpc_error',
      reason: RPC_ERROR_REASON,
      detail: errorMessage(err),
    };
  }

  if (simulation.value.err) {
    const logs = simulation.value.logs ?? [];
    if (isNothingToClaimSimulationError(simulation.value.err)) {
      return {
        canClaim: false,
        rewardEntryExists: true,
        kind: 'no_rewards',
        reason: NO_REWARDS_REASON,
      };
    }
    console.warn('[staking] HATCHER reward claim simulation failed.', simulation.value.err, logs);
    return {
      canClaim: false,
      rewardEntryExists: true,
      kind: 'simulation_error',
      reason: SIMULATION_ERROR_REASON,
      detail: formatSimulationFailureDetail(simulation.value.err, logs),
    };
  }

  return { canClaim: true, rewardEntryExists: true, kind: 'claimable', reason: null };
}

function extractCustomProgramErrorCode(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const instructionError = (err as { InstructionError?: unknown }).InstructionError;
  if (!Array.isArray(instructionError)) return null;
  const detail = instructionError[1];
  if (detail && typeof detail === 'object' && typeof (detail as { Custom?: unknown }).Custom === 'number') {
    return (detail as { Custom: number }).Custom;
  }
  return null;
}

function isNothingToClaimSimulationError(err: unknown): boolean {
  const code = extractCustomProgramErrorCode(err);
  return code !== null && NOTHING_TO_CLAIM_PROGRAM_ERROR_CODES.has(code);
}

function formatSimulationFailureDetail(err: unknown, logs: string[]): string {
  let errText: string;
  try {
    errText = typeof err === 'string' ? err : JSON.stringify(err);
  } catch {
    errText = String(err);
  }
  // The program's failure message lives at the tail of the log output.
  const logLines = logs.slice(-SIMULATION_DETAIL_LOG_LINES);
  return logLines.length > 0 ? `${errText} | ${logLines.join(' | ')}` : errText;
}

// The stake's reward entry PDA is empty: find out whether the entry lives under a different
// reward pool (nonce drift after a refill created a new pool) or genuinely does not exist.
// Reward entries are intentionally NOT auto-created here: creating one costs the user rent.
async function diagnoseMissingRewardEntry(params: {
  client: SolanaStakingClient;
  stakePool: PublicKey;
  stakeEntry: PublicKey;
  expectedRewardPool: PublicKey;
}): Promise<HatcherRewardStatus> {
  try {
    const entries = await params.client.programs.rewardPoolDynamicProgram.account.rewardEntry.all([
      { memcmp: { offset: DYNAMIC_REWARD_ENTRY_STAKE_ENTRY_OFFSET, bytes: params.stakeEntry.toBase58() } },
    ]) as unknown as Array<{ account: { rewardPool: unknown } }>;
    const expected = keyString(params.expectedRewardPool);
    const driftedPools = entries
      .map((entry) => keyString(entry.account.rewardPool))
      .filter((pool) => pool !== expected);
    if (driftedPools.length > 0) {
      // The cached nonce points at the wrong pool; drop it so the next refresh re-discovers.
      invalidateHatcherRewardPoolCache(params.stakePool);
      console.warn('[staking] HATCHER reward entry found under a different reward pool.', {
        expectedRewardPool: expected,
        driftedPools,
      });
      return {
        canClaim: false,
        rewardEntryExists: false,
        kind: 'pool_missing',
        reason: POOL_MISSING_REASON,
        detail: `Expected reward pool ${expected}; found reward entry under ${driftedPools.join(', ')}.`,
      };
    }
    return {
      canClaim: false,
      rewardEntryExists: false,
      kind: 'entry_missing',
      reason: ENTRY_MISSING_REASON,
    };
  } catch (err) {
    return {
      canClaim: false,
      rewardEntryExists: false,
      kind: 'entry_missing',
      reason: ENTRY_MISSING_REASON,
      detail: `Reward entry search failed: ${errorMessage(err)}`,
    };
  }
}

export async function fetchHatcherRewardStatusWithStreamflow(params: {
  walletAddress: string;
  stakePoolAddress: string;
  stakeEntryAddress: string;
  depositNonce: number;
}): Promise<HatcherRewardStatus> {
  const client = new SolanaStakingClient({
    clusterUrl: SOLANA_RPC_BROWSER_ENDPOINT,
    cluster: cluster(),
    commitment: 'confirmed',
  });
  return fetchHatcherRewardStatusFromClient({ ...params, client });
}

export async function claimHatcherRewardsWithStreamflow(params: {
  wallet: WalletContextState;
  stakePoolAddress: string;
  stakeEntryAddress: string;
  depositNonce: number;
}): Promise<{ txIds: string[] }> {
  if (!params.wallet.publicKey || (!params.wallet.sendTransaction && !params.wallet.signTransaction)) {
    throw new Error('Connect a wallet that supports Solana transaction signing.');
  }

  const client = new SolanaStakingClient({
    clusterUrl: SOLANA_RPC_BROWSER_ENDPOINT,
    cluster: cluster(),
    commitment: 'confirmed',
  });
  const rewardStatus = await fetchHatcherRewardStatusFromClient({
    client,
    walletAddress: params.wallet.publicKey.toBase58(),
    stakePoolAddress: params.stakePoolAddress,
    stakeEntryAddress: params.stakeEntryAddress,
    depositNonce: params.depositNonce,
  });
  if (!rewardStatus.canClaim) {
    throw new Error(rewardStatus.reason ?? 'No HATCHER rewards are available to claim yet.');
  }

  const tokenProgramId = await getHatcherTokenProgramId(client.connection);
  const invoker = params.wallet as unknown as SignerWalletAdapter;
  const stakePool = new PublicKey(params.stakePoolAddress);
  const { nonce: rewardPoolNonce } = await resolveHatcherRewardPool(client, stakePool);

  const { ixs } = await client.prepareClaimRewardsInstructions({
    stakePool,
    stakePoolMint: HATCHER_MINT,
    tokenProgramId,
    depositNonce: params.depositNonce,
    rewardPoolNonce,
    rewardMint: HATCHER_MINT,
    rewardPoolType: 'dynamic',
    governor: HATCHER_DYNAMIC_REWARD_GOVERNOR,
  }, { invoker });

  const prepared = await preparePreflightedWalletTransaction({
    connection: client.connection,
    payer: params.wallet.publicKey,
    instructions: ixs,
  });
  const txId = await sendPreparedWalletTransaction({
    wallet: params.wallet,
    connection: client.connection,
    prepared,
  });

  return { txIds: [txId] };
}

const HATCHER_REWARD_REASON_FALLBACKS: Record<HatcherRewardStatusKind, string> = {
  claimable: 'Claim HATCHER rewards',
  no_rewards: NO_REWARDS_REASON,
  entry_missing: ENTRY_MISSING_REASON,
  pool_missing: POOL_MISSING_REASON,
  simulation_error: SIMULATION_ERROR_REASON,
  rpc_error: RPC_ERROR_REASON,
};

export function hatcherRewardStatusLabel(status: HatcherRewardUiStatus | undefined): string {
  if (!status || status.loading) return 'Checking...';
  if (status.error) return 'Unavailable';
  switch (status.kind) {
    case 'claimable':
      return 'Claimable';
    case 'no_rewards':
      return '0 HATCHER';
    case 'entry_missing':
      return 'Not initialized';
    case 'pool_missing':
      return 'Rewards unavailable';
    case 'simulation_error':
    case 'rpc_error':
      return 'Check failed';
    default:
      return 'Unavailable';
  }
}

export function hatcherRewardClaimReason(status: HatcherRewardUiStatus | undefined): string {
  if (!status || status.loading) return 'Checking HATCHER rewards';
  if (status.error) return status.error;
  if (status.kind === 'claimable') return HATCHER_REWARD_REASON_FALLBACKS.claimable;
  return status.reason ?? HATCHER_REWARD_REASON_FALLBACKS[status.kind] ?? NO_REWARDS_REASON;
}

export function canClaimHatcherReward(status: HatcherRewardUiStatus | undefined): boolean {
  return Boolean(
    status
    && !status.loading
    && !status.error
    && status.kind === 'claimable'
    && status.rewardEntryExists
    && status.canClaim,
  );
}
