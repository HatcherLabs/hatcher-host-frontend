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
  console.log('[pay-sol] start', {
    publicKey: publicKey?.toBase58(),
    hasSendTx: !!sendTransaction,
    endpoint: connection.rpcEndpoint,
    lamports: quote.lamports,
  });
  if (!publicKey || !sendTransaction) throw new Error('Connect a Solana wallet first');

  const treasury = new PublicKey(TREASURY_WALLET);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: treasury,
      lamports: quote.lamports,
    }),
  );

  let blockhash: string, lastValidBlockHeight: number;
  try {
    const bh = await connection.getLatestBlockhash('confirmed');
    blockhash = bh.blockhash;
    lastValidBlockHeight = bh.lastValidBlockHeight;
    console.log('[pay-sol] got blockhash', blockhash.slice(0, 8));
  } catch (e) {
    console.error('[pay-sol] getLatestBlockhash FAILED', e);
    throw new Error(`RPC error: ${(e as Error).message}. Check NEXT_PUBLIC_SOLANA_RPC.`);
  }
  tx.recentBlockhash = blockhash;
  tx.feePayer = publicKey;

  console.log('[pay-sol] calling wallet.sendTransaction — Phantom should pop up NOW');
  let signature: string;
  try {
    signature = await sendTransaction(tx, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    console.log('[pay-sol] tx sent, sig:', signature);
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
  const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, createBurnInstruction } =
    await import('@solana/spl-token');

  // $HATCHER is a Token-2022 token (pump.fun launched it on the 2022 program
  // for metadata pointer support). USDC is a classic SPL Token. The ATA
  // derivation and transfer instruction must be issued to the right program
  // or simulation reverts with "IncorrectProgramId" / "AccountNotOwnedByProgram".
  const tokenProgramId = mint === 'hatch' ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

  const mintPubkey = new PublicKey(mint === 'usdc' ? USDC_TOKEN_MINT : HATCH_TOKEN_MINT);
  const treasury = new PublicKey(TREASURY_WALLET);

  const fromAta = await getAssociatedTokenAddress(mintPubkey, publicKey, false, tokenProgramId);
  const toAta = await getAssociatedTokenAddress(mintPubkey, treasury, false, tokenProgramId);

  const decimals = mint === 'usdc' ? 6 : 6; // both USDC + $HATCHER use 6 decimals
  const totalBaseUnits = BigInt(Math.floor(amountHuman * 10 ** decimals));

  // For $HATCHER payments, split the amount 90/10: treasury receives 90%, the
  // remaining 10% is burned in the same tx. This ties revenue directly to
  // token supply reduction and is atomically verifiable — the backend sees
  // BOTH a transfer to treasury AND a burn instruction signed by the user.
  // USDC is paid in full; buy-and-burn for stablecoins is handled separately.
  const burnBaseUnits = mint === 'hatch' ? totalBaseUnits / 10n : 0n;
  const transferBaseUnits = totalBaseUnits - burnBaseUnits;

  const tx = new Transaction();

  // Create treasury's ATA if missing — idempotent, payer eats the rent
  const toAtaInfo = await connection.getAccountInfo(toAta);
  if (!toAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        publicKey,       // payer
        toAta,           // ata
        treasury,        // owner
        mintPubkey,      // mint
        tokenProgramId,  // token program (Token-2022 for HATCH)
      ),
    );
  }

  tx.add(
    createTransferInstruction(
      fromAta,
      toAta,
      publicKey,
      transferBaseUnits,
      [],
      tokenProgramId,
    ),
  );

  if (burnBaseUnits > 0n) {
    tx.add(
      createBurnInstruction(
        fromAta,         // burn straight from the payer's ATA
        mintPubkey,
        publicKey,       // authority
        burnBaseUnits,
        [],
        tokenProgramId,
      ),
    );
  }

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
