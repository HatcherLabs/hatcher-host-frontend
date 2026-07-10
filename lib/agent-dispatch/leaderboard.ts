import { API_URL } from '@/lib/config';
import type { DispatchSkinPaymentIntent } from '@/lib/api/types';

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
  status: string; // claimable | minting | claimed
  wallet: string | null;
  tx: string | null;
  solscan: string | null;
}

export interface TrophiesData {
  enabled: boolean;
  trophies: TrophyRow[];
}

export interface DispatchSkinCnftRow {
  skinId: string;
  status: 'claimable' | 'minting' | 'minted' | string;
  wallet: string | null;
  tx: string | null;
  solscan: string | null;
}

export interface PendingDispatchSkinSettlement {
  skinId: string;
  payerWallet: string;
  paymentIntentId: string;
  txSignature: string;
  createdAt: number;
}

const PENDING_DISPATCH_SKIN_SETTLEMENTS_KEY = 'hatcher:dispatch:pending-skin-settlements:v1';
const PENDING_DISPATCH_SKIN_SETTLEMENT_TTL_MS = 24 * 60 * 60 * 1000;

function readPendingDispatchSkinSettlements(now = Date.now()): PendingDispatchSkinSettlement[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PENDING_DISPATCH_SKIN_SETTLEMENTS_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PendingDispatchSkinSettlement => {
      if (!entry || typeof entry !== 'object') return false;
      const value = entry as Partial<PendingDispatchSkinSettlement>;
      return typeof value.skinId === 'string'
        && typeof value.payerWallet === 'string'
        && typeof value.paymentIntentId === 'string'
        && typeof value.txSignature === 'string'
        && typeof value.createdAt === 'number'
        && value.createdAt <= now
        && now - value.createdAt <= PENDING_DISPATCH_SKIN_SETTLEMENT_TTL_MS;
    });
  } catch {
    return [];
  }
}

function writePendingDispatchSkinSettlements(entries: PendingDispatchSkinSettlement[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENDING_DISPATCH_SKIN_SETTLEMENTS_KEY, JSON.stringify(entries));
  } catch {
    // Settlement still remains recoverable through support and the backend.
  }
}

export function savePendingDispatchSkinSettlement(
  settlement: Omit<PendingDispatchSkinSettlement, 'createdAt'> & { createdAt?: number },
): void {
  const createdAt = settlement.createdAt ?? Date.now();
  const entries = readPendingDispatchSkinSettlements(createdAt).filter((entry) => (
    entry.skinId !== settlement.skinId || entry.payerWallet !== settlement.payerWallet
  ));
  entries.push({ ...settlement, createdAt });
  writePendingDispatchSkinSettlements(entries);
}

export function getPendingDispatchSkinSettlement(
  skinId: string,
  payerWallet: string,
  now = Date.now(),
): PendingDispatchSkinSettlement | null {
  const entries = readPendingDispatchSkinSettlements(now);
  writePendingDispatchSkinSettlements(entries);
  return entries.find((entry) => entry.skinId === skinId && entry.payerWallet === payerWallet) ?? null;
}

export function clearPendingDispatchSkinSettlement(skinId: string, payerWallet: string): void {
  const entries = readPendingDispatchSkinSettlements().filter((entry) => (
    entry.skinId !== skinId || entry.payerWallet !== payerWallet
  ));
  writePendingDispatchSkinSettlements(entries);
}

export async function fetchDispatchSkinCnfts(): Promise<DispatchSkinCnftRow[]> {
  const res = await fetch(`${API_URL}/dispatch/skin-cnfts`, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: { skins?: DispatchSkinCnftRow[] } };
  return Array.isArray(json.data?.skins) ? json.data.skins : [];
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
): Promise<{ ok: boolean; pending?: boolean; status?: string; solscan?: string | null; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/dispatch/trophy/${month}/claim`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    const json = (await res.json()) as {
      success?: boolean;
      error?: string;
      data?: { claimed?: boolean; alreadyClaimed?: boolean; pending?: boolean; status?: string; solscan?: string | null };
    };
    if (!res.ok || json.success === false) return { ok: false, error: json.error ?? 'Claim failed' };
    return {
      ok: true,
      pending: json.data?.pending === true,
      status: json.data?.status,
      solscan: json.data?.solscan ?? null,
    };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

/** Issue the amount/mint/recipient quote that must be signed for a premium skin. */
export class DispatchSkinClaimableError extends Error {
  readonly code = 'DISPATCH_SKIN_CLAIMABLE';
}

export async function createSkinPaymentIntent(
  skinId: string,
  payerWallet: string,
): Promise<DispatchSkinPaymentIntent> {
  const res = await fetch(`${API_URL}/dispatch/skin/${encodeURIComponent(skinId)}/payment-intent`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payerWallet }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    code?: string;
    data?: DispatchSkinPaymentIntent;
  };
  if (res.status === 409 && json.code === 'DISPATCH_SKIN_CLAIMABLE') {
    throw new DispatchSkinClaimableError(json.error ?? 'This premium skin is awaiting its cNFT claim');
  }
  if (!res.ok || json.success === false || !json.data) {
    throw new Error(json.error ?? 'Could not create the skin payment quote');
  }
  return json.data;
}

/** Retry minting a premium skin that the server has already marked paid. */
export async function claimPaidSkinCnft(
  skinId: string,
  address: string,
): Promise<{ minted: boolean; pending: boolean; status?: string; solscan?: string | null }> {
  const res = await fetch(`${API_URL}/dispatch/skin/${encodeURIComponent(skinId)}/claim`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { minted?: boolean; alreadyMinted?: boolean; pending?: boolean; status?: string; solscan?: string | null };
  };
  if (!res.ok || json.success === false || !json.data) {
    throw new Error(json.error ?? 'Skin cNFT claim failed');
  }
  return {
    minted: json.data.minted === true || json.data.alreadyMinted === true,
    pending: json.data.pending === true,
    status: json.data.status,
    solscan: json.data.solscan ?? null,
  };
}

/** Settle an intent-bound premium skin payment and mint its cNFT. */
export async function purchaseSkinCnft(
  skinId: string,
  txSignature: string,
  paymentIntentId: string,
): Promise<{ minted: boolean; pending: boolean; status?: string; solscan?: string | null; retry?: boolean }> {
  const res = await fetch(`${API_URL}/dispatch/skin/${encodeURIComponent(skinId)}/purchase`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txSignature, paymentIntentId }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { minted?: boolean; pending?: boolean; status?: string; solscan?: string | null; retry?: boolean };
  };
  if (!res.ok || json.success === false || !json.data) {
    throw new Error(json.error ?? 'Skin payment settlement failed');
  }
  return {
    minted: !!json.data.minted,
    pending: json.data.pending === true,
    status: json.data.status,
    solscan: json.data.solscan ?? null,
    retry: !!json.data.retry,
  };
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
