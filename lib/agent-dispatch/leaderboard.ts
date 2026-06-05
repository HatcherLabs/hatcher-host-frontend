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
  frameworkWars?: Record<string, number>; // total validated score per framework
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

export interface SurgeData {
  active: boolean;
  multiplier: number;
  seed: number;
  endsAt: number | null;
  nextStartsAt: number;
  durationMs: number;
  serverNow: number;
}

export async function fetchSurge(): Promise<SurgeData | null> {
  try {
    const res = await fetch(`${API_URL}/dispatch/surge`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: SurgeData };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export interface TrophyRow {
  month: string;
  rank: number;
  status: string; // claimable | claimed
  wallet: string | null;
  tx: string | null;
  solscan: string | null;
}

export interface TrophiesData {
  enabled: boolean;
  trophies: TrophyRow[];
}

export async function fetchTrophies(): Promise<TrophiesData | null> {
  try {
    const res = await fetch(`${API_URL}/dispatch/trophies`, { credentials: 'include' });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: TrophiesData };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/** Claim a trophy as a cNFT to a Solana address (connected or pasted). */
export async function claimTrophy(
  month: string,
  address: string,
): Promise<{ ok: boolean; solscan?: string | null; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/dispatch/trophy/${month}/claim`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    const json = (await res.json()) as { success?: boolean; error?: string; data?: { solscan?: string | null } };
    if (!res.ok || json.success === false) return { ok: false, error: json.error ?? 'Claim failed' };
    return { ok: true, solscan: json.data?.solscan ?? null };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

/** Settle a premium skin's on-chain $HATCHER payment and mint its cNFT. */
export async function purchaseSkinCnft(
  skinId: string,
  txSignature: string,
): Promise<{ minted: boolean; solscan?: string | null; retry?: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/dispatch/skin/${encodeURIComponent(skinId)}/purchase`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txSignature }),
    });
    const json = (await res.json()) as {
      success?: boolean;
      error?: string;
      data?: { minted?: boolean; solscan?: string | null; retry?: boolean };
    };
    if (!res.ok || json.success === false) return { minted: false, error: json.error ?? 'Mint failed' };
    return { minted: !!json.data?.minted, solscan: json.data?.solscan ?? null, retry: !!json.data?.retry };
  } catch {
    return { minted: false, error: 'Network error' };
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
