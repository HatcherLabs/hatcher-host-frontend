'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type ActiveDispatch,
  type DispatchResult,
  type DispatchSkin,
  levelInfo,
  PACKET_DATA,
  PACKET_XP,
  COMPLETE_XP,
} from './config';

const MAX_CONCURRENT = 5;

interface DispatchState {
  // Progression (persisted).
  data: number;
  xp: number;
  ownedSkins: string[];
  equippedSkin: string;
  // Runtime (not persisted).
  dispatches: ActiveDispatch[];
  lastResult: DispatchResult | null;
  panelOpen: boolean;
  shopOpen: boolean;

  startDispatch: (d: ActiveDispatch) => boolean;
  collectPacket: (dispatchId: string, index: number) => void;
  completeDispatch: (dispatchId: string) => void;
  cancelDispatch: (dispatchId: string) => void;
  grantSkin: (id: string) => void;
  buyWithData: (skin: DispatchSkin) => boolean;
  equipSkin: (id: string) => void;
  setPanelOpen: (v: boolean) => void;
  setShopOpen: (v: boolean) => void;
  clearResult: () => void;
}

export const useDispatchStore = create<DispatchState>()(
  persist(
    (set, get) => ({
      data: 0,
      xp: 0,
      ownedSkins: ['default'],
      equippedSkin: 'default',
      dispatches: [],
      lastResult: null,
      panelOpen: false,
      shopOpen: false,

      startDispatch: (d) => {
        const { dispatches } = get();
        if (dispatches.length >= MAX_CONCURRENT) return false;
        if (dispatches.some((x) => x.agentId === d.agentId)) return false; // one run per agent
        set({ dispatches: [...dispatches, d] });
        return true;
      },

      collectPacket: (dispatchId, index) => {
        const { dispatches, data, xp } = get();
        const dispatch = dispatches.find((d) => d.id === dispatchId);
        if (!dispatch) return;
        const packet = dispatch.packets[index];
        if (!packet || packet.collected) return;
        packet.collected = true;
        set({
          data: data + PACKET_DATA,
          xp: xp + PACKET_XP,
          dispatches: dispatches.map((d) =>
            d.id === dispatchId
              ? { ...d, collected: d.collected + 1, packets: [...d.packets] }
              : d,
          ),
        });
      },

      completeDispatch: (dispatchId) => {
        const { dispatches, data, xp } = get();
        const dispatch = dispatches.find((d) => d.id === dispatchId);
        if (!dispatch) return;
        const newData = data + dispatch.baseReward;
        const newXp = xp + COMPLETE_XP;
        const newLevel = levelInfo(newXp).level;
        const leveledTo = newLevel > dispatch.startLevel ? newLevel : null;
        set({
          data: newData,
          xp: newXp,
          dispatches: dispatches.filter((d) => d.id !== dispatchId),
          lastResult: {
            agentName: dispatch.agentName,
            destName: dispatch.destName,
            dataEarned: dispatch.collected * PACKET_DATA + dispatch.baseReward,
            xpEarned: dispatch.collected * PACKET_XP + COMPLETE_XP,
            leveledTo,
            at: Date.now(),
          },
        });
      },

      cancelDispatch: (dispatchId) =>
        set({ dispatches: get().dispatches.filter((d) => d.id !== dispatchId) }),

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
      clearResult: () => set({ lastResult: null }),
    }),
    {
      name: 'hatcher-dispatch-v1',
      partialize: (s) => ({
        data: s.data,
        xp: s.xp,
        ownedSkins: s.ownedSkins,
        equippedSkin: s.equippedSkin,
      }),
    },
  ),
);
