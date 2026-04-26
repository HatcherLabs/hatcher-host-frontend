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
}

/**
 * Fetches the live city snapshot and renders an "X agents online" line.
 * Hidden entirely if count is below MIN_THRESHOLD (avoids showing "1 agent
 * online" which reads as empty).
 *
 * Endpoint adapted from the api-repo `/agents/snapshot` route registered
 * under apps/api/src/routes/agents/index.ts. If the schema changes, the
 * SnapshotResponse fallback chain (online → agents → count → total) keeps
 * this component silent rather than crashing.
 */
export function LiveCityCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
    fetch(`${apiBase}/agents/snapshot`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SnapshotResponse | null) => {
        if (cancelled || !data) return;
        const n = data.online ?? data.agents ?? data.count ?? data.total ?? 0;
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
