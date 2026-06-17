import { isMobileWalletAdapterName } from '@/lib/wallet-adapter-state';

export function resolveStakingLinkedWalletAddress({
  userWalletAddress,
  summaryWalletAddress,
  optimisticLinkedWalletAddress,
}: {
  userWalletAddress: string | null | undefined;
  summaryWalletAddress: string | null | undefined;
  optimisticLinkedWalletAddress: string | null | undefined;
}): string | null {
  return optimisticLinkedWalletAddress ?? userWalletAddress ?? summaryWalletAddress ?? null;
}

export const WALLET_LINK_SIWS_STATEMENT = 'Link this wallet to Hatcher for staking rewards and AI Credits.';

export function shouldUseWalletSignInForLinking({
  walletName,
  signInSupported,
}: {
  walletName: string | null | undefined;
  signInSupported: boolean;
  isMobileRuntime?: boolean;
}): boolean {
  return signInSupported && isMobileWalletAdapterName(walletName);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export type StakingWalletStep = 'sign-in' | 'connect-wallet' | 'link-wallet' | 'ready';

export function resolveStakingWalletStep({
  isAuthenticated,
  connectedWalletAddress,
  linkedWalletAddress,
  walletMatchesAccount,
}: {
  isAuthenticated: boolean;
  connectedWalletAddress: string | null | undefined;
  linkedWalletAddress: string | null | undefined;
  walletMatchesAccount: boolean;
}): StakingWalletStep {
  if (!isAuthenticated) return 'sign-in';
  if (!connectedWalletAddress) return 'connect-wallet';
  if (!linkedWalletAddress || !walletMatchesAccount) return 'link-wallet';
  return 'ready';
}

export function formatStakingWalletStepNotice(step: Exclude<StakingWalletStep, 'sign-in' | 'ready'>): string {
  if (step === 'connect-wallet') {
    return 'Wallet connected. Tap Link wallet to sign and link it before staking.';
  }
  return 'Wallet linked. Tap Stake HATCHER again to submit the staking transaction.';
}

export function formatStakingTokenAmount(value: number, maximumFractionDigits = 0): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)} HATCHER`;
}

export function formatRewardFundingSources(sources: readonly string[]): string {
  if (sources.length === 0) return 'creator fees, buybacks, and dev wallet';
  if (sources.length === 1) return sources[0] ?? '';
  if (sources.length === 2) return `${sources[0]} and ${sources[1]}`;
  return `${sources.slice(0, -1).join(', ')}, and ${sources[sources.length - 1]}`;
}
