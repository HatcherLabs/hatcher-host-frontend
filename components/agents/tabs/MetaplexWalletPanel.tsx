'use client';

import Image from 'next/image';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConnection, useWallet, type WalletContextState } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey, Transaction, VersionedTransaction, type Connection } from '@solana/web3.js';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Fingerprint,
  ImageIcon,
  ListChecks,
  Loader2,
  RefreshCw,
  Rocket,
  RotateCcw,
  Share2,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  MetaplexConfigStatus,
  MetaplexConfigStatusValue,
  MetaplexExistingAgentToken,
  MetaplexMintAgentPlan,
  MetaplexRegistrationResponse,
  MetaplexTokenLaunchInput,
  MetaplexTokenLaunchPlan,
  MetaplexTokenLaunchResponse,
} from '@/lib/api';
import { GlassCard, Skeleton } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

export function formatMetaplexStatusLabel(status: MetaplexConfigStatusValue | string): string {
  if (status === 'disabled') return 'Disabled';
  if (status === 'wallet-missing') return 'Solana wallet needed';
  if (status === 'metadata-ready') return 'Ready to register';
  if (status === 'registered') return 'Registered';
  return 'Checking';
}

export function shortMetaplexValue(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function getMetaplexPublicLinks(config: MetaplexConfigStatus): Array<{ label: string; href: string }> {
  return [
    { label: 'Agent registration JSON', href: config.metadataUri },
    { label: 'Core asset metadata', href: config.coreAssetMetadataUri },
  ];
}

export function getMetaplexProfileUrl(asset: string): string {
  return `https://www.metaplex.com/agents/${asset}`;
}

const METAPLEX_CORE_PROGRAM_ID = new PublicKey('CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d');
const METAPLEX_ASSET_SIGNER_SEED = new TextEncoder().encode('mpl-core-execute');
export const METAPLEX_TOKEN_LAUNCH_MIN_LAMPORTS = 60_000_000;

export function getMetaplexAssetSignerWallet(asset: string | null | undefined): string | null {
  const value = asset?.trim();
  if (!value) return null;
  try {
    const [assetSigner] = PublicKey.findProgramAddressSync(
      [METAPLEX_ASSET_SIGNER_SEED, new PublicKey(value).toBuffer()],
      METAPLEX_CORE_PROGRAM_ID,
    );
    return assetSigner.toBase58();
  } catch {
    return null;
  }
}

function formatMetaplexSolBalance(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export function getMetaplexTokenLaunchBalanceError(lamports: number): string | null {
  if (lamports >= METAPLEX_TOKEN_LAUNCH_MIN_LAMPORTS) return null;
  return `The connected wallet has ${formatMetaplexSolBalance(lamports)} SOL. Add at least 0.06 SOL before launching this Metaplex token.`;
}

export function getMetaplexAvatarPreview(config: MetaplexConfigStatus): {
  image: string;
  label: string;
  helper: string;
} {
  return {
    image: config.registrationDocument.image,
    label: 'Metaplex profile image',
    helper: 'Uses the agent avatar when one is set; otherwise Hatcher uses the default agent avatar.',
  };
}

export const METAPLEX_AVATAR_MAX_BYTES = 5_000_000;
const METAPLEX_AVATAR_ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export function validateMetaplexAvatarFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!file.type || !file.type.startsWith('image/')) return 'Choose an image file.';
  if (!METAPLEX_AVATAR_ALLOWED_TYPES.has(file.type.toLowerCase())) return 'Choose a PNG, JPG, or WebP image.';
  if (file.size > METAPLEX_AVATAR_MAX_BYTES) return 'Choose an image up to 5 MB.';
  return null;
}

export const METAPLEX_TOKEN_IMAGE_MAX_BYTES = 5_000_000;
const METAPLEX_TOKEN_IMAGE_ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export function validateMetaplexTokenImageFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!METAPLEX_TOKEN_IMAGE_ALLOWED_TYPES.has(file.type.toLowerCase())) return 'Choose a PNG, JPG, or WebP image.';
  if (file.size > METAPLEX_TOKEN_IMAGE_MAX_BYTES) return 'Choose an image up to 5 MB.';
  return null;
}

export function shouldShowMetaplexMainnetConfirmation(registeredAsset: string | null | undefined): boolean {
  return !registeredAsset;
}

export function getMetaplexRegisteredLinks(
  asset: string,
  txHash?: string | null,
): Array<{ label: string; href: string }> {
  const links = [
    { label: 'Metaplex profile', href: getMetaplexProfileUrl(asset) },
    { label: 'Core asset on Solscan', href: metaplexAssetUrl(asset) },
  ];
  if (txHash) links.push({ label: 'Registration transaction', href: metaplexTxUrl(txHash) });
  return links;
}

export function humanizeMetaplexError(message: string): string {
  if (/METAPLEX_NOT_CONFIGURED|payer|configured/i.test(message)) {
    return 'Metaplex registration is not enabled for this agent yet.';
  }
  if (/METAPLEX_WALLET_ACCOUNT_NOT_FOUND|AccountNotFound/i.test(message)) {
    return 'The connected wallet needs SOL on Solana mainnet before Metaplex can prepare this transaction.';
  }
  if (/insufficient|funds|lamports|balance/i.test(message)) {
    return 'The connected wallet needs more SOL before this mainnet transaction can be submitted.';
  }
  if (/wallet/i.test(message)) {
    return 'This agent needs a Solana wallet before it can be registered on Metaplex.';
  }
  if (/rate|429/i.test(message)) {
    return 'Metaplex or Solana RPC is rate limiting this request. Try again shortly.';
  }
  return message || 'Metaplex registration failed.';
}

export function buildMetaplexRegistrationButtonState(
  config: MetaplexConfigStatus | null,
  mainnetConfirmed: boolean,
  walletConnected = true,
  avatarUploading = false,
): { disabled: boolean; label: string; reason: string | null } {
  if (!config) {
    return { disabled: true, label: 'Checking Metaplex', reason: 'Load Metaplex status first.' };
  }
  if (!config.enabled) {
    return { disabled: true, label: 'Metaplex disabled', reason: 'Metaplex is not enabled for this environment.' };
  }
  if (config.status === 'registered' || config.metaplexAsset) {
    return { disabled: true, label: 'Registered', reason: 'This agent already has a Metaplex identity.' };
  }
  if (!config.solanaWalletAddress || config.status === 'wallet-missing') {
    return { disabled: true, label: 'Solana wallet needed', reason: 'Provision this agent Solana wallet first.' };
  }
  if (!config.registrationEnabled || !config.configured || !config.capabilities.registration || config.missing.length > 0) {
    return {
      disabled: true,
      label: 'Registration unavailable',
      reason: 'Hatcher needs Metaplex registration enabled before submitting.',
    };
  }
  if (!mainnetConfirmed) {
    return {
      disabled: true,
      label: 'Review and confirm mainnet',
      reason: 'Confirm the mainnet registration before submitting.',
    };
  }
  if (avatarUploading) {
    return {
      disabled: true,
      label: 'Uploading avatar',
      reason: 'Wait for the avatar upload to finish before registering on Metaplex.',
    };
  }
  if (!walletConnected) {
    return {
      disabled: true,
      label: 'Connect wallet',
      reason: 'Connect the Solana wallet that will own and pay for the Metaplex registration.',
    };
  }
  return { disabled: false, label: 'Register on Metaplex', reason: null };
}

type MetaplexTokenFormState = {
  name: string;
  symbol: string;
  image: string;
  description: string;
  externalLinks: {
    website: string;
    twitter: string;
    telegram: string;
  };
  launchType: 'bondingCurve' | 'launchpool';
  firstBuyAmount: string;
  launchpool: {
    tokenAllocation: string;
    depositStartTime: string;
    raiseGoal: string;
    raydiumLiquidityBps: string;
    fundsRecipient: string;
  };
  confirmPermanentToken: boolean;
};

export function deriveMetaplexTokenSymbol(name: string): string {
  const compact = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (compact || 'AGENT').slice(0, 10);
}

export function buildMetaplexTokenLaunchDefaults(config: MetaplexConfigStatus): MetaplexTokenFormState {
  const agentName = config.registrationDocument.name.trim() || 'Agent';
  return {
    name: `${agentName.slice(0, 26)} Token`.slice(0, 32),
    symbol: deriveMetaplexTokenSymbol(agentName),
    image: '',
    description: (config.registrationDocument.description || '').slice(0, 250),
    externalLinks: {
      website: config.registrationDocument.hatcher.profile,
      twitter: '',
      telegram: '',
    },
    launchType: 'bondingCurve',
    firstBuyAmount: '',
    launchpool: {
      tokenAllocation: '500000000',
      depositStartTime: '',
      raiseGoal: '',
      raydiumLiquidityBps: '5000',
      fundsRecipient: '',
    },
    confirmPermanentToken: false,
  };
}

export function isMetaplexIrysImageUrl(value: string): boolean {
  return value.trim().startsWith('https://gateway.irys.xyz/');
}

function metaplexTokenMissingLabel(value: string): string {
  if (value === 'METAPLEX_GENESIS_ENABLED') return 'Genesis launch is not enabled';
  if (value === 'METAPLEX_PAYER_PRIVATE_KEY') return 'Hatcher payer is not configured';
  if (value === 'USER_WALLET') return 'Solana wallet is not connected';
  if (value === 'METAPLEX_AGENT_ASSET') return 'Metaplex agent identity is missing';
  if (value === 'TOKEN_IMAGE') return 'Token image is missing';
  if (value === 'IRYS_TOKEN_IMAGE') return 'Token image must be an Irys URL';
  if (value.startsWith('LAUNCHPOOL_')) return value.replace('LAUNCHPOOL_', 'Launchpool ').replaceAll('_', ' ').toLowerCase();
  if (value === 'CONFIRM_PERMANENT_AGENT_TOKEN') return 'Permanent token confirmation is missing';
  if (value === 'AGENT_TOKEN_ALREADY_SET') return 'Agent token is already set';
  return value;
}

export function buildMetaplexTokenLaunchButtonState(
  config: MetaplexConfigStatus | null,
  plan: MetaplexTokenLaunchPlan | null,
  state: {
    image: string;
    confirmed: boolean;
    launching: boolean;
    walletConnected?: boolean;
  },
): { disabled: boolean; label: string; reason: string | null } {
  if (state.launching) return { disabled: true, label: 'Launching token', reason: null };
  if (!config) return { disabled: true, label: 'Checking Metaplex', reason: 'Load Metaplex status first.' };
  if (!config.metaplexAsset) {
    return {
      disabled: true,
      label: 'Register identity first',
      reason: 'Launch the Metaplex agent identity before creating its token.',
    };
  }
  if (plan?.status === 'launched' || plan?.existingToken || config.agentToken) {
    return {
      disabled: true,
      label: 'Token launched',
      reason: 'This agent already has its permanent Metaplex token.',
    };
  }
  if (!isMetaplexIrysImageUrl(state.image)) {
    return {
      disabled: true,
      label: 'Upload token image',
      reason: 'Upload a PNG, JPG, or WebP image to Irys before launching.',
    };
  }
  if (!plan) {
    return {
      disabled: true,
      label: 'Check token launch',
      reason: 'Review launch readiness before submitting.',
    };
  }
  if (!plan.ready) {
    return {
      disabled: true,
      label: 'Token launch unavailable',
      reason: plan.missing.length ? `Missing: ${plan.missing.map(metaplexTokenMissingLabel).join(', ')}` : 'Metaplex Genesis is not ready.',
    };
  }
  if (!state.confirmed) {
    return {
      disabled: true,
      label: 'Review and confirm token',
      reason: 'Confirm the permanent one-token-per-agent launch before submitting.',
    };
  }
  if (state.walletConnected === false) {
    return {
      disabled: true,
      label: 'Connect wallet',
      reason: 'Connect the Solana wallet that will sign and pay for the agent token launch.',
    };
  }
  return { disabled: false, label: 'Launch agent token', reason: null };
}

export function getMetaplexTokenLinks(
  token: MetaplexExistingAgentToken | MetaplexTokenLaunchPlan['existingToken'] | null | undefined,
): Array<{ label: string; href: string }> {
  if (!token) return [];
  const links: Array<{ label: string; href: string }> = [];
  if (token.launchUrl) links.push({ label: 'Genesis launch', href: token.launchUrl });
  if (token.mintAddress) links.push({ label: 'Token mint on Solscan', href: `https://solscan.io/token/${token.mintAddress}` });
  if (token.genesisAccount) links.push({ label: 'Genesis account on Solscan', href: `https://solscan.io/account/${token.genesisAccount}` });
  return links;
}

export function buildMetaplexTokenLaunchPayload(form: MetaplexTokenFormState): MetaplexTokenLaunchInput {
  const firstBuyAmount = Number(form.firstBuyAmount);
  const launchType = form.launchType ?? 'bondingCurve';
  const externalLinks = {
    website: form.externalLinks.website.trim(),
    twitter: form.externalLinks.twitter.trim(),
    telegram: form.externalLinks.telegram.trim(),
  };
  const filteredLinks = Object.fromEntries(Object.entries(externalLinks).filter(([, value]) => value.length > 0));
  const payload: MetaplexTokenLaunchInput = {
    name: form.name.trim(),
    symbol: form.symbol.trim().toUpperCase(),
    image: form.image.trim() || null,
    description: form.description.trim() || undefined,
    externalLinks: Object.keys(filteredLinks).length > 0 ? filteredLinks : undefined,
    launchType,
    confirmPermanentToken: form.confirmPermanentToken,
  };
  if (launchType === 'bondingCurve') {
    return {
      ...payload,
      firstBuyAmount: Number.isFinite(firstBuyAmount) && firstBuyAmount > 0 ? firstBuyAmount : undefined,
    };
  }

  return {
    ...payload,
    launchpool: {
      tokenAllocation: Number(form.launchpool.tokenAllocation),
      depositStartTime: form.launchpool.depositStartTime.trim(),
      raiseGoal: Number(form.launchpool.raiseGoal),
      raydiumLiquidityBps: Number(form.launchpool.raydiumLiquidityBps),
      fundsRecipient: form.launchpool.fundsRecipient.trim() || undefined,
    },
  };
}

function metaplexTxUrl(txHash: string): string {
  return `https://solscan.io/tx/${txHash}`;
}

function metaplexAssetUrl(asset: string): string {
  return `https://solscan.io/account/${asset}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function networkLabel(plan: MetaplexMintAgentPlan | null): string {
  if (plan?.request.network === 'solana-mainnet') return 'Solana mainnet';
  if (plan?.request.network === 'solana-devnet') return 'Solana devnet';
  return 'Solana';
}

function decodeMetaplexSerializedTransaction(value: string): Transaction | VersionedTransaction {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

function encodeMetaplexSerializedTransaction(transaction: Transaction | VersionedTransaction): string {
  const bytes = transaction instanceof VersionedTransaction
    ? transaction.serialize()
    : transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function isEmptyMetaplexSignature(signature: Uint8Array | null | undefined): boolean {
  return !signature || signature.every((byte) => byte === 0);
}

function metaplexTransactionRequiredSigners(transaction: Transaction | VersionedTransaction): string[] {
  if (transaction instanceof VersionedTransaction) {
    const requiredSignatures = transaction.message.header.numRequiredSignatures;
    return transaction.message.staticAccountKeys
      .slice(0, requiredSignatures)
      .map((key) => key.toBase58());
  }
  return transaction.signatures.map(({ publicKey }) => publicKey.toBase58());
}

function metaplexTransactionHasAllRequiredSignatures(transaction: Transaction | VersionedTransaction): boolean {
  if (transaction instanceof VersionedTransaction) {
    const requiredSignatures = transaction.message.header.numRequiredSignatures;
    return transaction.signatures
      .slice(0, requiredSignatures)
      .every((signature) => !isEmptyMetaplexSignature(signature));
  }
  return transaction.signatures.every(({ signature }) => !isEmptyMetaplexSignature(signature ?? undefined));
}

export function isMetaplexBlockhashExpiryError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /block height exceeded|blockhash.*expired|signature .*expired|TransactionExpiredBlockheightExceededError/i.test(message);
}

const waitForMetaplexSignatureStatusDelay = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

export async function waitForMetaplexSignatureConfirmation(
  connection: Pick<Connection, 'getSignatureStatus'>,
  signature: string,
  attempts = 8,
  delayMs = 750,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    const value = status.value;
    if (value?.err) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(value.err)}`);
    }
    if (value?.confirmationStatus === 'confirmed' || value?.confirmationStatus === 'finalized') {
      return true;
    }
    if (attempt < attempts - 1) {
      await waitForMetaplexSignatureStatusDelay(delayMs);
    }
  }
  return false;
}

async function confirmMetaplexSignature(
  connection: Connection,
  signature: string,
  blockhash?: { blockhash: string; lastValidBlockHeight: number },
): Promise<void> {
  try {
    const result = blockhash?.blockhash && Number.isFinite(blockhash.lastValidBlockHeight)
      ? await connection.confirmTransaction({
        signature,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      }, 'confirmed')
      : await connection.confirmTransaction(signature, 'confirmed');
    if (result.value.err) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
    }
  } catch (error) {
    if (isMetaplexBlockhashExpiryError(error)) {
      const recovered = await waitForMetaplexSignatureConfirmation(connection, signature);
      if (recovered) return;
    }
    throw error;
  }
}

export async function signAndSendMetaplexTransactions(
  transactions: string[],
  wallet: WalletContextState,
  connection: Connection,
  blockhash?: { blockhash: string; lastValidBlockHeight: number },
): Promise<string[]> {
  if (!wallet.publicKey || (!wallet.sendTransaction && !wallet.signTransaction)) {
    throw new Error('Connect a Solana wallet that can submit transactions.');
  }

  const decodedTransactions = transactions.map(decodeMetaplexSerializedTransaction);
  if (wallet.sendTransaction) {
    const walletAddress = wallet.publicKey.toBase58();
    const signatures: string[] = [];
    const multiTransactionFlow = decodedTransactions.length > 1;
    const rawSignMultiTransactionFlow = multiTransactionFlow && !!wallet.signTransaction;
    for (const transaction of decodedTransactions) {
      const fullySigned = metaplexTransactionHasAllRequiredSignatures(transaction);
      const requiresWalletSignature = metaplexTransactionRequiredSigners(transaction).includes(walletAddress);
      let signature: string | null = null;
      if (fullySigned) {
        signature = await connection.sendRawTransaction(transaction.serialize(), {
          maxRetries: 5,
          skipPreflight: multiTransactionFlow,
        });
      } else if (requiresWalletSignature && rawSignMultiTransactionFlow && wallet.signTransaction) {
        const signed = await wallet.signTransaction(transaction);
        if (!signed) throw new Error('Wallet did not return a signed Metaplex transaction.');
        signature = await connection.sendRawTransaction(signed.serialize(), {
          maxRetries: 5,
          skipPreflight: true,
        });
      } else if (requiresWalletSignature) {
        signature = await wallet.sendTransaction(transaction, connection, {
          maxRetries: 5,
          skipPreflight: multiTransactionFlow,
          preflightCommitment: 'confirmed',
        });
      }
      if (!signature) {
        throw new Error('Metaplex returned a transaction that is missing a non-wallet signature.');
      }
      signatures.push(signature);
      if (multiTransactionFlow) {
        await confirmMetaplexSignature(connection, signature, blockhash);
      }
    }
    if (!multiTransactionFlow) {
      for (const signature of signatures) {
        await confirmMetaplexSignature(connection, signature, blockhash);
      }
    }
    return signatures;
  }

  if (wallet.signTransaction) {
    const signedTransactions = wallet.signAllTransactions && decodedTransactions.length > 1
      ? await wallet.signAllTransactions(decodedTransactions)
      : await Promise.all(decodedTransactions.map((transaction) => wallet.signTransaction?.(transaction)));

    const signatures: string[] = [];
    const multiTransactionFlow = signedTransactions.length > 1;
    for (const signed of signedTransactions) {
      if (!signed) throw new Error('Wallet did not return a signed Metaplex transaction.');
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        maxRetries: 5,
        skipPreflight: multiTransactionFlow,
      });
      signatures.push(signature);
    }
    for (const signature of signatures) {
      await confirmMetaplexSignature(connection, signature, blockhash);
    }
    return signatures;
  }

  throw new Error('Connect a Solana wallet that can sign transactions.');
}

export async function signMetaplexTransactions(
  transactions: string[],
  wallet: WalletContextState,
): Promise<string[]> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Connect a Solana wallet that can sign transactions.');
  }

  const decodedTransactions = transactions.map(decodeMetaplexSerializedTransaction);
  const signedTransactions = wallet.signAllTransactions && decodedTransactions.length > 1
    ? await wallet.signAllTransactions(decodedTransactions)
    : await Promise.all(decodedTransactions.map((transaction) => wallet.signTransaction?.(transaction)));

  return signedTransactions.map((signed) => {
    if (!signed) throw new Error('Wallet did not return a signed Metaplex transaction.');
    return encodeMetaplexSerializedTransaction(signed);
  });
}

function StatusTile({
  label,
  value,
  description,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  tone: 'good' | 'warn' | 'muted';
  icon: typeof CheckCircle2;
}) {
  const toneClass = tone === 'good'
    ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
    : tone === 'warn'
      ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
      : 'border-[var(--border-subtle)] bg-black/20 text-[var(--text-primary)]';

  return (
    <div className={`min-w-0 rounded-md border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] opacity-80">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">{value}</div>
      <p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p>
    </div>
  );
}

function LinkRow({
  label,
  href,
  onCopy,
}: {
  label: string;
  href: string;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-[var(--text-primary)]">{label}</div>
        <div className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">{href}</div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onCopy(href, label)}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
        >
          <Copy size={11} /> Copy
        </button>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
        >
          <ExternalLink size={11} /> Open
        </a>
      </div>
    </div>
  );
}

export function MetaplexWalletPanel({
  agentId,
  solanaWallet,
}: {
  agentId: string;
  solanaWallet?: string | null;
}) {
  const { toast } = useToast();
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const tokenImageInputRef = useRef<HTMLInputElement | null>(null);
  const [config, setConfig] = useState<MetaplexConfigStatus | null>(null);
  const [mintPlan, setMintPlan] = useState<MetaplexMintAgentPlan | null>(null);
  const [tokenPlan, setTokenPlan] = useState<MetaplexTokenLaunchPlan | null>(null);
  const [tokenResult, setTokenResult] = useState<MetaplexTokenLaunchResponse | null>(null);
  const [tokenForm, setTokenForm] = useState<MetaplexTokenFormState | null>(null);
  const [result, setResult] = useState<MetaplexRegistrationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [checkingToken, setCheckingToken] = useState(false);
  const [launchingToken, setLaunchingToken] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [tokenImageUploading, setTokenImageUploading] = useState(false);
  const [mainnetConfirmed, setMainnetConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [configRes, planRes] = await Promise.all([
      api.getAgentMetaplexConfig(agentId),
      api.getAgentMetaplexMintPlan(agentId),
    ]);

    if (configRes.success) {
      setConfig(configRes.data);
      setTokenForm((current) => current ?? buildMetaplexTokenLaunchDefaults(configRes.data));
      const agentToken = configRes.data.agentToken;
      if (agentToken) {
        setTokenPlan((current) => current ?? {
          kind: 'metaplex.genesis-agent-token.v1',
          sdkFunction: 'createAndRegisterLaunch',
          ready: false,
          status: 'launched',
          missing: ['AGENT_TOKEN_ALREADY_SET'],
          oneTokenPerAgent: true,
          existingToken: {
            mintAddress: agentToken.mintAddress,
            genesisAccount: agentToken.genesisAccount ?? '',
            launchId: agentToken.launchId ?? '',
            launchUrl: agentToken.launchUrl ?? '',
            launchedAt: agentToken.launchedAt,
          },
          request: {
            wallet: null,
            network: 'solana-mainnet',
            agent: { mint: configRes.data.metaplexAsset, setToken: true },
            launchType: 'bondingCurve',
            token: {
              name: configRes.data.registrationDocument.name,
              symbol: deriveMetaplexTokenSymbol(configRes.data.registrationDocument.name),
              image: null,
            },
            launch: {},
          },
          notes: [],
        });
      }
    } else setError(humanizeMetaplexError(configRes.error || 'Could not load Metaplex status.'));

    if (planRes.success) setMintPlan(planRes.data);
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const connectedWallet = wallet.publicKey?.toBase58() ?? null;
  const walletCanSign = !!connectedWallet && (!!wallet.sendTransaction || !!wallet.signTransaction);
  const button = useMemo(
    () => buildMetaplexRegistrationButtonState(config, mainnetConfirmed, walletCanSign, avatarUploading),
    [avatarUploading, config, mainnetConfirmed, walletCanSign],
  );
  const tokenButton = useMemo(
    () => buildMetaplexTokenLaunchButtonState(config, tokenPlan, {
      image: tokenForm?.image ?? '',
      confirmed: tokenForm?.confirmPermanentToken ?? false,
      launching: launchingToken,
      walletConnected: walletCanSign,
    }),
    [config, tokenForm?.confirmPermanentToken, tokenForm?.image, tokenPlan, launchingToken, walletCanSign],
  );
  const publicLinks = useMemo(() => (config ? getMetaplexPublicLinks(config) : []), [config]);
  const avatarPreview = useMemo(() => (config ? getMetaplexAvatarPreview(config) : null), [config]);
  const hatcherSolanaWallet = config?.solanaWalletAddress ?? solanaWallet ?? null;
  const registeredAsset = result?.agentId ?? config?.metaplexAsset ?? null;
  const metaplexAgentWallet = getMetaplexAssetSignerWallet(registeredAsset);
  const registeredAt = result?.registeredAt ?? config?.registeredAt ?? null;
  const existingToken = useMemo(
    () => (tokenResult
      ? {
          mintAddress: tokenResult.mintAddress,
          genesisAccount: tokenResult.genesisAccount,
          launchId: tokenResult.launchId,
          launchUrl: tokenResult.launchUrl,
          launchedAt: tokenResult.launchedAt,
        }
      : tokenPlan?.existingToken ?? config?.agentToken ?? null),
    [config?.agentToken, tokenPlan?.existingToken, tokenResult],
  );
  const tokenLinks = useMemo(() => getMetaplexTokenLinks(existingToken), [existingToken]);
  const registeredLinks = useMemo(
    () => (registeredAsset ? getMetaplexRegisteredLinks(registeredAsset, result?.txHash) : []),
    [registeredAsset, result?.txHash],
  );
  const statusTone = config?.status === 'registered'
    ? 'good'
    : config?.status === 'metadata-ready'
      ? 'good'
      : 'warn';

  const copy = (value: string, label: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error('Copy failed'));
  };

  const saveAvatar = async (avatarUrl: string | null, successMessage: string) => {
    setAvatarUploading(true);
    setError(null);
    try {
      const res = await api.updateAgent(agentId, { avatarUrl });
      if (!res.success) {
        const message = res.error || 'Could not update this avatar.';
        setError(message);
        toast.error(message);
        return;
      }
      setResult(null);
      toast.success(successMessage);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not update this avatar.';
      setError(message);
      toast.error(message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const updateTokenForm = <K extends keyof MetaplexTokenFormState>(key: K, value: MetaplexTokenFormState[K]) => {
    setTokenPlan((current) => (current?.status === 'launched' ? current : null));
    setTokenForm((current) => {
      const base = current ?? (config ? buildMetaplexTokenLaunchDefaults(config) : {
        name: '',
        symbol: '',
        image: '',
        description: '',
        externalLinks: { website: '', twitter: '', telegram: '' },
        launchType: 'bondingCurve',
        firstBuyAmount: '',
        launchpool: {
          tokenAllocation: '500000000',
          depositStartTime: '',
          raiseGoal: '',
          raydiumLiquidityBps: '5000',
          fundsRecipient: '',
        },
        confirmPermanentToken: false,
      });
      return {
        ...base,
        [key]: value,
      };
    });
  };

  const updateTokenLink = (key: keyof MetaplexTokenFormState['externalLinks'], value: string) => {
    setTokenPlan((current) => (current?.status === 'launched' ? current : null));
    setTokenForm((current) => {
      const base = current ?? (config ? buildMetaplexTokenLaunchDefaults(config) : {
        name: '',
        symbol: '',
        image: '',
        description: '',
        externalLinks: { website: '', twitter: '', telegram: '' },
        launchType: 'bondingCurve',
        firstBuyAmount: '',
        launchpool: {
          tokenAllocation: '500000000',
          depositStartTime: '',
          raiseGoal: '',
          raydiumLiquidityBps: '5000',
          fundsRecipient: '',
        },
        confirmPermanentToken: false,
      });
      return {
        ...base,
        externalLinks: {
          ...base.externalLinks,
          [key]: value,
        },
      };
    });
  };

  const updateLaunchpoolForm = (key: keyof MetaplexTokenFormState['launchpool'], value: string) => {
    setTokenPlan((current) => (current?.status === 'launched' ? current : null));
    setTokenForm((current) => {
      const base = current ?? (config ? buildMetaplexTokenLaunchDefaults(config) : {
        name: '',
        symbol: '',
        image: '',
        description: '',
        externalLinks: { website: '', twitter: '', telegram: '' },
        launchType: 'bondingCurve',
        firstBuyAmount: '',
        launchpool: {
          tokenAllocation: '500000000',
          depositStartTime: '',
          raiseGoal: '',
          raydiumLiquidityBps: '5000',
          fundsRecipient: '',
        },
        confirmPermanentToken: false,
      });
      return {
        ...base,
        launchpool: {
          ...base.launchpool,
          [key]: value,
        },
      };
    });
  };

  const tokenPayloadWithWalletDefault = () => {
    if (!tokenForm) return null;
    const payload = buildMetaplexTokenLaunchPayload(tokenForm);
    if (payload.launchType === 'launchpool' && payload.launchpool && !payload.launchpool.fundsRecipient && connectedWallet) {
      payload.launchpool = {
        ...payload.launchpool,
        fundsRecipient: connectedWallet,
      };
    }
    return payload;
  };

  const checkTokenLaunch = async () => {
    if (!tokenForm) return;
    if (!connectedWallet) {
      setWalletModalVisible(true);
      return;
    }
    setCheckingToken(true);
    setError(null);
    try {
      const payload = tokenPayloadWithWalletDefault();
      if (!payload) return;
      const res = await api.prepareAgentMetaplexTokenLaunch(agentId, {
        ...payload,
        wallet: connectedWallet,
      });
      if (!res.success) {
        const message = res.error || 'Could not check token launch readiness.';
        setError(message);
        toast.error(message);
        return;
      }
      setTokenPlan(res.data);
      if (res.data.ready) toast.success('Agent token launch is ready');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not check token launch readiness.';
      setError(message);
      toast.error(message);
    } finally {
      setCheckingToken(false);
    }
  };

  const launchToken = async () => {
    if (!tokenForm) return;
    const walletPublicKey = wallet.publicKey;
    if (!connectedWallet || !walletPublicKey || (!wallet.sendTransaction && !wallet.signTransaction)) {
      setWalletModalVisible(true);
      return;
    }
    if (tokenButton.disabled && tokenButton.label !== 'Connect wallet') return;
    setLaunchingToken(true);
    setError(null);
    try {
      const payload = tokenPayloadWithWalletDefault();
      if (!payload) return;
      const balanceError = getMetaplexTokenLaunchBalanceError(
        await connection.getBalance(walletPublicKey, 'confirmed'),
      );
      if (balanceError) {
        setError(balanceError);
        toast.error(balanceError);
        return;
      }
      const prepared = await api.prepareAgentMetaplexTokenLaunchTransaction(agentId, {
        ...payload,
        wallet: connectedWallet,
      });
      if (!prepared.success) {
        const message = prepared.error || 'Metaplex token launch failed.';
        setError(message);
        toast.error(message);
        return;
      }
      const signatures = await signAndSendMetaplexTransactions(prepared.data.transactions, wallet, connection, prepared.data.blockhash);
      const completed = await api.completeAgentMetaplexTokenLaunch(agentId, {
        ...payload,
        wallet: connectedWallet,
        signatures,
        mintAddress: prepared.data.mintAddress,
        genesisAccount: prepared.data.genesisAccount,
      });
      if (!completed.success) {
        const message = completed.error || 'Metaplex token launch failed.';
        setError(message);
        toast.error(message);
        return;
      }
      setTokenResult(completed.data);
      setTokenForm((current) => current ? { ...current, confirmPermanentToken: false } : current);
      toast.success('Agent token launched');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Metaplex token launch failed.';
      setError(message);
      toast.error(message);
    } finally {
      setLaunchingToken(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    const validationError = validateMetaplexAvatarFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setAvatarUploading(true);
    setError(null);
    try {
      const res = await api.uploadAgentMetaplexAvatar(agentId, file);
      if (!res.success) {
        const message = res.error || 'Could not upload this avatar.';
        setError(message);
        toast.error(message);
        return;
      }
      setResult(null);
      toast.success('Agent avatar uploaded to Irys');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not upload this avatar.';
      setError(message);
      toast.error(message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadTokenImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    const validationError = validateMetaplexTokenImageFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setTokenImageUploading(true);
    setError(null);
    try {
      const res = await api.uploadAgentMetaplexTokenImage(agentId, file);
      if (!res.success) {
        const message = res.error || 'Could not upload this token image.';
        setError(message);
        toast.error(message);
        return;
      }
      updateTokenForm('image', res.data.url);
      toast.success('Token image uploaded to Irys');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not upload this token image.';
      setError(message);
      toast.error(message);
    } finally {
      setTokenImageUploading(false);
    }
  };

  const register = async () => {
    if (!connectedWallet || (!wallet.sendTransaction && !wallet.signTransaction)) {
      setWalletModalVisible(true);
      return;
    }
    if (avatarUploading) {
      const message = 'Wait for the avatar upload to finish before registering on Metaplex.';
      setError(message);
      toast.error(message);
      return;
    }
    if (button.disabled && button.label !== 'Connect wallet') return;
    setRegistering(true);
    setError(null);
    try {
      const prepared = await api.prepareAgentMetaplexRegistration(agentId, { wallet: connectedWallet });
      if (!prepared.success) {
        const message = humanizeMetaplexError(prepared.error || 'Metaplex registration failed.');
        setError(message);
        toast.error(message);
        return;
      }
      const completionPayload = prepared.data.cosignerToken
        ? {
            wallet: connectedWallet,
            assetAddress: prepared.data.assetAddress,
            signedTransaction: (await signMetaplexTransactions(prepared.data.transactions, wallet))[0] ?? '',
            cosignerToken: prepared.data.cosignerToken,
          }
        : {
            wallet: connectedWallet,
            assetAddress: prepared.data.assetAddress,
            signature: (await signAndSendMetaplexTransactions(
              prepared.data.transactions,
              wallet,
              connection,
              prepared.data.blockhash,
            ))[0] ?? '',
          };
      const completed = await api.completeAgentMetaplexRegistration(agentId, completionPayload);
      if (!completed.success) {
        const message = humanizeMetaplexError(completed.error || 'Metaplex registration failed.');
        setError(message);
        toast.error(message);
        return;
      }
      setResult(completed.data);
      setMainnetConfirmed(false);
      toast.success('Metaplex identity registered');
      await load();
    } catch (e) {
      const message = humanizeMetaplexError(e instanceof Error ? e.message : 'Metaplex registration failed.');
      setError(message);
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Fingerprint size={13} /> Metaplex Agent Registry
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {registeredAsset ? 'Metaplex identity registered' : 'Register this agent on Metaplex'}
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
            {registeredAsset
              ? 'Manage the public profile, avatar, metadata links, A2A discovery, MCP discovery, and x402-ready endpoints.'
              : 'Publish a Solana mainnet agent identity with Hatcher metadata, A2A discovery, MCP discovery, and x402-ready endpoints.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 py-2 text-xs uppercase tracking-wider transition hover:border-[var(--border-hover)] disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-xs text-[var(--color-warning)]">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-4">
        {loading && !config ? (
          [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 w-full" />)
        ) : (
          <>
            <StatusTile
              label="Status"
              value={formatMetaplexStatusLabel(config?.status ?? 'checking')}
              description={registeredAt ? `Registered ${formatDate(registeredAt)}` : 'Metadata can be reviewed before submit.'}
              tone={statusTone}
              icon={ShieldCheck}
            />
            <StatusTile
              label="Network"
              value={networkLabel(mintPlan)}
              description="Registration writes a permanent on-chain identity."
              tone={mintPlan?.request.network === 'solana-mainnet' ? 'warn' : 'muted'}
              icon={AlertTriangle}
            />
            <StatusTile
              label={registeredAsset ? 'Metaplex wallet' : 'Hatcher wallet'}
              value={shortMetaplexValue(registeredAsset ? metaplexAgentWallet : hatcherSolanaWallet)}
              description={registeredAsset
                ? 'Asset signer PDA derived from the Core asset.'
                : 'Used for Hatcher Solana routing before Metaplex registration.'}
              tone={registeredAsset ? 'good' : hatcherSolanaWallet ? 'muted' : 'warn'}
              icon={Wallet}
            />
            <StatusTile
              label="Metaplex asset"
              value={shortMetaplexValue(registeredAsset)}
              description={registeredAsset ? 'Core asset identity is active.' : 'Created by a user-signed mintAgent transaction.'}
              tone={registeredAsset ? 'good' : 'muted'}
              icon={CheckCircle2}
            />
          </>
        )}
      </div>

      {registeredAsset && (
        <div className="mt-4 rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-success)]">Public Metaplex profile is live</div>
              <a
                href={getMetaplexProfileUrl(registeredAsset)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex max-w-full items-center gap-2 truncate font-mono text-sm text-[var(--text-primary)] hover:text-[var(--accent)]"
              >
                <span className="truncate">{registeredAsset}</span>
                <ExternalLink size={13} />
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={getMetaplexProfileUrl(registeredAsset)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-success-border)] px-3 py-2 text-xs font-semibold text-[var(--color-success)] transition hover:brightness-110"
              >
                Open profile <ExternalLink size={12} />
              </a>
              <button
                type="button"
                onClick={() => copy(getMetaplexProfileUrl(registeredAsset), 'Metaplex profile')}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-success-border)] px-3 py-2 text-xs font-semibold text-[var(--color-success)] transition hover:brightness-110"
              >
                <Share2 size={12} /> Copy profile
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-3">

          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border-subtle)] bg-black/30">
                {avatarPreview?.image ? (
                  <Image
                    src={avatarPreview.image}
                    alt={`${config?.registrationDocument.name ?? 'Agent'} Metaplex avatar`}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <ImageIcon size={22} className="text-[var(--text-muted)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                  <ImageIcon size={14} /> {avatarPreview?.label ?? 'Metaplex profile image'}
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                  {config?.registrationDocument.name ?? mintPlan?.request.name ?? 'Agent'}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  {avatarPreview?.helper ?? 'The public image is loaded from the agent metadata before registration.'}
                </p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => void uploadAvatar(event)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
                  >
                    {avatarUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    Upload image
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveAvatar(null, 'Using Hatcher default avatar')}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
                  >
                    <RotateCcw size={11} /> Use Hatcher default
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  PNG, JPG, WebP, GIF, or SVG up to 1.45 MB. Only image files are accepted.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <ShieldCheck size={14} /> What gets published
            </div>
            <div className="mt-3 grid gap-2 text-xs text-[var(--text-muted)]">
              <div className="flex justify-between gap-3">
                <span>Name</span>
                <span className="truncate text-right font-semibold text-[var(--text-primary)]">
                  {config?.registrationDocument.name ?? mintPlan?.request.name ?? '-'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Registry</span>
                <span className="truncate text-right font-mono text-[var(--text-primary)]">
                  {shortMetaplexValue(config?.registryAddress)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>x402 discovery</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {config?.capabilities.x402 ? 'Included' : 'Not included'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Public profile</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {registeredAsset ? 'Live on Metaplex' : 'Created after register'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Owner / payer</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {connectedWallet ? shortMetaplexValue(connectedWallet) : 'Connect wallet'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <ListChecks size={14} /> {registeredAsset ? 'Next steps' : 'Before you register'}
            </div>
            <div className="mt-3 space-y-2 text-xs text-[var(--text-muted)]">
              {(registeredAsset
                ? [
                    'Open the Metaplex profile and confirm the name, avatar, and Services tab.',
                    'Copy the profile link for partners or community posts.',
                    'Use the public metadata links below when another service asks for agent metadata.',
                  ]
                : [
                    'Review the avatar, name, and description that will appear publicly.',
                    'Open both metadata URLs below and confirm they load before submitting.',
                    'Confirm mainnet only when the public profile is ready to share.',
                  ]
              ).map((item) => (
                <div key={item} className="flex gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-[var(--color-success)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {shouldShowMetaplexMainnetConfirmation(registeredAsset) ? (
            <div className="rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={mainnetConfirmed}
                  onChange={(event) => setMainnetConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--color-warning)]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">
                    Confirm Solana mainnet registration
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
                    This creates a public Metaplex Core asset and Agent Identity for this agent. Your connected wallet signs and pays the Solana transaction.
                  </span>
                </span>
              </label>
              {button.reason && <div className="mt-3 text-xs text-[var(--color-warning)]">{button.reason}</div>}
              {config?.missing.length ? (
                <div className="mt-3 text-xs text-[var(--color-warning)]">
                  Missing: {config.missing.map((item) => item.replace('METAPLEX_PAYER_PRIVATE_KEY', 'Hatcher payer')).join(', ')}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void register()}
                disabled={registering || (button.disabled && button.label !== 'Connect wallet')}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registering ? <Loader2 size={14} className="animate-spin" /> : <Fingerprint size={14} />}
                {registering ? 'Registering' : button.label}
              </button>
            </div>
          ) : (
            <div className="rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[var(--color-success)]" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Already registered on Metaplex</div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                    This agent has a live Metaplex identity. Avatar or metadata changes here update Hatcher's public metadata endpoints for the registered profile.
                  </p>
                  <div className="mt-2 truncate font-mono text-[11px] text-[var(--color-success)]">
                    {shortMetaplexValue(registeredAsset)}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

          <div className="min-w-0 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 xl:order-3 xl:col-span-2 xl:aspect-video xl:min-h-[560px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                  <Coins size={14} /> Agent token
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  {existingToken
                    ? 'This agent has its permanent Genesis token linked on Metaplex.'
                    : 'Launch the one canonical Genesis token for this Metaplex agent identity.'}
                </p>
              </div>
              {tokenPlan?.status && (
                <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  tokenPlan.status === 'ready'
                    ? 'border-[var(--color-success-border)] text-[var(--color-success)]'
                    : tokenPlan.status === 'launched'
                      ? 'border-[var(--color-success-border)] text-[var(--color-success)]'
                      : 'border-[var(--color-warning-border)] text-[var(--color-warning)]'
                }`}
                >
                  {tokenPlan.status.replace('_', ' ')}
                </span>
              )}
            </div>

            {!registeredAsset ? (
              <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-black/10 p-3 text-xs text-[var(--text-muted)]">
                Register the Metaplex identity before launching an agent token.
              </div>
            ) : existingToken ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-[var(--color-success)]" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">Permanent token linked</div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                        This is the canonical Genesis token for this agent. Metaplex does not expose embedded market stats through the current agent-token API; use the Genesis launch page for live trading details.
                      </p>
                      <div className="mt-3 truncate font-mono text-[11px] text-[var(--text-primary)]">{existingToken.mintAddress}</div>
                      {existingToken.launchedAt && (
                        <div className="mt-1 text-[11px] text-[var(--text-muted)]">Launched {formatDate(existingToken.launchedAt)}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatusTile
                    label="Status"
                    value="Live"
                    description="Token is linked to this Metaplex agent."
                    tone="good"
                    icon={CheckCircle2}
                  />
                  <StatusTile
                    label="Mint"
                    value={shortMetaplexValue(existingToken.mintAddress)}
                    description="SPL token mint on Solana."
                    tone="muted"
                    icon={Coins}
                  />
                  <StatusTile
                    label="Genesis"
                    value={shortMetaplexValue(existingToken.genesisAccount)}
                    description="Launch account tracked by Metaplex Genesis."
                    tone="muted"
                    icon={Rocket}
                  />
                  <StatusTile
                    label="Market stats"
                    value={existingToken.launchUrl ? 'Metaplex page' : 'Not exposed'}
                    description="Open the Genesis launch page for live price and volume."
                    tone="muted"
                    icon={ExternalLink}
                  />
                </div>
                <div className="grid gap-2 xl:col-span-2 lg:grid-cols-3">
                  {tokenLinks.map((link) => (
                    <LinkRow key={link.href} label={link.label} href={link.href} onCopy={copy} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_112px]">
                  <label className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Name</span>
                    <input
                      value={tokenForm?.name ?? ''}
                      maxLength={32}
                      onChange={(event) => updateTokenForm('name', event.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                      placeholder="Hatch Token"
                    />
                  </label>
                  <label className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Symbol</span>
                    <input
                      value={tokenForm?.symbol ?? ''}
                      maxLength={10}
                      onChange={(event) => updateTokenForm('symbol', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                      placeholder="HATCH"
                    />
                  </label>
                </div>

                <div className="rounded-md border border-[var(--border-subtle)] bg-black/10 p-3">
                  <input
                    ref={tokenImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => void uploadTokenImage(event)}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border-subtle)] bg-black/20">
                      {tokenForm?.image && isMetaplexIrysImageUrl(tokenForm.image) ? (
                        <Image
                          src={tokenForm.image}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon size={22} className="text-[var(--text-muted)]" />
                      )}
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Token image</div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">
                        {tokenForm?.image && isMetaplexIrysImageUrl(tokenForm.image)
                          ? 'Uploaded to Irys and ready for Genesis metadata.'
                          : 'PNG, JPG, or WebP. Hatcher uploads it to Irys automatically.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => tokenImageInputRef.current?.click()}
                      disabled={tokenImageUploading}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {tokenImageUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      {tokenImageUploading ? 'Uploading' : tokenForm?.image ? 'Replace image' : 'Upload image'}
                    </button>
                  </div>
                  {tokenForm?.image && isMetaplexIrysImageUrl(tokenForm.image) && (
                    <div className="mt-3 truncate font-mono text-[11px] text-[var(--text-muted)]">{tokenForm.image}</div>
                  )}
                </div>

                <label className="block min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Description</span>
                  <textarea
                    value={tokenForm?.description ?? ''}
                    maxLength={250}
                    rows={3}
                    onChange={(event) => updateTokenForm('description', event.target.value)}
                    className="mt-1 w-full resize-none rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>

                <div className="rounded-md border border-[var(--border-subtle)] bg-black/10 p-1">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => updateTokenForm('launchType', 'bondingCurve')}
                      className={`rounded px-3 py-2 text-xs font-semibold transition ${
                        (tokenForm?.launchType ?? 'bondingCurve') === 'bondingCurve'
                          ? 'bg-[var(--accent)] text-black'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Bonding curve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTokenForm('launchType', 'launchpool')}
                      className={`rounded px-3 py-2 text-xs font-semibold transition ${
                        tokenForm?.launchType === 'launchpool'
                          ? 'bg-[var(--accent)] text-black'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Launchpool
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Website</span>
                    <input
                      value={tokenForm?.externalLinks.website ?? ''}
                      onChange={(event) => updateTokenLink('website', event.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">X</span>
                    <input
                      value={tokenForm?.externalLinks.twitter ?? ''}
                      onChange={(event) => updateTokenLink('twitter', event.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                      placeholder="@hatcherlabs"
                    />
                  </label>
                </div>

                {(tokenForm?.launchType ?? 'bondingCurve') === 'bondingCurve' ? (
                  <label className="block min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Agent first buy SOL</span>
                    <input
                      value={tokenForm?.firstBuyAmount ?? ''}
                      inputMode="decimal"
                      onChange={(event) => updateTokenForm('firstBuyAmount', event.target.value.replace(/[^0-9.]/g, ''))}
                      className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                      placeholder="Optional"
                    />
                  </label>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Token allocation</span>
                      <input
                        value={tokenForm?.launchpool.tokenAllocation ?? ''}
                        inputMode="numeric"
                        onChange={(event) => updateLaunchpoolForm('tokenAllocation', event.target.value.replace(/[^0-9]/g, ''))}
                        className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                        placeholder="500000000"
                      />
                    </label>
                    <label className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Deposit start</span>
                      <input
                        type="datetime-local"
                        value={tokenForm?.launchpool.depositStartTime ?? ''}
                        onChange={(event) => updateLaunchpoolForm('depositStartTime', event.target.value)}
                        className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Raise goal SOL</span>
                      <input
                        value={tokenForm?.launchpool.raiseGoal ?? ''}
                        inputMode="decimal"
                        onChange={(event) => updateLaunchpoolForm('raiseGoal', event.target.value.replace(/[^0-9.]/g, ''))}
                        className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                        placeholder="250"
                      />
                    </label>
                    <label className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Raydium LP bps</span>
                      <input
                        value={tokenForm?.launchpool.raydiumLiquidityBps ?? ''}
                        inputMode="numeric"
                        onChange={(event) => updateLaunchpoolForm('raydiumLiquidityBps', event.target.value.replace(/[^0-9]/g, ''))}
                        className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                        placeholder="5000"
                      />
                    </label>
                    <label className="min-w-0 md:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Funds recipient</span>
                      <input
                        value={tokenForm?.launchpool.fundsRecipient ?? ''}
                        onChange={(event) => updateLaunchpoolForm('fundsRecipient', event.target.value)}
                        className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                        placeholder={connectedWallet ?? 'Wallet address'}
                      />
                    </label>
                  </div>
                )}

                <label className="flex items-start gap-3 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3">
                  <input
                    type="checkbox"
                    checked={tokenForm?.confirmPermanentToken ?? false}
                    onChange={(event) => updateTokenForm('confirmPermanentToken', event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--color-warning)]"
                  />
                  <span className="text-xs leading-relaxed text-[var(--text-muted)]">
                    <span className="block font-semibold text-[var(--text-primary)]">I understand this permanently links one token to this agent.</span>
                    Metaplex only allows one canonical agent token once `setToken` is submitted.
                  </span>
                </label>

                {tokenButton.reason && (
                  <div className="rounded-md border border-[var(--border-subtle)] bg-black/10 p-3 text-xs text-[var(--text-muted)]">
                    {tokenButton.reason}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void checkTokenLaunch()}
                    disabled={checkingToken || !registeredAsset}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkingToken ? <Loader2 size={13} className="animate-spin" /> : <ListChecks size={13} />}
                    {checkingToken ? 'Checking' : 'Check readiness'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void launchToken()}
                    disabled={launchingToken || (tokenButton.disabled && tokenButton.label !== 'Connect wallet')}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                  >
                    {launchingToken ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                    {tokenButton.label}
                  </button>
                </div>
              </div>
            )}
          </div>

        <div className="min-w-0 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 xl:order-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">Review public metadata</div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                These URLs are embedded in the Metaplex registration and should return public JSON before submit.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {registeredLinks.length > 0 && (
              <div className="mb-3 space-y-2">
                {registeredLinks.map((link) => (
                  <LinkRow key={link.href} label={link.label} href={link.href} onCopy={copy} />
                ))}
              </div>
            )}
            {publicLinks.length > 0 ? (
              publicLinks.map((link) => (
                <LinkRow key={link.href} label={link.label} href={link.href} onCopy={copy} />
              ))
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </div>
          {mintPlan?.notes.length ? (
            <details className="mt-4 rounded-md border border-[var(--border-subtle)] bg-black/10 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--text-secondary)]">Technical receipt</summary>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[var(--text-muted)]">
                {mintPlan.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
