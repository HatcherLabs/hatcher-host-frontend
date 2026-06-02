import { API_URL } from '@/lib/config';

export interface LeaderRow {
  username: string;
  value: number;
  level: number;
  prestige: number;
}

export interface LeaderboardData {
  overall: LeaderRow[];
  byFramework: Record<string, LeaderRow[]>;
}

export interface ScorePayload {
  totalData: number;
  level: number;
  prestige: number;
  frameworkData: Record<string, number>;
}

/** Best-effort upsert of the viewer's score. Silently no-ops if signed out. */
export async function submitDispatchScore(payload: ScorePayload): Promise<void> {
  try {
    await fetch(`${API_URL}/dispatch/score`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    /* offline / signed out — ignore */
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardData | null> {
  try {
    const res = await fetch(`${API_URL}/dispatch/leaderboard`, { credentials: 'include' });
    const json = (await res.json()) as { success?: boolean; data?: LeaderboardData };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export interface SeasonBoardRow {
  rank: number;
  username: string;
  value: number;
  prizeCredits: number;
}

export interface SeasonWinner {
  rank: number;
  username: string;
  data: number;
  prizeCredits: number;
}

export interface SeasonPast {
  month: string;
  winners: SeasonWinner[];
  paidAt: string | null;
  merkleRoot: string | null;
  anchorTx: string | null;
  solscan: string | null;
}

export interface SeasonData {
  month: string;
  monthEnd: string;
  prizeTable: { label: string; credits: number; note: string }[];
  board: SeasonBoardRow[];
  you: { rank: number; value: number; prizeCredits: number } | null;
  past: SeasonPast[];
  onchain: { enabled: boolean; payer: string | null };
}

export async function fetchSeason(): Promise<SeasonData | null> {
  try {
    const res = await fetch(`${API_URL}/dispatch/season`, { credentials: 'include' });
    const json = (await res.json()) as { success?: boolean; data?: SeasonData };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export interface ReceiptRow {
  id: string;
  framework: string;
  destName: string;
  dataEarned: number;
  status: string; // pending | anchored | failed
  tx: string | null;
  solscan: string | null;
  at: number;
}

export interface ReceiptsData {
  enabled: boolean;
  payer: string | null;
  receipts: ReceiptRow[];
}

export async function fetchReceipts(): Promise<ReceiptsData | null> {
  try {
    const res = await fetch(`${API_URL}/dispatch/receipts`, { credentials: 'include' });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: ReceiptsData };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Report a completed dispatch. The server accrues the authoritative competitive
 * score (bounded + anti-farmed) and queues an on-chain receipt when enabled.
 * Best-effort; no-ops server-side when signed out. Returns the server-awarded
 * score for this completion + whether it was anchored.
 */
export async function reportDispatchComplete(payload: {
  framework: string;
  destName: string;
  job: string;
  agentId?: string;
}): Promise<{ scored: number; anchoring: boolean } | null> {
  try {
    const res = await fetch(`${API_URL}/dispatch/complete`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { scored?: number; anchoring?: boolean } };
    return { scored: json?.data?.scored ?? 0, anchoring: !!json?.data?.anchoring };
  } catch {
    return null;
  }
}
