'use client';
import { useCallback, useEffect, useState } from 'react';
import type { StationId } from '../world/layout';

export type PanelId = StationId;

export function usePanelState() {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const close = useCallback(() => setOpenPanel(null), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { openPanel, setOpenPanel, close };
}
