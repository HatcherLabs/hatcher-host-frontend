'use client';
import { useEffect, useRef } from 'react';
import { API_URL } from '@/lib/config';
import { useDispatchStore } from './store';

interface GameStateBlob {
  data: number;
  xp: number;
  prestige: number;
  frameworkData: Record<string, number>;
  upgrades: Record<string, number>;
  ownedSkins: string[];
  equippedSkin: string;
  stats: { dispatches: number; packets: number };
  achieved: string[];
  autoDispatch: boolean;
  streak: { count: number; lastDay: string };
  lastSeen: number;
}

async function fetchDispatchState(): Promise<GameStateBlob | null> {
  try {
    const res = await fetch(`${API_URL}/dispatch/state`, { credentials: 'include' });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { state?: GameStateBlob | null } };
    return json?.data?.state ?? null;
  } catch {
    return null;
  }
}

async function saveDispatchState(state: GameStateBlob): Promise<void> {
  try {
    await fetch(`${API_URL}/dispatch/state`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
  } catch {
    /* signed out / offline — ignore */
  }
}

function snapshot(): GameStateBlob {
  const s = useDispatchStore.getState();
  return {
    data: s.data,
    xp: s.xp,
    prestige: s.prestige,
    frameworkData: s.frameworkData,
    upgrades: s.upgrades as Record<string, number>,
    ownedSkins: s.ownedSkins,
    equippedSkin: s.equippedSkin,
    stats: s.stats,
    achieved: s.achieved,
    autoDispatch: s.autoDispatch,
    streak: s.streak,
    lastSeen: s.lastSeen,
  };
}

/**
 * Makes the backend the source of truth: on mount, adopt the server's saved
 * game (when signed in); thereafter debounce-save progression back. Sets the
 * store's `hydrated` flag so the daily/offline effects don't run on stale local
 * data first.
 */
export function useDispatchStateSync() {
  const hydrateFromServer = useDispatchStore((s) => s.hydrateFromServer);
  const setHydrated = useDispatchStore((s) => s.setHydrated);

  useEffect(() => {
    let alive = true;
    fetchDispatchState().then((server) => {
      if (!alive) return;
      if (server && typeof server.xp === 'number') {
        hydrateFromServer({
          data: server.data ?? 0,
          xp: server.xp ?? 0,
          prestige: server.prestige ?? 0,
          frameworkData: server.frameworkData ?? {},
          upgrades: server.upgrades ?? {},
          ownedSkins: server.ownedSkins ?? ['default'],
          equippedSkin: server.equippedSkin ?? 'default',
          stats: server.stats ?? { dispatches: 0, packets: 0 },
          achieved: server.achieved ?? [],
          autoDispatch: !!server.autoDispatch,
          streak: server.streak ?? { count: 0, lastDay: '' },
          lastSeen: server.lastSeen ?? 0,
        });
      }
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, [hydrateFromServer, setHydrated]);

  // Debounced save of progression once hydrated.
  const hydrated = useDispatchStore((s) => s.hydrated);
  const data = useDispatchStore((s) => s.data);
  const xp = useDispatchStore((s) => s.xp);
  const prestige = useDispatchStore((s) => s.prestige);
  const upgrades = useDispatchStore((s) => s.upgrades);
  const ownedSkins = useDispatchStore((s) => s.ownedSkins);
  const equippedSkin = useDispatchStore((s) => s.equippedSkin);
  const stats = useDispatchStore((s) => s.stats);
  const achieved = useDispatchStore((s) => s.achieved);
  const autoDispatch = useDispatchStore((s) => s.autoDispatch);
  const streak = useDispatchStore((s) => s.streak);
  const frameworkData = useDispatchStore((s) => s.frameworkData);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveDispatchState(snapshot()), 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hydrated, data, xp, prestige, upgrades, ownedSkins, equippedSkin, stats, achieved, autoDispatch, streak, frameworkData]);
}
