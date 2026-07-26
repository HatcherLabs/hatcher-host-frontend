import type { PublicTraderData } from "@/lib/api";

export type PublicActivityScope = "all" | "agent" | "market";
export type PublicActivitySource = "agent" | "agent-wallet" | "market";

export interface PublicActivityRow {
  id: string;
  source: PublicActivitySource;
  action: string;
  pair: string;
  amount: string | null;
  amountUsd: string | null;
  transactionHash: string | null;
  publicThesis: string | null;
  traderAddress: string | null;
  createdAt: string;
}

type ActivityInput = {
  activity: PublicTraderData["activity"];
  liveTrades: PublicTraderData["liveTrades"];
  chain: Pick<PublicTraderData["chain"], "walletAddress">;
  token: Pick<NonNullable<PublicTraderData["token"]>, "symbol"> | null;
};

function normalizedHash(value: string | null): string | null {
  return value?.trim().toLowerCase() || null;
}

function newestFirst(
  left: PublicActivityRow,
  right: PublicActivityRow,
): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

export function buildPublicActivity(
  input: ActivityInput,
): Record<PublicActivityScope, PublicActivityRow[]> {
  const symbol = input.token?.symbol ?? "AGENT";
  const walletAddress = input.chain.walletAddress?.toLowerCase() ?? null;
  const tradesByHash = new Map(
    input.liveTrades.flatMap((trade) => {
      const hash = normalizedHash(trade.transactionHash);
      return hash ? [[hash, trade] as const] : [];
    }),
  );
  const agentHashes = new Set(
    input.activity.flatMap((activity) => {
      const hash = normalizedHash(activity.transactionHash);
      return hash ? [hash] : [];
    }),
  );

  const agentRows: PublicActivityRow[] = input.activity.map((activity) => {
    const hash = normalizedHash(activity.transactionHash);
    const indexedTrade = hash ? tradesByHash.get(hash) : null;
    return {
      id: `agent:${activity.id}`,
      source: "agent",
      action: activity.action,
      pair: activity.pair,
      amount: activity.amount ?? indexedTrade?.tokenValue ?? null,
      amountUsd: activity.amountUsd ?? indexedTrade?.valueUsd ?? null,
      transactionHash: activity.transactionHash,
      publicThesis: activity.publicThesis,
      traderAddress: input.chain.walletAddress,
      createdAt: activity.createdAt,
    };
  });

  const marketRows: PublicActivityRow[] = input.liveTrades.map((trade) => {
    const isAgentWallet =
      Boolean(walletAddress) &&
      trade.traderAddress?.toLowerCase() === walletAddress;
    return {
      id: `market:${trade.transactionHash}:${trade.timestamp}`,
      source: isAgentWallet ? "agent-wallet" : "market",
      action: trade.side === "BUY" ? "token_market_buy" : "token_market_sell",
      pair: trade.side === "BUY" ? `ETH → ${symbol}` : `${symbol} → ETH`,
      amount: trade.tokenValue,
      amountUsd: trade.valueUsd,
      transactionHash: trade.transactionHash,
      publicThesis: null,
      traderAddress: trade.traderAddress,
      createdAt: trade.timestamp,
    };
  });

  return {
    all: [
      ...agentRows,
      ...marketRows.filter((row) => {
        const hash = normalizedHash(row.transactionHash);
        return !hash || !agentHashes.has(hash);
      }),
    ].sort(newestFirst),
    agent: [...agentRows].sort(newestFirst),
    market: [...marketRows].sort(newestFirst),
  };
}
