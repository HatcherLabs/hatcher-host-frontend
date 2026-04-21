'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/lib/config';
import { CityHud } from '@/components/city/CityHud';
import type { CityAgent, CityResponse } from '@/components/city/types';

// Three.js must only run client-side; keep it out of the SSR bundle.
const CityScene = dynamic(
  () => import('@/components/city/CityScene').then(m => m.CityScene),
  { ssr: false },
);

interface Props {
  initial: CityResponse | null;
}

export function CityClient({ initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CityResponse | null>(initial);
  const [hovered, setHovered] = useState<CityAgent | null>(null);

  // If the server-rendered fetch failed (e.g. static prerender) or we want
  // fresh "mine" flags after the user logs in, re-fetch on mount.
  useEffect(() => {
    if (initial && initial.agents.length) return;
    fetch(`${API_URL}/public/city`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((j: { success?: boolean; data?: CityResponse } | null) => {
        if (j?.success && j.data) setData(j.data);
      })
      .catch(() => { /* noop — scene handles empty agent list gracefully */ });
  }, [initial]);

  const mineAgents = useMemo(
    () => (data?.agents ?? []).filter(a => a.mine),
    [data],
  );

  if (!data) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#050814] font-['Press_Start_2P',monospace] tracking-[3px] text-amber-400">
        LOADING HATCHER CITY…
      </div>
    );
  }

  // Reserve space for the sticky site header (~57px). Footer sits
  // below the canvas in the normal document flow — users who want to
  // reach it can click outside the map and scroll normally.
  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px] overflow-hidden bg-[#050814]">
      <CityScene
        agents={data.agents}
        onHover={setHovered}
        onPick={(a) => router.push(`/agent/${a.id}`)}
      />
      <CityHud counts={data.counts} hovered={hovered} mineAgents={mineAgents} />
    </div>
  );
}
