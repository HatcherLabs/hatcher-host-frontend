'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import type { CityAgent, CityResponse } from '@/components/city/types';
import { getGlbAvatarUrl } from '@/components/agent-room/v2/stations/avatarModelConfig';
import {
  CITY_LOADING_STAGES,
  chooseCriticalAvatarUrls,
  cityLoadingProgress,
  type CityLoadingStage,
} from '@/components/city/v3/cityLoading';

const CRITICAL_CITY_AVATAR_PRELOAD_LIMIT = 8;

const loadLiveCityScene = () =>
  import('@/components/city/v3/LiveCityScene').then((m) => m.LiveCityScene);

const LiveCityScene = dynamic(loadLiveCityScene, { ssr: false });

interface Props {
  initial: CityResponse | null;
}

export function CityClient({ initial }: Props) {
  const { isAuthenticated, user } = useAuth();
  const [data, setData] = useState<CityResponse | null>(initial);
  const [dataFetchSettled, setDataFetchSettled] = useState(() => initial !== null);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [avatarPreload, setAvatarPreload] = useState({
    key: '',
    loaded: 0,
    total: 0,
  });
  // Track last-seen messageCount so we can spawn a ring pulse every
  // time an agent's tally ticks up between polls.
  const msgCountRef = useRef<Map<string, number>>(new Map());
  const preloadedAvatarUrlsRef = useRef<Set<string>>(new Set());
  const [pulseAts, setPulseAts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void loadLiveCityScene()
      .then(() => {
        if (!cancelled) setRuntimeReady(true);
      })
      .catch(() => {
        if (!cancelled) setRuntimeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh on mount if SSR missed it (e.g. empty initial list).
  useEffect(() => {
    if (initial && initial.agents.length) return;
    fetch(`${API_URL}/public/city`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { success?: boolean; data?: CityResponse } | null) => {
        if (j?.success && j.data) setData(j.data);
      })
      .catch(() => {})
      .finally(() => setDataFetchSettled(true));
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
        if (j?.success && j.data) setData(j.data);
      })
      .catch(() => {})
      .finally(() => setDataFetchSettled(true));
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
      const messageCount = a.messageCount ?? 0;
      if (prev !== undefined && messageCount > prev) {
        pulses.set(a.id, now);
      }
      counts.set(a.id, messageCount);
    }
    if (pulses.size === 0) return;
    setPulseAts(pulses);
    const t = setTimeout(() => setPulseAts(new Map()), 2000);
    return () => clearTimeout(t);
  }, [data]);

  const criticalAvatarUrls = useMemo(
    () =>
      chooseCriticalAvatarUrls(
        (data?.agents ?? []).map((agent) => ({
          agentId: agent.id,
          mine: agent.mine,
          avatarUrl: getGlbAvatarUrl(agent.avatarVariant),
        })),
        CRITICAL_CITY_AVATAR_PRELOAD_LIMIT,
      ),
    [data?.agents],
  );
  const criticalAvatarKey = criticalAvatarUrls.join('|');
  const dataReady = data !== null || dataFetchSettled;

  useEffect(() => {
    if (!runtimeReady || !dataReady) return;

    let cancelled = false;
    const pending = criticalAvatarUrls.filter(
      (url) => !preloadedAvatarUrlsRef.current.has(url),
    );
    const alreadyLoaded = criticalAvatarUrls.length - pending.length;
    setAvatarPreload({
      key: criticalAvatarKey,
      loaded: alreadyLoaded,
      total: criticalAvatarUrls.length,
    });

    if (pending.length === 0) return;

    void Promise.all(
      pending.map(async (url) => {
        try {
          await fetch(url, { cache: 'force-cache' });
        } catch {
          // A missing optional avatar should not block the city.
        } finally {
          if (cancelled) return;
          preloadedAvatarUrlsRef.current.add(url);
          setAvatarPreload((current) => {
            if (current.key !== criticalAvatarKey) return current;
            return {
              ...current,
              loaded: Math.min(current.total, current.loaded + 1),
            };
          });
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [criticalAvatarKey, criticalAvatarUrls, dataReady, runtimeReady]);

  const avatarPreloadComplete =
    dataReady &&
    avatarPreload.key === criticalAvatarKey &&
    avatarPreload.loaded >= avatarPreload.total;
  const loadingStage: CityLoadingStage = sceneReady && avatarPreloadComplete
    ? 'ready'
    : !runtimeReady
      ? 'runtime'
      : !dataReady
        ? 'data'
        : !avatarPreloadComplete
          ? 'avatars'
          : 'webgl';
  const loadingProgress = cityLoadingProgress({
    stage: loadingStage,
    avatarLoaded: avatarPreload.loaded,
    avatarTotal: avatarPreload.total,
  });

  return (
    <div className="relative h-[100svh] min-h-[520px] overflow-hidden bg-[#030506]">
      <LiveCityScene
        agents={data?.agents ?? []}
        users={data?.users ?? []}
        counts={data?.counts ?? null}
        generatedAt={data?.generatedAt ?? null}
        pulseAts={pulseAts}
        canEnterBuilding={isAuthenticated}
        viewerUsername={user?.username ?? null}
        realAvatarsEnabled={avatarPreloadComplete}
        onSceneReady={() => setSceneReady(true)}
      />
      <CityLoadingOverlay
        stage={loadingStage}
        progress={loadingProgress}
        avatarLoaded={avatarPreload.loaded}
        avatarTotal={avatarPreload.total}
      />
    </div>
  );
}

function CityLoadingOverlay({
  stage,
  progress,
  avatarLoaded,
  avatarTotal,
}: {
  stage: CityLoadingStage;
  progress: number;
  avatarLoaded: number;
  avatarTotal: number;
}) {
  const ready = stage === 'ready';
  const subcopy =
    stage === 'avatars' && avatarTotal > 0
      ? `${avatarLoaded}/${avatarTotal} priority avatars cached`
      : CITY_LOADING_STAGES[stage];

  return (
    <section
      aria-live="polite"
      aria-busy={!ready}
      className={`absolute inset-0 z-50 flex items-center justify-center bg-[#030506] px-6 transition-opacity duration-500 ${
        ready ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-[420px] rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="text-xs font-semibold uppercase text-cyan-200/80">
            Hatcher City
          </span>
          <strong className="text-sm font-semibold tabular-nums text-white">
            {progress}%
          </strong>
        </div>
        <h1 className="text-xl font-semibold text-white">Preparing live city</h1>
        <p className="mt-2 min-h-5 text-sm text-slate-300">{subcopy}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <i
            className="block h-full rounded-full bg-cyan-300 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
