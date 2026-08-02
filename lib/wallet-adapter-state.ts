import { WalletReadyState } from '@solana/wallet-adapter-base';

export const MOBILE_WALLET_ADAPTER_NAME = 'Mobile Wallet Adapter';

export function isMobileWalletAdapterName(walletName: string | null | undefined): boolean {
  return walletName === MOBILE_WALLET_ADAPTER_NAME;
}

export function isSelectableSolanaWallet(
  walletName: string,
  readyState: WalletReadyState,
): boolean {
  return readyState === WalletReadyState.Installed
    || (isMobileWalletAdapterName(walletName) && readyState === WalletReadyState.Loadable);
}

export function shouldAutoConnectSolanaWallet(
  walletName: string,
  readyState: WalletReadyState,
): boolean {
  return !isMobileWalletAdapterName(walletName) && readyState === WalletReadyState.Installed;
}
