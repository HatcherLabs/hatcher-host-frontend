export interface AgentPitEntry {
  title: string;
  outcome: string | null;
  side: string | null;
  shares: number | null;
  valueUsd: number | null;
  price: number | null;
  sellUsd: number | null;
  timestamp: string | null;
  url: string | null;
}
export interface AgentPitConnection {
  status: "not_connected" | "connected";
  connectorId?: string;
  account?: {
    name: string;
    address: string;
    cashUsd: number;
    equityUsd?: number;
  };
  checkedAt?: string;
  autopilot?: {
    status: "starting" | "active" | "paused" | "error";
    strategy: string;
    schedule: string;
    maxTradeUsd: number;
    maxPositions: number;
    minCashUsd: number;
    jobId: string | null;
    initialRunRequestedAt: string | null;
    error: string | null;
    scheduleStatus?: string;
    lastRun?: string | null;
    nextRun?: string | null;
  } | null;
  portfolio?: {
    positionsValueUsd?: number;
    pnlUsd?: number;
    returnPct?: number;
    trades?: number;
    rank: number | null;
    profileUrl: string | null;
    positions: AgentPitEntry[] | null;
    openOrders: AgentPitEntry[] | null;
    activity: AgentPitEntry[] | null;
    positionsTotal?: number;
    openOrdersTotal?: number;
  };
}
