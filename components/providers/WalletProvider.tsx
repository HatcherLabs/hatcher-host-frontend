'use client';

import { useEffect, useMemo } from 'react';
import {
  ConnectionProvider,
  useWallet,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { SOLANA_RPC_BROWSER_ENDPOINT } from '@/lib/config';
import {
  isSelectableSolanaWallet,
  shouldAutoConnectSolanaWallet,
} from '@/lib/wallet-adapter-state';

import '@solana/wallet-adapter-react-ui/styles.css';

function StaleWalletSelectionGuard() {
  const { select, wallet } = useWallet();

  useEffect(() => {
    if (!wallet || isSelectableSolanaWallet(wallet.adapter.name, wallet.readyState)) return;

    // Wallet Adapter persists the last selection. Clear adapters that are no
    // longer installed so a stale Solflare selection cannot launch its web
    // flow on every Hatcher route.
    select(null);
  }, [select, wallet]);

  return null;
}

/** Solana wallet adapter — used only for payments, not for auth */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_BROWSER_ENDPOINT}>
      <SolanaWalletProvider
        wallets={wallets}
        autoConnect={(adapter) => Promise.resolve(
          shouldAutoConnectSolanaWallet(adapter.name, adapter.readyState),
        )}
      >
        <StaleWalletSelectionGuard />
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
