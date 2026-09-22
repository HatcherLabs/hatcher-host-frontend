'use client';

import { ExternalLink } from 'lucide-react';
import type { AgentWalletNetworkBalance } from '@/lib/api';
import { shortAddress } from '@/lib/agent-passport';

export function SolanaHoldings({ network }: { network: AgentWalletNetworkBalance }) {
  // The API keeps canonical USDC first; it already has a dedicated balance tile.
  const tokens = network.tokenBalances.slice(1);
  const error = network.tokenBalanceError ?? network.balanceError;
  const cluster = network.chainId === 'devnet' ? '?cluster=devnet'
    : network.chainId === 'testnet' ? '?cluster=testnet' : '';

  return (
    <section className="mt-5 border-t border-[var(--border-default)] pt-4" aria-label="Other Solana holdings">
      <h4 className="text-sm font-semibold text-[var(--text-primary)]">Other holdings</h4>
      {error ? (
        <p role="status" className="mt-2 text-xs text-[var(--color-destructive)]">Could not load token holdings. Refresh to try again.</p>
      ) : !network.address ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">Wallet not provisioned.</p>
      ) : !network.nativeBalance ? (
        <p role="status" className="mt-2 text-xs text-[var(--text-muted)]">Token holdings are not available yet.</p>
      ) : tokens.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">No other token holdings.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border-default)]">
          {tokens.map((token) => (
            <li key={token.assetAddress} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1 basis-40">
                <div className="truncate text-sm font-semibold text-[var(--text-primary)]" title={token.name ?? token.symbol}>{token.symbol}</div>
                {token.name && <div className="truncate text-xs text-[var(--text-muted)]">{token.name}</div>}
                {token.assetAddress && (
                  <a href={`https://solscan.io/token/${encodeURIComponent(token.assetAddress)}${cluster}`} target="_blank" rel="noopener noreferrer"
                    className="mt-1 inline-flex max-w-full items-center gap-1 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)]"
                    title={token.assetAddress} aria-label={`View ${token.symbol} token on Solscan`}>
                    {shortAddress(token.assetAddress)} <ExternalLink size={10} aria-hidden="true" />
                  </a>
                )}
              </div>
              <div className="max-w-full break-all text-right font-mono text-sm tabular-nums text-[var(--text-primary)]" title={token.formatted}>
                {token.formatted.includes('.') ? token.formatted.replace(/\.?0+$/, '') : token.formatted}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
