import { describe, expect, it } from "vitest";
import { buildPublicActivity } from "./publicActivity";

describe("public trader activity", () => {
  it("deduplicates the combined timeline while retaining every token trade", () => {
    const duplicateHash = `0x${"a".repeat(64)}`;
    const marketHash = `0x${"b".repeat(64)}`;
    const wallet = "0x4444444444444444444444444444444444444444";
    const activity = buildPublicActivity({
      chain: { walletAddress: wallet },
      token: { symbol: "HATCHERAGENT" },
      activity: [
        {
          id: "action-1",
          action: "equifold_buy",
          pair: "ETH → HATCHERAGENT",
          asset: "ETH",
          amount: "0.01",
          amountUsd: null,
          transactionHash: duplicateHash,
          publicThesis: "A public agent thesis.",
          createdAt: "2026-07-26T10:00:00.000Z",
        },
      ],
      liveTrades: [
        {
          side: "BUY",
          traderAddress: wallet,
          ethAmount: "10000000000000000",
          tokenAmount: "100000000000000000000",
          ethValue: "0.01",
          tokenValue: "100",
          valueUsd: "20",
          priceUsd: "0.2",
          transactionHash: duplicateHash,
          timestamp: "2026-07-26T10:00:00.000Z",
          source: "curve",
        },
        {
          side: "SELL",
          traderAddress: "0x5555555555555555555555555555555555555555",
          ethAmount: "5000000000000000",
          tokenAmount: "50000000000000000000",
          ethValue: "0.005",
          tokenValue: "50",
          valueUsd: "10",
          priceUsd: "0.2",
          transactionHash: marketHash,
          timestamp: "2026-07-26T10:05:00.000Z",
          source: "curve",
        },
      ],
    });

    expect(activity.all).toHaveLength(2);
    expect(activity.agent).toHaveLength(1);
    expect(activity.market).toHaveLength(2);
    expect(
      activity.all.filter((row) => row.transactionHash === duplicateHash),
    ).toHaveLength(1);
    expect(activity.agent[0]).toMatchObject({
      source: "agent",
      amountUsd: "20",
      publicThesis: "A public agent thesis.",
    });
    expect(activity.market).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "agent-wallet",
          transactionHash: duplicateHash,
        }),
        expect.objectContaining({
          source: "market",
          transactionHash: marketHash,
        }),
      ]),
    );
  });
});
