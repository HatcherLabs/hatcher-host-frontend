'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/config';
import type { CityAgent, CityResponse } from '@/components/city/types';

const CitySceneV2 = dynamic(
  () => import('@/components/city/v2/CitySceneV2').then((m) => m.CitySceneV2),
  { ssr: false },
);

interface Props {
  initial: CityResponse | null;
}

export function CityClient({ initial }: Props) {
  const [data, setData] = useState<CityResponse | null>(initial);
  // Track last-seen messageCount so we can spawn a ring pulse every
  // time an agent's tally ticks up between polls.
  const msgCountRef = useRef<Map<string, number>>(new Map());
  const [pulseAts, setPulseAts] = useState<Map<string, number>>(new Map());

  // Refresh on mount if SSR missed it (e.g. empty initial list).
  useEffect(() => {
    if (initial && initial.agents.length) return;
    fetch(`${API_URL}/public/city`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { success?: boolean; data?: CityResponse } | null) => {
        if (j?.success && j.data) setData(j.data);
      })
      .catch(() => {});
  }, [initial]);

  // SSR payload always has mine=false (no JWT cookie on the server fetch).
  // Re-hydrate once on the client with credentials so owner agents light
  // up gold.
  const hydratedMineRef = useRef(false);
  useEffect(() => {
    if (hydratedMineRef.current) return;
    hydratedMineRef.current = true;
    fetch(`${API_URL}/public/city`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { success?: boolean; data?: CityResponse } | null) => {
        if (j?.success && j.data?.viewerId) setData(j.data);
      })
      .catch(() => {});
  }, []);

  // Live-ish refresh: poll every 20s for status/count changes. Backend
  // caches /public/city for 60s, so the hot path is a single Redis read.
  useEffect(() => {
    const POLL_MS = 20_000;
    const timer = setInterval(() => {
      if (document.hidden) return;
      fetch(`${API_URL}/public/city`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { success?: boolean; data?: CityResponse } | null) => {
          if (j?.success && j.data) setData(j.data);
        })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  // Spawn an ActivityPulse ring whenever an agent's messageCount ticks
  // up between polls. Ring animations finish in ~1.8s; we drop the
  // entries after 2s so the scene doesn't keep replaying the same pulse.
  useEffect(() => {
    if (!data) return;
    const counts = msgCountRef.current;
    const pulses = new Map<string, number>();
    const now = performance.now();
    for (const a of data.agents as CityAgent[]) {
      const prev = counts.get(a.id);
      if (prev !== undefined && a.messageCount > prev) {
        pulses.set(a.id, now);
      }
      counts.set(a.id, a.messageCount);
    }
    if (pulses.size === 0) return;
    setPulseAts(pulses);
    const t = setTimeout(() => setPulseAts(new Map()), 2000);
    return () => clearTimeout(t);
  }, [data]);

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px] overflow-hidden bg-[#050814]">
      <CitySceneV2 agents={data?.agents ?? []} pulseAts={pulseAts} />
    </div>
  );
}
