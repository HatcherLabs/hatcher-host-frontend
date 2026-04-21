'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '@/lib/config';
import { CityHud } from '@/components/city/CityHud';
import type { CitySceneHandle } from '@/components/city/CityScene';
import type { CityAgent, CityResponse, Category } from '@/components/city/types';

// Three.js must only run client-side; keep it out of the SSR bundle.
const CityScene = dynamic(
  () => import('@/components/city/CityScene').then((m) => m.CityScene),
  { ssr: false },
);

interface Props {
  initial: CityResponse | null;
}

export function CityClient({ initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CityResponse | null>(initial);
  const [hovered, setHovered] = useState<CityAgent | null>(null);
  const sceneRef = useRef<CitySceneHandle | null>(null);

  useEffect(() => {
    if (initial && initial.agents.length) return;
    fetch(`${API_URL}/public/city`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { success?: boolean; data?: CityResponse } | null) => {
        if (j?.success && j.data) setData(j.data);
      })
      .catch(() => {
        /* noop */
      });
  }, [initial]);

  const mineAgents = useMemo(() => (data?.agents ?? []).filter((a) => a.mine), [data]);

  const flyToDistrict = useCallback((c: Category) => {
    sceneRef.current?.flyToDistrict(c);
  }, []);

  const flyHome = useCallback(() => {
    sceneRef.current?.flyHome();
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#050814] font-['Press_Start_2P',monospace] tracking-[3px] text-amber-400">
        LOADING HATCHER CITY…
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px] overflow-hidden bg-[#050814]">
      <CityScene
        ref={sceneRef}
        agents={data.agents}
        onHover={setHovered}
        onPick={(a) => router.push(`/agent/${a.id}`)}
      />
      <CityHud
        counts={data.counts}
        hovered={hovered}
        mineAgents={mineAgents}
        onFlyToDistrict={flyToDistrict}
        onFlyHome={flyHome}
      />
    </div>
  );
}
