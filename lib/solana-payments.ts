'use client';

// ============================================================
// Solana payment helpers — build + sign + send real transactions
//
// Every transfer is built from a short-lived server payment quote. The
// browser never re-prices the purchase or substitutes its own recipient/mint.
// ============================================================

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import type { SolanaPaymentQuote, SolanaPaymentToken } from './api/types';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
export type SplPaymentMint = 'usdc' | 'hatch' | 'kausa' | 'ansem';
export const MIN_PAYMENT_QUOTE_VALIDITY_MS = 120_000;

const SPL_PAYMENT_TOKENS: Record<SplPaymentMint, {
  decimals: number;
  symbol: string;
  tokenProgramId: PublicKey;
  burnBps: number;
}> = {
  usdc: {
    decimals: 6,
    symbol: 'USDC',
    tokenProgramId: TOKEN_PROGRAM_ID,
    burnBps: 0,
  },
  hatch: {
    decimals: 6,
    symbol: '$HATCHER',
    tokenProgramId: TOKEN_2022_PROGRAM_ID,
    burnBps: 1000,
  },
  kausa: {
    decimals: 6,
    symbol: '$KAUSA',
    tokenProgramId: TOKEN_2022_PROGRAM_ID,
    burnBps: 0,
  },
  ansem: {
    decimals: 6,
    symbol: '$ANSEM',
    tokenProgramId: TOKEN_2022_PROGRAM_ID,
    burnBps: 1000,
  },
};

interface PaymentCallbacks {
  /** Fired immediately after wallet broadcast returns a signature, before RPC confirmation. */
  onSignature?: (signature: string) => void;
}

function paymentMemoInstruction(memo: string): TransactionInstruction {
  const data = Buffer.from(memo, 'utf8');
  if (data.length === 0 || data.length > 512) {
    throw new Error('Invalid payment intent memo');
  }
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data,
  });
}

async function signAndBroadcastTransaction(params: {
  wallet: WalletContextState;
  connection: Connection;
  transaction: Transaction;
  label: string;
  validateBeforeBroadcast?: () => void;
}): Promise<string> {
  const { wallet, connection, transaction, label, validateBeforeBroadcast } = params;

  if (wallet.signTransaction) {
    const signed = await wallet.signTransaction(transaction);
    validateBeforeBroadcast?.();
    return connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
  }

  if (!wallet.sendTransaction) throw new Error('Connect a Solana wallet first');
  console.warn(`[${label}] wallet does not expose signTransaction; falling back to wallet sendTransaction`);
  return wallet.sendTransaction(transaction, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
}

export function validateSolanaPaymentQuote(
  quote: SolanaPaymentQuote,
  expectedToken: SolanaPaymentToken,
  payerWallet: string,
  now = Date.now(),
  minimumValidityMs = MIN_PAYMENT_QUOTE_VALIDITY_MS,
): void {
  if (quote.paymentToken !== expectedToken) {
    throw new Error('Server payment quote uses an unexpected token');
  }
  if (quote.payerWallet !== payerWallet) {
    throw new Error('Server payment quote is bound to a different payer wallet');
  }
  try {
    new PublicKey(quote.payerWallet);
    new PublicKey(quote.recipientWallet);
    if (expectedToken === 'sol') {
      if (quote.tokenMint !== null) throw new Error('SOL quote must not include a token mint');
    } else if (!quote.tokenMint) {
      throw new Error('Token payment quote is missing its mint');
    } else {
      new PublicKey(quote.tokenMint);
    }
  } catch (error) {
    if (error instanceof Error && /quote/.test(error.message)) throw error;
    throw new Error('Server payment quote contains an invalid Solana address');
  }
  const expiresAt = Date.parse(quote.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new Error('Server payment quote has expired');
  }
  if (expiresAt - now < minimumValidityMs) {
    throw new Error('Server payment quote is too close to expiry; request a fresh quote');
  }
  if (
    !Number.isFinite(quote.amountUsd) || quote.amountUsd <= 0
    || !Number.isFinite(quote.expectedAmount) || quote.expectedAmount <= 0
    || !Number.isFinite(quote.minAcceptable) || quote.minAcceptable <= 0
    || quote.minAcceptable > quote.expectedAmount
  ) {
    throw new Error('Server payment quote contains an invalid amount');
  }
  const memoBytes = Buffer.byteLength(quote.memo, 'utf8');
  if (
    !quote.intentId
    || quote.memo !== `hatcher-payment:${quote.intentId}`
    || memoBytes > 512
  ) {
    throw new Error('Server payment quote contains an invalid memo');
  }
}

function exactBaseUnits(amountHuman: number, decimals: number): bigint {
  const scale = 10 ** decimals;
  const scaled = amountHuman * scale;
  if (!Number.isFinite(scaled) || scaled <= 0 || scaled > Number.MAX_SAFE_INTEGER) {
    throw new Error('Payment amount is outside the supported range');
  }
  const nearest = Math.round(scaled);
  const baseUnits = Math.abs(scaled - nearest) < 1e-6 ? nearest : Math.ceil(scaled);
  return BigInt(baseUnits);
}

function getAssociatedTokenAddress(
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

function encodeTokenAmountInstruction(instruction: number, amount: bigint): Buffer {
  if (amount < 0n || amount > 0xffff_ffff_ffff_ffffn) {
    throw new Error('Token amount is outside the u64 range');
  }

  const data = Buffer.alloc(9);
  data[0] = instruction;
  data.writeBigUInt64LE(amount, 1);
  return data;
}

function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  tokenProgramId: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

function createTransferInstruction(
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint,
  tokenProgramId: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: tokenProgramId,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: encodeTokenAmountInstruction(3, amount),
  });
}

function createBurnInstruction(
  account: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  amount: bigint,
  tokenProgramId: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: tokenProgramId,
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: encodeTokenAmountInstruction(8, amount),
  });
}

function formatTokenUnits(amount: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = amount % base;
  if (fraction === 0n) return whole.toString();

  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fractionText}`;
}

function parsedTokenAmount(raw: unknown): bigint | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = (raw as { amount?: unknown }).amount;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  return BigInt(value);
}

async function getTokenAccountBaseUnits(
  connection: Connection,
  tokenAccount: PublicKey,
): Promise<bigint | null> {
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount, 'confirmed');
    return parsedTokenAmount(balance.value);
  } catch {
    return null;
  }
}

async function resolveSourceTokenAccount(params: {
  connection: Connection;
  owner: PublicKey;
  associatedTokenAccount: PublicKey;
  mint: PublicKey;
  tokenProgramId: PublicKey;
  requiredBaseUnits: bigint;
}): Promise<{ account: PublicKey; availableBaseUnits: bigint }> {
  const ataBalance = await getTokenAccountBaseUnits(params.connection, params.associatedTokenAccount);
  if (ataBalance !== null && ataBalance >= params.requiredBaseUnits) {
    return { account: params.associatedTokenAccount, availableBaseUnits: ataBalance };
  }

  let bestAccount = params.associatedTokenAccount;
  let bestBalance = ataBalance ?? 0n;
  try {
    const ownedAccounts = await params.connection.getParsedTokenAccountsByOwner(
      params.owner,
      { programId: params.tokenProgramId },
      'confirmed',
    );

    for (const row of ownedAccounts.value) {
      const parsed = 'parsed' in row.account.data ? row.account.data.parsed : null;
      const info = parsed && typeof parsed === 'object'
        ? (parsed as { info?: { mint?: string; owner?: string; tokenAmount?: unknown } }).info
        : null;
      if (!info || info.mint !== params.mint.toBase58() || info.owner !== params.owner.toBase58()) continue;

      const balance = parsedTokenAmount(info.tokenAmount);
      if (balance !== null && balance > bestBalance) {
        bestAccount = row.pubkey;
        bestBalance = balance;
      }
    }
  } catch {
    // The ATA balance above is still enough to produce a useful insufficient
    // balance error. Falling back keeps wallet payment failures readable.
  }

  return { account: bestAccount, availableBaseUnits: bestBalance };
}

/**
 * Build + sign + broadcast a SOL transfer to the platform treasury.
 * Returns the tx signature once the cluster confirms it. Throws on
 * wallet disconnect, user reject, timeout, or insufficient balance.
 */
export async function payWithSol(params: {
  wallet: WalletContextState;
  connection: Connection;
  quote: SolanaPaymentQuote;
  onSignature?: PaymentCallbacks['onSignature'];
}): Promise<{ signature: string }> {
  const { wallet, connection, quote } = params;
  const { publicKey } = wallet;
  if (!publicKey || (!wallet.signTransaction && !wallet.sendTransaction)) {
    throw new Error('Connect a Solana wallet first');
  }
  validateSolanaPaymentQuote(quote, 'sol', publicKey.toBase58());

  const recipient = new PublicKey(quote.recipientWallet);
  const lamports = exactBaseUnits(quote.expectedAmount, 9);
  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('SOL payment amount is too large');
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: recipient,
      lamports: Number(lamports),
    }),
  );
  tx.add(paymentMemoInstruction(quote.memo));

  let blockhash: string, lastValidBlockHeight: number;
  try {
    const bh = await connection.getLatestBlockhash('confirmed');
    blockhash = bh.blockhash;
    lastValidBlockHeight = bh.lastValidBlockHeight;
  } catch (e) {
    console.error('[pay-sol] getLatestBlockhash FAILED', e);
    throw new Error(`RPC error: ${(e as Error).message}. Check NEXT_PUBLIC_SOLANA_RPC.`);
  }
  tx.recentBlockhash = blockhash;
  tx.feePayer = publicKey;
  validateSolanaPaymentQuote(quote, 'sol', publicKey.toBase58());

  let signature: string;
  try {
    signature = await signAndBroadcastTransaction({
      wallet,
      connection,
      transaction: tx,
      label: 'pay-sol',
      validateBeforeBroadcast: () => validateSolanaPaymentQuote(
        quote,
        'sol',
        publicKey.toBase58(),
        Date.now(),
        0,
      ),
    });
    params.onSignature?.(signature);
  } catch (e) {
    console.error('[pay-sol] sendTransaction FAILED', e);
    throw e;
  }

  // Wait for cluster confirmation. 'confirmed' ≈ 2-3 block confirmations,
  // usually ~5-10s on mainnet. We use the block-height strategy so the
  // promise rejects cleanly if the blockhash expires (not indefinitely).
  const result = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  );
  if (result.value.err) {
    throw new Error(
      `Transaction failed on-chain: ${JSON.stringify(result.value.err)}`,
    );
  }

  return { signature };
}

/**
 * Build + sign + broadcast an SPL token transfer (USDC or $HATCHER) to
 * the recipient's Associated Token Account for that mint. Creates the
 * recipient's ATA on the fly if it doesn't exist yet — the payer eats
 * the ~0.00203928 SOL rent for that one-time cost.
 */
export async function payWithSplToken(params: {
  wallet: WalletContextState;
  connection: Connection;
  mint: SplPaymentMint;
  quote: SolanaPaymentQuote;
  onSignature?: PaymentCallbacks['onSignature'];
}): Promise<{ signature: string }> {
  const { wallet, connection, mint, quote } = params;
  const { publicKey } = wallet;
  if (!publicKey || (!wallet.signTransaction && !wallet.sendTransaction)) {
    throw new Error('Connect a Solana wallet first');
  }
  validateSolanaPaymentQuote(quote, mint, publicKey.toBase58());

  const token = SPL_PAYMENT_TOKENS[mint];
  const tokenProgramId = token.tokenProgramId;
  const mintPubkey = new PublicKey(quote.tokenMint!);
  const recipient = new PublicKey(quote.recipientWallet);

  const fromAta = getAssociatedTokenAddress(mintPubkey, publicKey, tokenProgramId);
  const toAta = getAssociatedTokenAddress(mintPubkey, recipient, tokenProgramId);

  const decimals = token.decimals;
  const totalBaseUnits = exactBaseUnits(quote.expectedAmount, decimals);
  const symbol = token.symbol;
  const source = await resolveSourceTokenAccount({
    connection,
    owner: publicKey,
    associatedTokenAccount: fromAta,
    mint: mintPubkey,
    tokenProgramId,
    requiredBaseUnits: totalBaseUnits,
  });
  if (source.availableBaseUnits < totalBaseUnits) {
    throw new Error(
      `Insufficient ${symbol} balance. Need ${formatTokenUnits(totalBaseUnits, decimals)} ${symbol}, wallet has ${formatTokenUnits(source.availableBaseUnits, decimals)} ${symbol}.`,
    );
  }

  // Burn-enabled Token-2022 rails use a 90/10 treasury/burn split.
  // Non-burn partner tokens such as $KAUSA and stablecoins transfer 100%.
  const burnBaseUnits = token.burnBps > 0 ? (totalBaseUnits * BigInt(token.burnBps)) / 10_000n : 0n;
  const transferBaseUnits = totalBaseUnits - burnBaseUnits;

  const tx = new Transaction();

  // Create treasury's ATA if missing — payer eats the rent.
  const toAtaInfo = await connection.getAccountInfo(toAta);
  if (!toAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        publicKey,       // payer
        toAta,           // ata
        recipient,       // owner
        mintPubkey,      // mint
        tokenProgramId,  // token program (Token-2022 for HATCH)
      ),
    );
  }

  tx.add(
    createTransferInstruction(
      source.account,
      toAta,
      publicKey,
      transferBaseUnits,
      tokenProgramId,
    ),
  );

  if (burnBaseUnits > 0n) {
    tx.add(
      createBurnInstruction(
        source.account,  // burn straight from the payer's token account
        mintPubkey,
        publicKey,       // authority
        burnBaseUnits,
        tokenProgramId,
      ),
    );
  }

  tx.add(paymentMemoInstruction(quote.memo));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = publicKey;
  validateSolanaPaymentQuote(quote, mint, publicKey.toBase58());

  let signature: string;
  try {
    signature = await signAndBroadcastTransaction({
      wallet,
      connection,
      transaction: tx,
      label: `pay-${mint}`,
      validateBeforeBroadcast: () => validateSolanaPaymentQuote(
        quote,
        mint,
        publicKey.toBase58(),
        Date.now(),
        0,
      ),
    });
  } catch (e) {
    console.error(`[pay-${mint}] sendTransaction FAILED`, e);
    throw e;
  }
  params.onSignature?.(signature);
  const result = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  );
  if (result.value.err) {
    throw new Error(
      `Token transfer failed on-chain: ${JSON.stringify(result.value.err)}`,
    );
  }

  return { signature };
}
