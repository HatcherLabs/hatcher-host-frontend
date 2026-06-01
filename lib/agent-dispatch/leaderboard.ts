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
  prizeUsd: number;
}

export interface SeasonWinner {
  rank: number;
  username: string;
  data: number;
  prizeUsd: number;
}

export interface SeasonData {
  month: string;
  monthEnd: string;
  prizeTable: { label: string; prizeUsd: number }[];
  board: SeasonBoardRow[];
  you: { rank: number; value: number; prizeUsd: number } | null;
  past: { month: string; winners: SeasonWinner[]; paidAt: string | null }[];
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
