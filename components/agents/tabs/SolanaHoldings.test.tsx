import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AgentWalletNetworkBalance } from '@/lib/api';
import { SolanaHoldings } from './SolanaHoldings';

const network = {
  id: 'solana', address: 'DemoWallet', chainId: 'mainnet-beta', balanceError: null,
  nativeBalance: { symbol: 'SOL', raw: '1', formatted: '0.000000001', decimals: 9 },
  tokenBalances: [
    { symbol: 'USDC', assetAddress: 'UsdcMint', raw: '0', formatted: '0.0', decimals: 6 },
    { symbol: 'TEST', name: 'Test token', assetAddress: 'TestMint', raw: '1', formatted: '0.000000001', decimals: 9 },
  ],
} as AgentWalletNetworkBalance;
const render = (changes: Partial<AgentWalletNetworkBalance> = {}) => renderToStaticMarkup(<SolanaHoldings network={{ ...network, ...changes }} />);

describe('Solana holdings list', () => {
  it('shows the other holdings without duplicating the existing USDC tile', () => {
    const html = render();
    expect(html).toContain('Other holdings');
    expect(html).toContain('Test token');
    expect(html).toContain('0.000000001');
    expect(html).not.toContain('USDC');
    expect(html).toContain('https://solscan.io/token/TestMint');
  });
  it('shows an empty state only after a successful empty scan', () => {
    expect(render({ tokenBalances: network.tokenBalances.slice(0, 1) })).toContain('No other token holdings.');
  });
  it('shows errors rather than a false empty portfolio', () => {
    const html = render({ tokenBalances: [], tokenBalanceError: 'RPC unavailable' });
    expect(html).toContain('Could not load token holdings.');
    expect(html).not.toContain('No other token holdings.');
  });
  it('distinguishes unloaded and unprovisioned wallets from empty holdings', () => {
    expect(render({ nativeBalance: null, tokenBalances: [] })).toContain('not available yet');
    expect(render({ address: null, nativeBalance: null, tokenBalances: [] })).toContain('Wallet not provisioned');
  });
  it('preserves the network in explorer links', () => {
    expect(render({ chainId: 'devnet' })).toContain('https://solscan.io/token/TestMint?cluster=devnet');
  });
  it('escapes untrusted names and retains exact large amounts', () => {
    const html = render({ tokenBalances: [network.tokenBalances[0], {
      ...network.tokenBalances[1], symbol: '<script>alert(1)</script>', formatted: '9007199254741000.1',
    }] });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('9007199254741000.1');
  });
});
