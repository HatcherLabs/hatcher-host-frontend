'use client';

import { useCallback, useEffect, useState } from 'react';

const LS_KEY = 'hatcher-city:favorites:v1';

function readFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeToStorage(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch {
    /* quota, private-mode, etc. — silently give up */
  }
}

/** Simple localStorage-backed Set<agentId> with cross-tab sync. */
export function useCityFavorites() {
  const [ids, setIds] = useState<Set<string>>(() => new Set(readFromStorage()));

  // Sync across tabs — if another tab pins or unpins, this one reflects.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== LS_KEY) return;
      setIds(new Set(readFromStorage()));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeToStorage([...next]);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return { ids, toggle, has };
}
