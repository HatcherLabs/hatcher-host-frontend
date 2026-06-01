'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type ActiveDispatch,
  type DispatchResult,
  type DispatchSkin,
  levelInfo,
  prestigeMultiplier,
  PRESTIGE_LEVEL,
  PACKET_DATA,
  PACKET_XP,
  COMPLETE_XP,
} from './config';

const MAX_CONCURRENT = 5;

interface DispatchState {
  // Progression (persisted).
  data: number;
  xp: number;
  prestige: number;
  frameworkData: Record<string, number>; // lifetime Data per framework (leaderboard)
  ownedSkins: string[];
  equippedSkin: string;
  // Runtime (not persisted).
  dispatches: ActiveDispatch[];
  lastResult: DispatchResult | null;
  panelOpen: boolean;
  shopOpen: boolean;
  leaderboardOpen: boolean;

  startDispatch: (d: ActiveDispatch) => boolean;
  collectPacket: (dispatchId: string, index: number) => void;
  completeDispatch: (dispatchId: string) => void;
  cancelDispatch: (dispatchId: string) => void;
  doPrestige: () => void;
  grantSkin: (id: string) => void;
  buyWithData: (skin: DispatchSkin) => boolean;
  equipSkin: (id: string) => void;
  setPanelOpen: (v: boolean) => void;
  setShopOpen: (v: boolean) => void;
  setLeaderboardOpen: (v: boolean) => void;
  clearResult: () => void;
}

export const useDispatchStore = create<DispatchState>()(
  persist(
    (set, get) => ({
      data: 0,
      xp: 0,
      prestige: 0,
      frameworkData: {},
      ownedSkins: ['default'],
      equippedSkin: 'default',
      dispatches: [],
      lastResult: null,
      panelOpen: false,
      shopOpen: false,
      leaderboardOpen: false,

      startDispatch: (d) => {
        const { dispatches } = get();
        if (dispatches.length >= MAX_CONCURRENT) return false;
        if (dispatches.some((x) => x.agentId === d.agentId)) return false; // one run per agent
        set({ dispatches: [...dispatches, d] });
        return true;
      },

      collectPacket: (dispatchId, index) => {
        const { dispatches, data, xp, prestige, frameworkData } = get();
        const dispatch = dispatches.find((d) => d.id === dispatchId);
        if (!dispatch) return;
        const packet = dispatch.packets[index];
        if (!packet || packet.collected) return;
        packet.collected = true;
        const mult = prestigeMultiplier(prestige);
        const gained = Math.round(PACKET_DATA * mult);
        set({
          data: data + gained,
          xp: xp + Math.round(PACKET_XP * mult),
          frameworkData: {
            ...frameworkData,
            [dispatch.framework]: (frameworkData[dispatch.framework] ?? 0) + gained,
          },
          dispatches: dispatches.map((d) =>
            d.id === dispatchId
              ? { ...d, collected: d.collected + 1, packets: [...d.packets] }
              : d,
          ),
        });
      },

      completeDispatch: (dispatchId) => {
        const { dispatches, data, xp, prestige, frameworkData } = get();
        const dispatch = dispatches.find((d) => d.id === dispatchId);
        if (!dispatch) return;
        const mult = prestigeMultiplier(prestige);
        const reward = Math.round(dispatch.baseReward * mult);
        const newData = data + reward;
        const newXp = xp + Math.round(COMPLETE_XP * mult);
        const newLevel = levelInfo(newXp).level;
        const leveledTo = newLevel > dispatch.startLevel ? newLevel : null;
        set({
          data: newData,
          xp: newXp,
          frameworkData: {
            ...frameworkData,
            [dispatch.framework]: (frameworkData[dispatch.framework] ?? 0) + reward,
          },
          dispatches: dispatches.filter((d) => d.id !== dispatchId),
          lastResult: {
            agentName: dispatch.agentName,
            destName: dispatch.destName,
            dataEarned: Math.round((dispatch.collected * PACKET_DATA + dispatch.baseReward) * mult),
            xpEarned: Math.round((dispatch.collected * PACKET_XP + COMPLETE_XP) * mult),
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
        // Level resets; Data, skins and lifetime framework totals are kept.
        set({ xp: 0, prestige: prestige + 1 });
      },

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
      clearResult: () => set({ lastResult: null }),
    }),
    {
      name: 'hatcher-dispatch-v1',
      partialize: (s) => ({
        data: s.data,
        xp: s.xp,
        prestige: s.prestige,
        frameworkData: s.frameworkData,
        ownedSkins: s.ownedSkins,
        equippedSkin: s.equippedSkin,
      }),
    },
  ),
);
