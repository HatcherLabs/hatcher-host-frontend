export const MOBILE_WALLET_ADAPTER_NAME = 'Mobile Wallet Adapter';

export function isMobileWalletAdapterName(walletName: string | null | undefined): boolean {
  return walletName === MOBILE_WALLET_ADAPTER_NAME;
}

export function shouldAutoConnectSolanaWallet(walletName: string): boolean {
  return !isMobileWalletAdapterName(walletName);
}
