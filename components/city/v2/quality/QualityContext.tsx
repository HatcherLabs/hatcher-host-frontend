'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { detectQuality, type Quality } from './detect';

interface Ctx {
  quality: Quality;
  setQuality: (q: Quality | 'auto') => void;
  override: Quality | 'auto';
}

const QualityContext = createContext<Ctx>({
  quality: 'low',
  setQuality: () => {},
  override: 'auto',
});

export function QualityProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<Quality | 'auto'>('auto');
  const [quality, setQualityState] = useState<Quality>('low');

  // Resolve on mount — detectQuality needs window/navigator which are
  // undefined during SSR.
  useEffect(() => {
    let storedOverride: Quality | 'auto' = 'auto';
    try {
      const stored = localStorage.getItem('cityQualityOverride');
      if (stored === 'high' || stored === 'low' || stored === 'auto') {
        storedOverride = stored;
      }
    } catch {
      // localStorage unavailable (private mode) → stay auto
    }
    setOverride(storedOverride);
    setQualityState(storedOverride === 'auto' ? detectQuality() : storedOverride);
  }, []);

  const setQuality = (q: Quality | 'auto') => {
    setOverride(q);
    try {
      localStorage.setItem('cityQualityOverride', q);
    } catch {
      // ignore
    }
    setQualityState(q === 'auto' ? detectQuality() : q);
  };

  return (
    <QualityContext.Provider value={{ quality, setQuality, override }}>
      {children}
    </QualityContext.Provider>
  );
}

export function useQuality(): Quality {
  return useContext(QualityContext).quality;
}

export function useQualityControl() {
  return useContext(QualityContext);
}
