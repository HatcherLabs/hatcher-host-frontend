'use client';

import { useMemo } from 'react';
import {
  ConnectionProvider as _ConnectionProvider,
  WalletProvider as _SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider as _WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { AuthProvider } from '@/lib/auth-context';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Solana wallet adapter packages are compiled against React 19 types
// where FC returns ReactNode | Promise<ReactNode>, but this project
// uses React 18. Cast via unknown → ComponentType to suppress the
// JSX compatibility error. Safe — these components work at runtime.
/* eslint-disable @typescript-eslint/no-explicit-any */
const ConnectionProvider = _ConnectionProvider as unknown as React.ComponentType<any>;
const SolanaWalletProvider = _SolanaWalletProvider as unknown as React.ComponentType<any>;
const WalletModalProvider = _WalletModalProvider as unknown as React.ComponentType<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

const SOLANA_RPC = process.env['NEXT_PUBLIC_SOLANA_RPC'] ?? 'https://api.devnet.solana.com';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AuthProvider>{children}</AuthProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
