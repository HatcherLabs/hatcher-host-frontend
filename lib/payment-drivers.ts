'use client';

// ============================================================
// usePaymentDrivers — shared hook for every payment surface
//
// Before this hook, billing/page.tsx and FilesTab each had their own
// copy of "connect wallet → fetch quote → show confirm → sign → return
// signature" logic. They drifted: billing showed a rich confirm modal
// with live rate, FilesTab shot off a bare window.confirm. Now both
// use the same `driveSol / driveUsdc / driveHatch` returned from here,
// with a single `ConfirmPaymentModal` fed by `confirmState`.
//
// The hook is intentionally thin:
//   - knows how to connect the wallet-adapter,
//   - fetches SOL / $HATCHER rates from /prices,
//   - opens the confirm modal via state and awaits the user's click,
//   - calls payWithSol / payWithSplToken,
//   - returns the resulting tx signature (or throws on cancel/error).
//
// The caller owns what happens with the signature — subscribe, addon,
// unlock, whatever. The caller also renders <ConfirmPaymentModal> with
// the `confirmState` returned here.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { api } from '@/lib/api';
import { payWithSol, payWithSplToken, quoteSolForUsd } from '@/lib/solana-payments';
import type { ConfirmPaymentModalState } from '@/components/payments/ConfirmPaymentModal';

export type PaymentRail = 'sol' | 'usdc' | 'hatch';

export interface UsePaymentDrivers {
  /** Pass to <ConfirmPaymentModal state={...} onClose={...} />. */
  confirmState: ConfirmPaymentModalState;
  /** Fire this as the modal's onClose handler. */
  closeConfirm: (approved: boolean) => void;
  /** SOL → treasury. Live Jupiter quote, 1% buffer for slippage. */
  driveSol: (usdAmount: number, label: string) => Promise<string>;
  /** USDC (1:1 pegged) → treasury SPL ATA. */
  driveUsdc: (usdAmount: number, label: string) => Promise<string>;
  /**
   * $HATCHER → 90% to treasury + 10% burn in the same signed tx. Live
   * Jupiter quote with 1% buffer. On-chain proof of burn visible to the
   * buyer before signing (breakdown in the confirm modal).
   */
  driveHatch: (usdAmount: number, label: string) => Promise<string>;
  /** Open the wallet-select modal so the user can connect / switch. */
  openWalletModal: () => void;
  /** Disconnect + re-prompt. Use when the wallet is stuck after the
   *  user revoked trust inside the extension. */
  reconnect: () => Promise<void>;
  /** Disconnect without re-prompt (for a manual "Disconnect" button). */
  disconnect: () => Promise<void>;
  /** Currently-connected address in base58, or null when disconnected. */
  address: string | null;
  connected: boolean;
}

export function usePaymentDrivers(): UsePaymentDrivers {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const [confirmState, setConfirmState] = useState<ConfirmPaymentModalState>({
    isOpen: false, token: 'sol', label: '', usdAmount: 0, tokenAmount: 0, rate: 0,
  });

  // Stash the wallet behind a ref so async paths don't close over a stale
  // adapter reference after the user connects mid-flow. wallet-adapter-react
  // re-renders the hook consumers but a driver function captured the old
  // `wallet` in its closure.
  const walletRef = useRef(wallet);
  useEffect(() => { walletRef.current = wallet; }, [wallet]);

  const closeConfirm = useCallback((approved: boolean) => {
    setConfirmState((prev) => {
      prev.resolve?.(approved);
      return { ...prev, isOpen: false, resolve: undefined };
    });
  }, []);

  const askConfirm = useCallback(
    (params: Omit<ConfirmPaymentModalState, 'isOpen' | 'resolve'>): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({ ...params, isOpen: true, resolve });
      });
    },
    [],
  );

  // Force-reconnect: used when Phantom says "not authorized" — which
  // happens when the user revoked trust in the extension while the
  // adapter still thought it was connected. We tear down the adapter's
  // state (disconnect) and re-run ensureConnected so the wallet-approve
  // popup fires again.
  const forceReconnect = useCallback(async (): Promise<void> => {
    const w = walletRef.current;
    try { await w.disconnect(); } catch { /* ignore */ }
    // Wait a tick for the adapter to fully flip to disconnected before
    // we open the modal — otherwise the modal may skip showing.
    await new Promise((r) => setTimeout(r, 150));
    setWalletModalVisible(true);
    const start = Date.now();
    while (!walletRef.current.connected || !walletRef.current.publicKey) {
      if (Date.now() - start > 60_000) throw new Error('Wallet connection timed out');
      // If the user dismissed the modal without selecting a wallet,
      // bail out immediately instead of spinning for 60 s.
      const cur = walletRef.current;
      if (!cur.wallet && !cur.connecting && Date.now() - start > 1_000) {
        throw new Error('Cancelled');
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }, [setWalletModalVisible]);

  const ensureConnected = useCallback(async (): Promise<void> => {
    const w = walletRef.current;
    if (w.connected && w.publicKey) return;
    // Try silent auto-connect if an adapter is already selected. If that
    // fails (wallet locked, user revoked trust from the extension, etc.)
    // we fall through to the modal so the user picks/confirms explicitly.
    if (w.wallet && !w.connecting) {
      try { await w.connect(); } catch { /* fall through to modal */ }
    }
    if (!walletRef.current.connected) {
      setWalletModalVisible(true);
    }
    const start = Date.now();
    while (!walletRef.current.connected || !walletRef.current.publicKey) {
      if (Date.now() - start > 60_000) throw new Error('Wallet connection timed out');
      await new Promise((r) => setTimeout(r, 200));
    }
  }, [setWalletModalVisible]);

  // Matches the Phantom "trust revoked" error that fires when the user
  // disconnected the site from the extension but the adapter still
  // thinks it's connected. Deliberately NARROW — we must NOT match
  // "User rejected the request", which is a legit user cancel, not a
  // trust-break. Auto-reconnecting in that case would force-disconnect
  // the wallet every time the user dismissed a Phantom popup.
  const isTrustRevokedError = (e: unknown): boolean => {
    const msg = e instanceof Error ? e.message : String(e);
    return /has not been authorized|account has not been authorized|Unauthorized for this operation/i.test(msg);
  };

  // Separate detector for pure user-cancellations so drivers can bail
  // out cleanly (not as an error) without triggering any reconnect.
  const isUserCancellation = (e: unknown): boolean => {
    const msg = e instanceof Error ? e.message : String(e);
    return /User rejected|User denied|cancelled|canceled/i.test(msg);
  };

  const driveSol = useCallback(async (usdAmount: number, label: string): Promise<string> => {
    await ensureConnected();
    const priceRes = await api.getPrice('sol');
    if (!priceRes.success || !priceRes.data?.price) {
      throw new Error('Could not fetch live SOL price — try again in a moment');
    }
    const quote = quoteSolForUsd(usdAmount, priceRes.data.price);
    const approved = await askConfirm({
      token: 'sol', label, usdAmount,
      tokenAmount: quote.solAmount, rate: quote.solUsdPrice,
    });
    if (!approved) throw new Error('Cancelled');
    try {
      const { signature } = await payWithSol({ wallet: walletRef.current, connection, quote });
      return signature;
    } catch (e) {
      if (isUserCancellation(e)) throw new Error('Cancelled');
      if (!isTrustRevokedError(e)) throw e;
      // Phantom revoked trust — disconnect, re-prompt, retry once.
      await forceReconnect();
      const { signature } = await payWithSol({ wallet: walletRef.current, connection, quote });
      return signature;
    }
  }, [connection, ensureConnected, askConfirm, forceReconnect]);

  const driveUsdc = useCallback(async (usdAmount: number, label: string): Promise<string> => {
    await ensureConnected();
    const approved = await askConfirm({
      token: 'usdc', label, usdAmount,
      tokenAmount: usdAmount, rate: 1,
    });
    if (!approved) throw new Error('Cancelled');
    try {
      const { signature } = await payWithSplToken({
        wallet: walletRef.current, connection, mint: 'usdc', amountHuman: usdAmount,
      });
      return signature;
    } catch (e) {
      if (isUserCancellation(e)) throw new Error('Cancelled');
      if (!isTrustRevokedError(e)) throw e;
      await forceReconnect();
      const { signature } = await payWithSplToken({
        wallet: walletRef.current, connection, mint: 'usdc', amountHuman: usdAmount,
      });
      return signature;
    }
  }, [connection, ensureConnected, askConfirm, forceReconnect]);

  const driveHatch = useCallback(async (usdAmount: number, label: string): Promise<string> => {
    await ensureConnected();
    const priceRes = await api.getPrice('hatch');
    if (!priceRes.success || !priceRes.data?.price) {
      throw new Error('Could not fetch live $HATCHER price — try again in a moment');
    }
    const hatchAmount = (usdAmount / priceRes.data.price) * 1.01;
    const burnAmount = hatchAmount * 0.1;
    const approved = await askConfirm({
      token: 'hatch', label, usdAmount,
      tokenAmount: hatchAmount, rate: priceRes.data.price,
      burnAmount, treasuryAmount: hatchAmount - burnAmount,
    });
    if (!approved) throw new Error('Cancelled');
    try {
      const { signature } = await payWithSplToken({
        wallet: walletRef.current, connection, mint: 'hatch', amountHuman: hatchAmount,
      });
      return signature;
    } catch (e) {
      if (isUserCancellation(e)) throw new Error('Cancelled');
      if (!isTrustRevokedError(e)) throw e;
      await forceReconnect();
      const { signature } = await payWithSplToken({
        wallet: walletRef.current, connection, mint: 'hatch', amountHuman: hatchAmount,
      });
      return signature;
    }
  }, [connection, ensureConnected, askConfirm, forceReconnect]);

  const openWalletModal = useCallback(() => {
    setWalletModalVisible(true);
  }, [setWalletModalVisible]);

  const disconnect = useCallback(async () => {
    const w = walletRef.current;
    try { await w.disconnect(); } catch { /* ignore */ }
    // Clear the remembered wallet name in localStorage so the next
    // "Connect Wallet" click reopens the picker modal. Without this the
    // adapter would silently auto-reconnect to the same wallet on the
    // next action (because Phantom still trusts the origin), which looks
    // identical to "disconnect did nothing" from the user's perspective.
    try { w.select(null as unknown as never); } catch { /* ignore */ }
    try {
      localStorage.removeItem('walletName');
      localStorage.removeItem('WalletAdapterWalletName');
    } catch { /* SSR / storage disabled */ }
  }, []);

  return {
    confirmState,
    closeConfirm,
    driveSol,
    driveUsdc,
    driveHatch,
    openWalletModal,
    reconnect: forceReconnect,
    disconnect,
    // Prefer `publicKey` as the source of truth — `wallet.connected` can
    // briefly report true while the adapter is mid-reconnect, and some
    // adapters flip `connected` before the publicKey is restored.
    address: wallet.publicKey?.toBase58() ?? null,
    connected: Boolean(wallet.publicKey),
  };
}
