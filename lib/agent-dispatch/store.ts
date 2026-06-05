'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type ActiveDispatch,
  type DispatchResult,
  type DispatchSkin,
  type UpgradeId,
  type UpgradeDef,
  type Achievement,
  levelInfo,
  prestigeMultiplier,
  upgradeCost,
  upgradeEffects,
  PRESTIGE_LEVEL,
  PACKET_DATA,
  PACKET_XP,
  COMPLETE_XP,
  RARE_PACKET_MULT,
  OFFLINE_RATE_PER_AGENT,
  AUTO_UNLOCK_COST,
  AUTO_FUEL_COST,
  OFFLINE_CAP_SEC,
  DAILY_BASE,
  DAILY_MAX_MULT,
  todayKey,
  yesterdayKey,
} from './config';

interface DispatchState {
  // Progression (persisted).
  data: number;
  xp: number;
  prestige: number;
  frameworkData: Record<string, number>; // lifetime Data per framework (leaderboard)
  upgrades: Partial<Record<UpgradeId, number>>;
  ownedSkins: string[];
  equippedSkin: string;
  stats: { dispatches: number; packets: number };
  achieved: string[];
  autoDispatch: boolean;
  autoUnlocked: boolean; // auto-dispatch is bought once with Data, then burns fuel
  manualControl: boolean; // steer the active courier yourself (WASD/arrows)
  lastSeen: number;
  streak: { count: number; lastDay: string };
  // Runtime (not persisted).
  surgeMult: number; // active Data Surge packet multiplier (1 when inactive)
  surgeActive: boolean;
  onchainEnabled: boolean; // server has Solana anchoring on (gates /complete reports)
  steerIndex: number; // which active courier manual steering controls
  sessionScore: number; // ranked leaderboard points earned this session (server-validated)
  scoreToast: { scored: number; nonce: number } | null;
  dispatches: ActiveDispatch[];
  lastResult: DispatchResult | null;
  achievementToast: { name: string; reward: number } | null;
  offlineToast: number | null;
  streakToast: { bonus: number; count: number } | null;
  hydrated: boolean; // true once server state (or local fallback) is loaded
  panelOpen: boolean;
  shopOpen: boolean;
  leaderboardOpen: boolean;
  labOpen: boolean;
  goalsOpen: boolean;

  startDispatch: (d: ActiveDispatch) => boolean;
  collectPacket: (dispatchId: string, index: number, opts?: { combo?: number; rare?: boolean }) => void;
  completeDispatch: (dispatchId: string) => void;
  cancelDispatch: (dispatchId: string) => void;
  doPrestige: () => void;
  buyUpgrade: (def: UpgradeDef) => boolean;
  unlockAchievement: (a: Achievement) => void;
  setAuto: (v: boolean) => void;
  unlockAuto: () => boolean; // buy auto-dispatch with Data
  spendAutoFuel: () => boolean; // burn fuel for one auto-dispatch; false if broke
  setManual: (v: boolean) => void;
  cycleSteer: () => void; // pick the next active courier to steer
  reportScore: (scored: number) => void; // record server-validated leaderboard points
  clearScoreToast: () => void;
  setSurge: (active: boolean, mult: number) => void;
  applyOffline: (runningAgents: number) => void;
  touchSeen: () => void;
  claimDaily: () => void;
  clearStreakToast: () => void;
  grantSkin: (id: string) => void;
  buyWithData: (skin: DispatchSkin) => boolean;
  equipSkin: (id: string) => void;
  setPanelOpen: (v: boolean) => void;
  setShopOpen: (v: boolean) => void;
  setLeaderboardOpen: (v: boolean) => void;
  setLabOpen: (v: boolean) => void;
  setGoalsOpen: (v: boolean) => void;
  setHydrated: (v: boolean) => void;
  setOnchainEnabled: (v: boolean) => void;
  hydrateFromServer: (s: Partial<DispatchState>) => void;
  clearResult: () => void;
  clearAchievementToast: () => void;
  clearOfflineToast: () => void;
}

export const useDispatchStore = create<DispatchState>()(
  persist(
    (set, get) => ({
      data: 0,
      xp: 0,
      prestige: 0,
      frameworkData: {},
      upgrades: {},
      ownedSkins: ['default'],
      equippedSkin: 'default',
      stats: { dispatches: 0, packets: 0 },
      achieved: [],
      autoDispatch: false,
      autoUnlocked: false,
      manualControl: false,
      lastSeen: 0,
      streak: { count: 0, lastDay: '' },
      surgeMult: 1,
      surgeActive: false,
      onchainEnabled: false,
      steerIndex: 0,
      sessionScore: 0,
      scoreToast: null,
      dispatches: [],
      lastResult: null,
      achievementToast: null,
      offlineToast: null,
      streakToast: null,
      hydrated: false,
      panelOpen: false,
      shopOpen: false,
      leaderboardOpen: false,
      labOpen: false,
      goalsOpen: false,

      startDispatch: (d) => {
        const { dispatches, upgrades } = get();
        // The Ops Center upgrade is the only cap on concurrent couriers. An agent
        // can fly more than one courier at once so the upgrade still grants real
        // slots even when you own fewer agents than slots (caller prefers idle
        // agents first; reuse only fills the remaining slots).
        if (dispatches.length >= upgradeEffects(upgrades).maxSlots) return false;
        set({ dispatches: [...dispatches, d] });
        return true;
      },

      collectPacket: (dispatchId, index, opts) => {
        const { dispatches, data, xp, prestige, frameworkData, upgrades, stats, surgeMult } = get();
        const dispatch = dispatches.find((d) => d.id === dispatchId);
        if (!dispatch) return;
        const packet = dispatch.packets[index];
        if (!packet || packet.collected) return;
        packet.collected = true;
        const pMult = prestigeMultiplier(prestige);
        const payMult = upgradeEffects(upgrades).payoutMult;
        const combo = Math.max(1, opts?.combo ?? 1);
        const rare = opts?.rare ? RARE_PACKET_MULT : 1;
        const gained = Math.round(PACKET_DATA * rare * combo * payMult * pMult * surgeMult);
        set({
          data: data + gained,
          xp: xp + Math.round(PACKET_XP * combo * pMult * dispatch.xpMult),
          frameworkData: {
            ...frameworkData,
            [dispatch.framework]: (frameworkData[dispatch.framework] ?? 0) + gained,
          },
          stats: { ...stats, packets: stats.packets + 1 },
          dispatches: dispatches.map((d) =>
            d.id === dispatchId
              ? { ...d, collected: d.collected + 1, packets: [...d.packets] }
              : d,
          ),
        });
      },

      completeDispatch: (dispatchId) => {
        const { dispatches, data, xp, prestige, frameworkData, upgrades, stats } = get();
        const dispatch = dispatches.find((d) => d.id === dispatchId);
        if (!dispatch) return;
        const mult = prestigeMultiplier(prestige);
        const reward = Math.round(dispatch.baseReward * upgradeEffects(upgrades).payoutMult * mult);
        const newData = data + reward;
        const newXp = xp + Math.round(COMPLETE_XP * mult * dispatch.xpMult);
        const newLevel = levelInfo(newXp).level;
        const leveledTo = newLevel > dispatch.startLevel ? newLevel : null;
        set({
          data: newData,
          xp: newXp,
          frameworkData: {
            ...frameworkData,
            [dispatch.framework]: (frameworkData[dispatch.framework] ?? 0) + reward,
          },
          stats: { ...stats, dispatches: stats.dispatches + 1 },
          dispatches: dispatches.filter((d) => d.id !== dispatchId),
          lastResult: {
            agentName: dispatch.agentName,
            destName: dispatch.destName,
            dataEarned: Math.round((dispatch.collected * PACKET_DATA + dispatch.baseReward) * mult),
            xpEarned: Math.round((dispatch.collected * PACKET_XP + COMPLETE_XP) * mult * dispatch.xpMult),
            leveledTo,
            at: Date.now(),
          },
        });
      },

      cancelDispatch: (dispatchId) =>
        set({ dispatches: get().dispatches.filter((d) => d.id !== dispatchId) }),

      doPrestige: () => {
        const { xp, prestige } = get();
        if (levelInfo(xp).level < PRESTIGE_LEVEL) return;
        // Level resets; Data, skins, upgrades and lifetime framework totals stay.
        set({ xp: 0, prestige: prestige + 1 });
      },

      buyUpgrade: (def) => {
        const { data, upgrades } = get();
        const level = upgrades[def.id] ?? 0;
        if (level >= def.maxLevel) return false;
        const cost = upgradeCost(def, level);
        if (data < cost) return false;
        set({ data: data - cost, upgrades: { ...upgrades, [def.id]: level + 1 } });
        return true;
      },

      unlockAchievement: (a) => {
        const { achieved, data } = get();
        if (achieved.includes(a.id)) return;
        set({
          achieved: [...achieved, a.id],
          data: data + a.reward,
          achievementToast: { name: a.name, reward: a.reward },
        });
      },

      setAuto: (v) => set({ autoDispatch: v }),
      unlockAuto: () => {
        const { data, autoUnlocked } = get();
        if (autoUnlocked) return true;
        if (data < AUTO_UNLOCK_COST) return false;
        set({ data: data - AUTO_UNLOCK_COST, autoUnlocked: true, autoDispatch: true });
        return true;
      },
      spendAutoFuel: () => {
        const { data } = get();
        if (data < AUTO_FUEL_COST) return false;
        set({ data: data - AUTO_FUEL_COST });
        return true;
      },
      setManual: (v) => set({ manualControl: v }),
      cycleSteer: () =>
        set((s) => ({ steerIndex: s.dispatches.length > 0 ? (s.steerIndex + 1) % s.dispatches.length : 0 })),
      reportScore: (scored) => {
        if (scored <= 0) return; // rate-limited / cooldown — leave the stat unchanged
        set((s) => ({
          sessionScore: s.sessionScore + scored,
          scoreToast: { scored, nonce: (s.scoreToast?.nonce ?? 0) + 1 },
        }));
      },
      clearScoreToast: () => set({ scoreToast: null }),
      setSurge: (active, mult) => set({ surgeActive: active, surgeMult: active ? mult : 1 }),

      applyOffline: (runningAgents) => {
        const { lastSeen, autoDispatch, autoUnlocked, data } = get();
        if (!autoUnlocked || !autoDispatch || lastSeen === 0 || runningAgents === 0) {
          set({ lastSeen: Date.now() });
          return;
        }
        const secAway = Math.min(OFFLINE_CAP_SEC, (Date.now() - lastSeen) / 1000);
        const earned = Math.floor(secAway * OFFLINE_RATE_PER_AGENT * runningAgents);
        set({
          lastSeen: Date.now(),
          data: earned > 0 ? data + earned : data,
          offlineToast: earned > 30 ? earned : null,
        });
      },

      touchSeen: () => set({ lastSeen: Date.now() }),

      claimDaily: () => {
        const today = todayKey();
        const { streak, data } = get();
        if (streak.lastDay === today) return;
        const count = streak.lastDay === yesterdayKey() ? streak.count + 1 : 1;
        const bonus = DAILY_BASE * Math.min(count, DAILY_MAX_MULT);
        set({ data: data + bonus, streak: { count, lastDay: today }, streakToast: { bonus, count } });
      },

      clearStreakToast: () => set({ streakToast: null }),

      grantSkin: (id) => {
        const { ownedSkins } = get();
        if (ownedSkins.includes(id)) return;
        set({ ownedSkins: [...ownedSkins, id] });
      },

      buyWithData: (skin) => {
        const { data, ownedSkins } = get();
        if (ownedSkins.includes(skin.id) || skin.currency !== 'data' || data < skin.price) {
          return false;
        }
        set({ data: data - skin.price, ownedSkins: [...ownedSkins, skin.id] });
        return true;
      },

      equipSkin: (id) => {
        if (!get().ownedSkins.includes(id)) return;
        set({ equippedSkin: id });
      },

      setPanelOpen: (v) => set({ panelOpen: v }),
      setShopOpen: (v) => set({ shopOpen: v }),
      setLeaderboardOpen: (v) => set({ leaderboardOpen: v }),
      setLabOpen: (v) => set({ labOpen: v }),
      setGoalsOpen: (v) => set({ goalsOpen: v }),
      setHydrated: (v) => set({ hydrated: v }),
      setOnchainEnabled: (v) => set({ onchainEnabled: v }),
      hydrateFromServer: (s) => set({ ...s }),
      clearResult: () => set({ lastResult: null }),
      clearAchievementToast: () => set({ achievementToast: null }),
      clearOfflineToast: () => set({ offlineToast: null }),
    }),
    {
      name: 'hatcher-dispatch-v1',
      partialize: (s) => ({
        data: s.data,
        xp: s.xp,
        prestige: s.prestige,
        frameworkData: s.frameworkData,
        upgrades: s.upgrades,
        ownedSkins: s.ownedSkins,
        equippedSkin: s.equippedSkin,
        stats: s.stats,
        achieved: s.achieved,
        autoDispatch: s.autoDispatch,
        autoUnlocked: s.autoUnlocked,
        manualControl: s.manualControl,
        lastSeen: s.lastSeen,
        streak: s.streak,
      }),
    },
  ),
);
