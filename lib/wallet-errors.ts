export function walletErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isWalletTrustRevokedError(error: unknown): boolean {
  return /has not been authorized|account has not been authorized|Unauthorized for this operation/i.test(
    walletErrorMessage(error),
  );
}

export function isWalletUserCancellationError(error: unknown): boolean {
  return /User rejected|User denied|cancelled|canceled/i.test(walletErrorMessage(error));
}
