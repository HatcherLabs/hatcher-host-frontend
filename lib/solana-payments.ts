'use client';

// ============================================================
// Solana payment helpers — build + sign + send real transactions
//
// Usage:
//   const { signature } = await payWithSol({
//     wallet, connection, usdAmount, solUsdPrice,
//   });
//   await api.subscribe(tierKey, signature);
//
// The backend's verifySolanaTransaction() reads the tx from the
// Solana RPC and checks:
//   1. tx exists + confirmed
//   2. signer = wallet.publicKey
//   3. destination = TREASURY_WALLET (env)
//   4. amount >= minAcceptable (backend re-computes from tier + live price
//      with ~5% slippage tolerance)
//   5. tx signature not already consumed (UNIQUE in DB)
// ============================================================

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { TREASURY_WALLET, HATCH_TOKEN_MINT, USDC_TOKEN_MINT } from './config';

export interface SolQuote {
  usdAmount: number;
  solUsdPrice: number;
  solAmount: number;   // human-readable, e.g. 0.033
  lamports: number;    // integer lamports sent on-chain
  quotedAt: number;    // Date.now() — frontend expires the quote after ~60s
}

/**
 * Compute how much SOL to send for a given USD amount using the live
 * SOL/USD rate. Adds a 1% buffer on top so that small price drifts
 * between quote and broadcast don't push the payment below backend's
 * minimum-accepted threshold (backend allows ~5%, we reserve ~1% of
 * that for the user).
 */
export function quoteSolForUsd(usdAmount: number, solUsdPrice: number): SolQuote {
  if (solUsdPrice <= 0) throw new Error('Invalid SOL price');
  const solAmount = (usdAmount / solUsdPrice) * 1.01;
  const lamports = Math.ceil(solAmount * LAMPORTS_PER_SOL);
  return {
    usdAmount,
    solUsdPrice,
    solAmount: lamports / LAMPORTS_PER_SOL,
    lamports,
    quotedAt: Date.now(),
  };
}

/**
 * Build + sign + broadcast a SOL transfer to the platform treasury.
 * Returns the tx signature once the cluster confirms it. Throws on
 * wallet disconnect, user reject, timeout, or insufficient balance.
 */
export async function payWithSol(params: {
  wallet: WalletContextState;
  connection: Connection;
  quote: SolQuote;
}): Promise<{ signature: string }> {
  const { wallet, connection, quote } = params;
  const { publicKey, sendTransaction } = wallet;
  if (!publicKey || !sendTransaction) throw new Error('Connect a Solana wallet first');

  const treasury = new PublicKey(TREASURY_WALLET);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: treasury,
      lamports: quote.lamports,
    }),
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = publicKey;

  const signature = await sendTransaction(tx, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

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
 * the treasury's Associated Token Account for that mint. Creates the
 * treasury's ATA on the fly if it doesn't exist yet — the payer eats
 * the ~0.00203928 SOL rent for that idempotent one-time cost.
 */
export async function payWithSplToken(params: {
  wallet: WalletContextState;
  connection: Connection;
  mint: 'usdc' | 'hatch';
  amountHuman: number; // e.g. 4.99 USDC or 100000 HATCH
}): Promise<{ signature: string }> {
  const { wallet, connection, mint, amountHuman } = params;
  const { publicKey, sendTransaction } = wallet;
  if (!publicKey || !sendTransaction) throw new Error('Connect a Solana wallet first');

  // Lazy-load SPL-token so we don't ship the whole SDK in the initial bundle.
  const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } =
    await import('@solana/spl-token');

  const mintPubkey = new PublicKey(mint === 'usdc' ? USDC_TOKEN_MINT : HATCH_TOKEN_MINT);
  const treasury = new PublicKey(TREASURY_WALLET);

  const fromAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
  const toAta = await getAssociatedTokenAddress(mintPubkey, treasury);

  const decimals = mint === 'usdc' ? 6 : 6; // both USDC + $HATCHER use 6 decimals
  const amount = BigInt(Math.floor(amountHuman * 10 ** decimals));

  const tx = new Transaction();

  // Create treasury's ATA if missing — idempotent, payer eats the rent
  const toAtaInfo = await connection.getAccountInfo(toAta);
  if (!toAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        publicKey,   // payer
        toAta,       // ata
        treasury,    // owner
        mintPubkey,  // mint
      ),
    );
  }

  tx.add(
    createTransferInstruction(
      fromAta,
      toAta,
      publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = publicKey;

  const signature = await sendTransaction(tx, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
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
