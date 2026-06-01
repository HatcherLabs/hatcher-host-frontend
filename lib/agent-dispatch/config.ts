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
  rare?: boolean;
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
  xpMult: number; // job-type XP multiplier
  jobName: string;
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
// XP needed to go from (level-1) -> level. Steepens quickly so high levels are
// a real grind (and prestige is earned, not handed out).
export function xpForLevel(level: number): number {
  return Math.round(130 + (level - 1) * 95 + Math.pow(level - 1, 1.9) * 24);
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
export const PACKET_DATA = 5; // Data per collected packet
export const PACKET_XP = 4; // XP per collected packet
export const COMPLETE_XP = 20; // XP bonus for finishing a run

// ── Prestige ────────────────────────────────────────────────────────────
export const PRESTIGE_LEVEL = 20; // min level to prestige
export const PRESTIGE_BONUS = 0.25; // +25% Data/XP per prestige rank

export function prestigeMultiplier(prestige: number): number {
  return 1 + prestige * PRESTIGE_BONUS;
}

// ── Upgrades (Lab) ──────────────────────────────────────────────────────
export type UpgradeId = 'payout' | 'speed' | 'radius' | 'yield' | 'magnet' | 'slots';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  icon: string;
  baseCost: number;
  costMult: number;
  maxLevel: number;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'payout', name: 'Data Yield', desc: '+10% Data per packet & run', icon: '◆', baseCost: 320, costMult: 1.75, maxLevel: 10 },
  { id: 'speed', name: 'Thrusters', desc: 'Couriers travel ~8% faster', icon: '➤', baseCost: 260, costMult: 1.8, maxLevel: 8 },
  { id: 'radius', name: 'Collector Array', desc: '+15% pickup radius', icon: '◎', baseCost: 220, costMult: 1.7, maxLevel: 6 },
  { id: 'yield', name: 'Cargo Bays', desc: '+1 packet per run', icon: '▤', baseCost: 300, costMult: 1.8, maxLevel: 8 },
  { id: 'magnet', name: 'Tractor Beam', desc: 'Nearby packets drift to the courier', icon: '✦', baseCost: 600, costMult: 1.9, maxLevel: 5 },
  { id: 'slots', name: 'Ops Center', desc: '+1 simultaneous dispatch', icon: '⊞', baseCost: 1100, costMult: 2.1, maxLevel: 4 },
];

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.round(def.baseCost * Math.pow(def.costMult, level));
}

export interface UpgradeEffects {
  durationMult: number;
  collectRadius: number;
  extraPackets: number;
  maxSlots: number;
  payoutMult: number;
  magnetRange: number;
}

export const BASE_COLLECT_RADIUS = 2.4;
export const BASE_SLOTS = 2;

export function upgradeEffects(levels: Partial<Record<UpgradeId, number>>): UpgradeEffects {
  const lv = (id: UpgradeId) => levels[id] ?? 0;
  return {
    durationMult: Math.max(0.4, 1 - 0.08 * lv('speed')),
    collectRadius: BASE_COLLECT_RADIUS * (1 + 0.15 * lv('radius')),
    extraPackets: lv('yield'),
    maxSlots: BASE_SLOTS + lv('slots'),
    payoutMult: 1 + 0.1 * lv('payout'),
    magnetRange: lv('magnet') > 0 ? 2 + lv('magnet') * 2.2 : 0,
  };
}

// ── Job types ───────────────────────────────────────────────────────────
export interface JobType {
  id: string;
  name: string;
  desc: string;
  durationMult: number;
  packetMult: number;
  rewardMult: number;
  xpMult: number;
  rarePackets: number;
}

export const JOB_TYPES: JobType[] = [
  { id: 'standard', name: 'Standard', desc: 'Balanced data run.', durationMult: 1, packetMult: 1, rewardMult: 1, xpMult: 1, rarePackets: 0 },
  { id: 'express', name: 'Express', desc: 'Fast & short — big XP.', durationMult: 0.6, packetMult: 0.7, rewardMult: 0.9, xpMult: 1.4, rarePackets: 0 },
  { id: 'hazard', name: 'Hazard', desc: 'Longer, packed with data.', durationMult: 1.4, packetMult: 1.8, rewardMult: 1.25, xpMult: 1.15, rarePackets: 0 },
  { id: 'treasure', name: 'Treasure', desc: 'Fewer packets, one rare prize.', durationMult: 1.1, packetMult: 0.6, rewardMult: 1, xpMult: 1, rarePackets: 1 },
];

export const RARE_PACKET_MULT = 10;
export const COMBO_WINDOW_MS = 2500;
export const COMBO_MAX = 5;

// ── Achievements ────────────────────────────────────────────────────────
export interface AchStats {
  dispatches: number;
  packets: number;
  level: number;
  prestige: number;
  upgradeLevels: number; // sum of all upgrade levels
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  reward: number; // Data
  met: (s: AchStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-run', name: 'First Contact', desc: 'Complete your first dispatch.', reward: 60, met: (s) => s.dispatches >= 1 },
  { id: 'collector', name: 'Collector', desc: 'Collect 100 data-packets.', reward: 150, met: (s) => s.packets >= 100 },
  { id: 'commuter', name: 'Commuter', desc: 'Complete 25 dispatches.', reward: 300, met: (s) => s.dispatches >= 25 },
  { id: 'tinkerer', name: 'Tinkerer', desc: 'Buy your first Lab upgrade.', reward: 120, met: (s) => s.upgradeLevels >= 1 },
  { id: 'rising', name: 'Rising Star', desc: 'Reach level 10.', reward: 500, met: (s) => s.level >= 10 },
  { id: 'hoarder', name: 'Data Hoarder', desc: 'Collect 1,000 packets.', reward: 900, met: (s) => s.packets >= 1000 },
  { id: 'logistics', name: 'Logistics Pro', desc: 'Complete 100 dispatches.', reward: 1200, met: (s) => s.dispatches >= 100 },
  { id: 'ascended', name: 'Ascended', desc: 'Prestige for the first time.', reward: 2000, met: (s) => s.prestige >= 1 },
  { id: 'engineer', name: 'Chief Engineer', desc: 'Reach 12 total upgrade levels.', reward: 1500, met: (s) => s.upgradeLevels >= 12 },
];

// ── Idle / auto-dispatch ────────────────────────────────────────────────
export const OFFLINE_RATE_PER_AGENT = 0.3; // Data/sec per running agent while auto-dispatching
export const OFFLINE_CAP_SEC = 6 * 3600; // max 6h of offline accrual

// ── Daily streak ────────────────────────────────────────────────────────
export const DAILY_BASE = 60; // Data on day 1
export const DAILY_MAX_MULT = 7; // streak caps the multiplier at 7×

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
export function yesterdayKey(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

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
