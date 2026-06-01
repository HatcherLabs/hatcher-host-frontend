'use client';
import { useEffect, useRef } from 'react';
import { useDispatchStore } from './store';
import { levelInfo } from './config';
import { submitDispatchScore } from './leaderboard';

/**
 * Debounced upload of the viewer's progression to the leaderboard. Fires ~4s
 * after the last change; no-ops server-side when signed out.
 */
export function useDispatchScoreSync() {
  const data = useDispatchStore((s) => s.data);
  const xp = useDispatchStore((s) => s.xp);
  const prestige = useDispatchStore((s) => s.prestige);
  const frameworkData = useDispatchStore((s) => s.frameworkData);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data <= 0) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void submitDispatchScore({
        totalData: Math.round(data),
        level: levelInfo(xp).level,
        prestige,
        frameworkData,
      });
    }, 4000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, xp, prestige, frameworkData]);
}
