// Agent Dispatch mini-game — shared types, leveling curve, and skin catalog.

export type SkinCurrency = 'data' | 'hatch';

export interface DispatchSkin {
  id: string;
  name: string;
  desc: string;
  currency: SkinCurrency;
  price: number; // Data points, or whole $HATCHER tokens for `hatch` skins
  color: string; // courier / aura accent
  trail: string; // trail / glow accent
  premium?: boolean;
}

export interface DispatchPacket {
  x: number;
  z: number;
  collected: boolean;
}

export interface ActiveDispatch {
  id: string;
  agentId: string;
  agentName: string;
  framework: string;
  destName: string;
  route: { x: number; z: number }[];
  totalLength: number;
  startedAt: number;
  durationMs: number;
  packets: DispatchPacket[];
  collected: number;
  baseReward: number; // Data awarded on completion (before packet bonus)
  startLevel: number; // viewer level when the run began (for "leveled up" toast)
}

export interface DispatchResult {
  agentName: string;
  destName: string;
  dataEarned: number;
  xpEarned: number;
  leveledTo: number | null;
  at: number;
}

// ── Leveling ────────────────────────────────────────────────────────────
// XP needed to go from (level-1) -> level. Gentle early, steeper later.
export function xpForLevel(level: number): number {
  return Math.round(80 + (level - 1) * 60 + Math.pow(level - 1, 1.7) * 12);
}

export interface LevelInfo {
  level: number;
  intoLevel: number; // xp accumulated within the current level
  forNext: number; // xp needed to finish the current level
  pct: number; // 0..1 progress to next level
  totalForLevel: number; // cumulative xp at the start of this level
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let consumed = 0;
  // Cap the loop so a corrupt value can't spin forever.
  while (level < 999) {
    const need = xpForLevel(level);
    if (totalXp < consumed + need) {
      const intoLevel = totalXp - consumed;
      return {
        level,
        intoLevel,
        forNext: need,
        pct: Math.max(0, Math.min(1, intoLevel / need)),
        totalForLevel: consumed,
      };
    }
    consumed += need;
    level += 1;
  }
  return { level, intoLevel: 0, forNext: xpForLevel(level), pct: 0, totalForLevel: consumed };
}

// ── Dispatch economics ──────────────────────────────────────────────────
export const PACKET_DATA = 8; // Data per collected packet
export const PACKET_XP = 5; // XP per collected packet
export const COMPLETE_XP = 25; // XP bonus for finishing a run

// ── Skin catalog ────────────────────────────────────────────────────────
export const DISPATCH_SKINS: DispatchSkin[] = [
  { id: 'default', name: 'Standard', desc: 'The classic gold courier.', currency: 'data', price: 0, color: '#ffd24a', trail: '#ffe27a' },
  { id: 'spark', name: 'Spark', desc: 'Electric cyan trail.', currency: 'data', price: 200, color: '#3fe0ff', trail: '#9af0ff' },
  { id: 'ember', name: 'Ember', desc: 'Molten orange glow.', currency: 'data', price: 400, color: '#ff8a3a', trail: '#ffc08a' },
  { id: 'mint', name: 'Mint', desc: 'Fresh phosphor green.', currency: 'data', price: 650, color: '#3dffa6', trail: '#aaffd8' },
  { id: 'violet', name: 'Violet', desc: 'Deep arcade purple.', currency: 'data', price: 1000, color: '#b06bff', trail: '#d8b8ff' },
  { id: 'crimson', name: 'Crimson', desc: 'Hot pink streak.', currency: 'data', price: 1600, color: '#ff4f9d', trail: '#ffa8cf' },
  // $HATCHER premium — real on-chain burn (price in USD, paid via $HATCHER with
  // 10% burned + 90% to treasury through the existing payment flow).
  { id: 'nebula', name: 'Nebula', desc: 'Iridescent — pay with $HATCHER (10% burned).', currency: 'hatch', price: 1.99, color: '#7af0d0', trail: '#c8a8ff', premium: true },
  { id: 'aurora', name: 'Aurora', desc: 'Shifting aurora — $HATCHER exclusive.', currency: 'hatch', price: 3.99, color: '#a8ffe0', trail: '#8fb4ff', premium: true },
  { id: 'singularity', name: 'Singularity', desc: 'White-gold flagship — $HATCHER burn.', currency: 'hatch', price: 6.99, color: '#fff4cf', trail: '#ffd46b', premium: true },
];

export function skinById(id: string | null | undefined): DispatchSkin {
  return DISPATCH_SKINS.find((s) => s.id === id) ?? DISPATCH_SKINS[0]!;
}
