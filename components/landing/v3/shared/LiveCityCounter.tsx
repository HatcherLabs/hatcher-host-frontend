// components/landing/v3/shared/LiveCityCounter.tsx
'use client';

import { useEffect, useState } from 'react';
import styles from './LiveCityCounter.module.css';

const MIN_THRESHOLD = 10;

interface SnapshotResponse {
  online?: number;
  agents?: number;
  count?: number;
  total?: number;
  running?: number;
  counts?: {
    running?: number;
    total?: number;
  };
  success?: boolean;
  data?: {
    counts?: {
      running?: number;
      total?: number;
    };
  };
}

/**
 * Fetches the live city snapshot and renders an "X agents online" line.
 * Hidden entirely if count is below MIN_THRESHOLD (avoids showing "1 agent
 * online" which reads as empty).
 *
 * Endpoint adapted from the public city payload. If the schema changes, the
 * SnapshotResponse fallback chain keeps this component silent rather than
 * crashing.
 */
export function LiveCityCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
    fetch(`${apiBase}/public/city`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SnapshotResponse | null) => {
        if (cancelled || !data) return;
        const n =
          data.data?.counts?.running ??
          data.counts?.running ??
          data.running ??
          data.online ??
          data.agents ??
          data.count ??
          data.data?.counts?.total ??
          data.counts?.total ??
          data.total ??
          0;
        setCount(typeof n === 'number' ? n : 0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (count === null || count < MIN_THRESHOLD) return null;

  return (
    <div className={styles.line}>
      <span className={styles.pip} aria-hidden />
      LIVE · {count} agents online
    </div>
  );
}
