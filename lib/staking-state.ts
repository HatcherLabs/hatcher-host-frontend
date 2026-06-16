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
