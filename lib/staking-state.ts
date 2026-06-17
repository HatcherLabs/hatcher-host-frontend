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

export function formatStakingTokenAmount(value: number, maximumFractionDigits = 0): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)} HATCHER`;
}

export function formatRewardFundingSources(sources: readonly string[]): string {
  if (sources.length === 0) return 'creator fees, buybacks, and dev wallet';
  if (sources.length === 1) return sources[0] ?? '';
  if (sources.length === 2) return `${sources[0]} and ${sources[1]}`;
  return `${sources.slice(0, -1).join(', ')}, and ${sources[sources.length - 1]}`;
}
