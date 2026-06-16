import BN from 'bn.js';
import type { Connection } from '@solana/web3.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import type { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import {
  SolanaStakingClient,
  deriveRewardEntryPDA,
  deriveRewardPoolPDA,
  deriveStakeEntryPDA,
} from '@streamflow/staking';
import { ICluster } from '@streamflow/common';
import {
  HATCH_TOKEN_MINT,
  SOLANA_NETWORK,
  SOLANA_RPC_BROWSER_ENDPOINT,
} from '@/lib/config';

export const HATCHER_TOKEN_DECIMALS = 6;
export const MIN_HATCHER_STAKE_BASE_UNITS = 1_000_000n;

export type HatcherRewardStatus = {
  canClaim: boolean;
  rewardEntryExists: boolean;
  reason: string | null;
};

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const HATCHER_MINT = new PublicKey(HATCH_TOKEN_MINT);
const HATCHER_REWARD_POOL_NONCE = 0;
let resolvedHatcherTokenProgramId: PublicKey | null = null;

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
}): Promise<{ txId: string }> {
  if (!params.wallet.publicKey || !params.wallet.signTransaction) {
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
  const result = await client.stakeAndCreateEntries({
    stakePool: params.stakePoolAddress,
    stakePoolMint: HATCHER_MINT,
    tokenProgramId,
    amount: new BN(params.amountBaseUnits.toString()),
    duration: new BN(params.durationDays * 86_400),
    nonce: randomNonce(),
    rewardPools: [{
      nonce: HATCHER_REWARD_POOL_NONCE,
      mint: HATCHER_MINT,
      tokenProgramId,
      rewardPoolType: 'dynamic',
    }],
  }, {
    invoker: params.wallet as unknown as SignerWalletAdapter,
  });

  return { txId: result.txId };
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
  const rewardPool = deriveRewardPoolPDA(
    rewardPoolProgramId,
    stakePool,
    HATCHER_MINT,
    HATCHER_REWARD_POOL_NONCE,
  );
  const rewardEntry = deriveRewardEntryPDA(rewardPoolProgramId, rewardPool, stakeEntry);

  const rewardEntryData = await params.client.programs.rewardPoolDynamicProgram.account.rewardEntry.fetchNullable(rewardEntry);
  if (!rewardEntryData) {
    return {
      canClaim: false,
      rewardEntryExists: false,
      reason: 'Reward tracking account is missing for this stake.',
    };
  }

  const tokenProgramId = await getHatcherTokenProgramId(params.client.connection);
  const invoker = { publicKey: walletAddress } as SignerWalletAdapter;
  const { ixs } = await params.client.prepareClaimRewardsInstructions({
    stakePool,
    stakePoolMint: HATCHER_MINT,
    tokenProgramId,
    depositNonce: params.depositNonce,
    rewardPoolNonce: HATCHER_REWARD_POOL_NONCE,
    rewardMint: HATCHER_MINT,
    rewardPoolType: 'dynamic',
  }, { invoker });

  const transaction = new Transaction();
  transaction.feePayer = walletAddress;
  transaction.add(...ixs);

  const simulation = await params.client.connection.simulateTransaction(transaction, undefined, false);
  if (simulation.value.err) {
    return {
      canClaim: false,
      rewardEntryExists: true,
      reason: 'No HATCHER rewards are available to claim yet.',
    };
  }

  return { canClaim: true, rewardEntryExists: true, reason: null };
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
  if (!params.wallet.publicKey || !params.wallet.signTransaction) {
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

  const claimed = await client.claimRewards({
    stakePool,
    stakePoolMint: HATCHER_MINT,
    tokenProgramId,
    depositNonce: params.depositNonce,
    rewardPoolNonce: HATCHER_REWARD_POOL_NONCE,
    rewardMint: HATCHER_MINT,
    rewardPoolType: 'dynamic',
  }, { invoker });

  return { txIds: [claimed.txId] };
}
