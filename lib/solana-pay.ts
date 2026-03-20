// ============================================================
// Solana Payment Helper — signs and sends SOL transfers
// ============================================================

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

const DEFAULT_TREASURY = '9uH2JePdA9uFVsAqfStpSkzVHisvhN98SP4Wy5zGZaN8';

/**
 * Send a SOL payment from the connected wallet to the treasury.
 *
 * In development mode with NEXT_PUBLIC_ALLOW_MOCK_PAYMENTS=true,
 * returns a mock transaction signature instead of sending a real tx.
 *
 * @returns The on-chain transaction signature string (or mock- prefixed in dev).
 * @throws If wallet is not connected, user rejects, or tx fails.
 */
export async function sendSolPayment(params: {
  wallet: WalletContextState;
  connection: Connection;
  solAmount: number;
  treasuryWallet?: string;
}): Promise<string> {
  const { wallet, connection, solAmount, treasuryWallet } = params;

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  // Dev-mode mock payment bypass — no real transaction needed
  if (process.env['NEXT_PUBLIC_ALLOW_MOCK_PAYMENTS'] === 'true') {
    return `mock-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const treasury = new PublicKey(
    treasuryWallet ??
      process.env['NEXT_PUBLIC_TREASURY_WALLET'] ??
      DEFAULT_TREASURY
  );

  const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

  if (lamports <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: treasury,
      lamports,
    })
  );

  // Get a recent blockhash
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Send via wallet adapter (handles signing internally)
  const signature = await wallet.sendTransaction(transaction, connection);

  // Wait for confirmation
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return signature;
}

/** Convert USD to SOL using a fixed devnet rate or a fetched price. */
export function usdToSol(usdAmount: number, solPrice = 150): number {
  if (solPrice <= 0) return 0;
  return parseFloat((usdAmount / solPrice).toFixed(6));
}
