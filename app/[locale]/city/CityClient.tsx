'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { API_URL } from '@/lib/config';
import { CityHud } from '@/components/city/CityHud';
import { CitySound, type CitySoundControls } from '@/components/city/CitySound';
import { CityReplay, type ReplayOverlay } from '@/components/city/CityReplay';
import { CityLeaderboard } from '@/components/city/CityLeaderboard';
import { CitySearch } from '@/components/city/CitySearch';
import { CityRadialMenu, type RadialMenuState } from '@/components/city/CityRadialMenu';
import { useCityFavorites } from '@/components/city/useCityFavorites';
import { CityOnboarding } from '@/components/city/CityOnboarding';
import {
  CityFilters,
  type FilterState,
  applyFilters,
  defaultFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
} from '@/components/city/CityFilters';
import type { CitySceneHandle, TimeOfDay } from '@/components/city/CityScene';
import type { CityAgent, CityResponse, Category } from '@/components/city/types';
import { CATEGORIES } from '@/components/city/types';

const CityScene = dynamic(
  () => import('@/components/city/CityScene').then((m) => m.CityScene),
  { ssr: false },
);

const CitySceneV2 = dynamic(
  () => import('@/components/city/v2/CitySceneV2').then((m) => m.CitySceneV2),
  { ssr: false },
);

const CITY_V2_FLAG = process.env.NEXT_PUBLIC_CITY_V2 === 'true';

interface Props {
  initial: CityResponse | null;
}

export function CityClient({ initial }: Props) {
  const t = useTranslations('city');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CityResponse | null>(initial);
  const [hovered, setHovered] = useState<CityAgent | null>(null);
  const [replayOverlay, setReplayOverlay] = useState<ReplayOverlay | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('auto');
  const [heatmapOn, setHeatmapOn] = useState(false);
  // Agents that weren't in the previous poll snapshot get tagged as
  // "fresh" so the scene plays the rise-from-ground animation. We also
  // clear them after a couple seconds so filters don't retrigger it.
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  // Track last-seen messageCount so we can spawn a ring pulse every
  // time an agent's tally ticks up between polls.
  const msgCountRef = useRef<Map<string, number>>(new Map());
  const [pulseAts, setPulseAts] = useState<Map<string, number>>(new Map());
  const [radial, setRadial] = useState<RadialMenuState | null>(null);
  const favorites = useCityFavorites();
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

  // Track which agents are "freshly arrived" — anything in the current
  // payload we hadn't seen in our session before. Skip the very first
  // hydration so we don't grow-in 718 buildings on page load.
  useEffect(() => {
    if (!data) return;
    const seen = seenIdsRef.current;
    const bootstrap = seen.size === 0;
    const fresh = new Set<string>();
    const pulses = new Map<string, number>();
    const now = performance.now();
    const counts = msgCountRef.current;

    for (const a of data.agents) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        if (!bootstrap) fresh.add(a.id);
      }
      const prev = counts.get(a.id);
      if (prev !== undefined && a.messageCount > prev) {
        pulses.set(a.id, now);
      }
      counts.set(a.id, a.messageCount);
    }
    if (fresh.size > 0) {
      setFreshIds(fresh);
      const t = setTimeout(() => setFreshIds(new Set()), 2000);
      if (pulses.size > 0) setPulseAts(pulses);
      return () => clearTimeout(t);
    }
    if (pulses.size > 0) {
      setPulseAts(pulses);
      // Ring animations finish in ~1.8s; drop the entries so the scene
      // doesn't keep spamming the same pulse on re-render.
      const t = setTimeout(() => setPulseAts(new Map()), 2000);
      return () => clearTimeout(t);
    }
  }, [data]);

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

  const flyToAgent = useCallback((id: string) => {
    sceneRef.current?.flyToAgent(id);
    soundRef.current?.chirp('click');
  }, []);

  const flyHome = useCallback(() => {
    sceneRef.current?.flyHome();
    soundRef.current?.chirp('click');
  }, []);

  const onHoverWithSound = useCallback((a: CityAgent | null) => {
    if (a) soundRef.current?.chirp('hover');
    setHovered(a);
  }, []);

  const useV2 = CITY_V2_FLAG || searchParams.get('v') === '2';

  // V2 skeleton doesn't read the legacy data prop — render it early so
  // a missing/slow API doesn't block the new scene.
  if (useV2) {
    return (
      <div className="relative h-[calc(100vh-4rem)] min-h-[560px] overflow-hidden bg-[#050814]">
        <CitySceneV2 />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#050814] font-['Press_Start_2P',monospace] tracking-[3px] text-amber-400">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px] overflow-hidden bg-[#050814]">
      <CityScene
        ref={sceneRef}
        agents={filteredAgents}
        timeOfDay={timeOfDay}
        heatmapOn={heatmapOn}
        freshIds={freshIds}
        pulseAts={pulseAts}
        onHover={onHoverWithSound}
        onPick={(a) => {
          soundRef.current?.chirp('click');
          router.push(`/agent/${a.id}`);
        }}
        onContext={(agent, screen) =>
          setRadial({ agent, screenX: screen.x, screenY: screen.y })
        }
      />
      <CityRadialMenu
        state={radial}
        onClose={() => setRadial(null)}
        onOpen={(a) => router.push(`/agent/${a.id}`)}
        onRoom={(a) => router.push(`/agent/${a.id}/room`)}
        onFocus={(a) => flyToAgent(a.id)}
        onShare={(a) => {
          const url = `${window.location.origin}/city?agent=${a.id}`;
          try {
            navigator.clipboard.writeText(url);
          } catch {
            /* browsers that block clipboard without user gesture will noop */
          }
        }}
        onPin={(a) => favorites.toggle(a.id)}
        isPinned={radial ? favorites.has(radial.agent.id) : false}
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
        agents={data.agents}
        timeOfDay={timeOfDay}
        onTimeOfDayChange={setTimeOfDay}
        heatmapOn={heatmapOn}
        onHeatmapToggle={() => setHeatmapOn((v) => !v)}
        onFlyToDistrict={flyToDistrict}
        onFlyToAgent={flyToAgent}
        onFlyHome={flyHome}
      />
      <CityLeaderboard agents={data.agents} onFlyToAgent={flyToAgent} />
      <CitySearch
        agents={data.agents}
        onPickAgent={flyToAgent}
        onPickDistrict={flyToDistrict}
      />
      <CityReplay baseAgents={data.agents} onOverlay={setReplayOverlay} />
      <CitySound onReady={(api) => (soundRef.current = api)} />
      <CityOnboarding />
    </div>
  );
}
