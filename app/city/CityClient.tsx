'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '@/lib/config';
import { CityHud } from '@/components/city/CityHud';
import { CitySound, type CitySoundControls } from '@/components/city/CitySound';
import { CityReplay, type ReplayOverlay } from '@/components/city/CityReplay';
import {
  CityFilters,
  type FilterState,
  applyFilters,
  defaultFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
} from '@/components/city/CityFilters';
import type { CitySceneHandle } from '@/components/city/CityScene';
import type { CityAgent, CityResponse, Category } from '@/components/city/types';
import { CATEGORIES } from '@/components/city/types';

const CityScene = dynamic(
  () => import('@/components/city/CityScene').then((m) => m.CityScene),
  { ssr: false },
);

interface Props {
  initial: CityResponse | null;
}

export function CityClient({ initial }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CityResponse | null>(initial);
  const [hovered, setHovered] = useState<CityAgent | null>(null);
  const [replayOverlay, setReplayOverlay] = useState<ReplayOverlay | null>(null);
  const sceneRef = useRef<CitySceneHandle | null>(null);
  const soundRef = useRef<CitySoundControls | null>(null);

  // ── Filters, seeded from URL ──
  const [filters, setFilters] = useState<FilterState>(() =>
    filtersFromSearchParams(new URLSearchParams(searchParams?.toString() ?? '')),
  );

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

  // Even when initial SSR succeeded, the server-rendered payload always
  // has mine=false (no JWT cookie on the server fetch). Re-hydrate once
  // on the client with credentials so owner agents light up gold.
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

  // Live-ish refresh: poll every 20s for status/count changes so the
  // city stays in sync with the fleet without us building a dedicated
  // WebSocket channel. Backend caches /public/city for 60s, so the
  // hot path is a single Redis read — cheap at scale.
  useEffect(() => {
    const POLL_MS = 20_000;
    const timer = setInterval(() => {
      if (document.hidden) return; // skip while tab is backgrounded
      fetch(`${API_URL}/public/city`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { success?: boolean; data?: CityResponse } | null) => {
          if (j?.success && j.data) setData(j.data);
        })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  // Sync filter state back to the URL so copy-paste shares the same view.
  useEffect(() => {
    const next = filtersToSearchParams(filters).toString();
    const current = searchParams?.toString() ?? '';
    // Preserve focus/agent deep-link params that aren't owned by filters.
    const preserved = new URLSearchParams(current);
    ['fw', 'status', 'tier', 'mine'].forEach((k) => preserved.delete(k));
    const merged = new URLSearchParams([
      ...filtersToSearchParams(filters).entries(),
      ...preserved.entries(),
    ]);
    const q = merged.toString();
    router.replace(q ? `/city?${q}` : '/city', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ── Deep-link focus on load ──
  // ?agent=<id|slug>  → fly to building + open hover card
  // ?focus=<category> → fly to district
  useEffect(() => {
    if (!data) return;
    const agentParam = searchParams?.get('agent');
    const focusParam = searchParams?.get('focus');
    const timer = setTimeout(() => {
      if (agentParam) {
        const a = data.agents.find((x) => x.id === agentParam || x.slug === agentParam);
        if (a) {
          sceneRef.current?.flyToAgent(a.id, 1400);
          setHovered(a);
          return;
        }
      }
      if (focusParam && CATEGORIES.includes(focusParam as Category)) {
        sceneRef.current?.flyToDistrict(focusParam as Category, 1400);
      }
    }, 400); // let canvas + scene API mount first
    return () => clearTimeout(timer);
    // Only runs once per data load; we explicitly don't want to refly on
    // every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const filteredAgents = useMemo(() => {
    if (!data) return [];
    const base = applyFilters(data.agents, filters);
    // When scrubbing the replay, override each agent's status from the
    // historical snapshot. Unknown agents in that hour keep their live
    // status — they may not have existed yet.
    if (!replayOverlay) return base;
    return base.map((a) => {
      const historical = replayOverlay.statuses[a.id];
      return historical ? { ...a, status: historical } : a;
    });
  }, [data, filters, replayOverlay]);

  const mineAgents = useMemo(
    () => (data?.agents ?? []).filter((a) => a.mine),
    [data],
  );

  const flyToDistrict = useCallback((c: Category) => {
    sceneRef.current?.flyToDistrict(c);
    soundRef.current?.chirp('tour');
  }, []);

  const flyHome = useCallback(() => {
    sceneRef.current?.flyHome();
    soundRef.current?.chirp('click');
  }, []);

  const onHoverWithSound = useCallback((a: CityAgent | null) => {
    if (a) soundRef.current?.chirp('hover');
    setHovered(a);
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
        agents={filteredAgents}
        onHover={onHoverWithSound}
        onPick={(a) => {
          soundRef.current?.chirp('click');
          router.push(`/agent/${a.id}`);
        }}
      />
      <CityFilters
        filters={filters}
        onChange={setFilters}
        counts={data.counts}
        hasMine={mineAgents.length > 0}
      />
      <CityHud
        counts={data.counts}
        hovered={hovered}
        mineAgents={mineAgents}
        onFlyToDistrict={flyToDistrict}
        onFlyHome={flyHome}
      />
      <CityReplay baseAgents={data.agents} onOverlay={setReplayOverlay} />
      <CitySound onReady={(api) => (soundRef.current = api)} />
    </div>
  );
}
