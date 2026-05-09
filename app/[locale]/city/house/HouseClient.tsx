'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DoorOpen, Home, Loader2, Map, Plus, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import {
  frameworkColor,
  labelAgentStatus,
  statusColor,
  type HouseDoorLayout,
} from '@/components/house/houseLayout';

const AgentHouseScene = dynamic(
  () => import('@/components/house/AgentHouseScene').then((m) => m.AgentHouseScene),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-[#070b12] text-[11px] uppercase tracking-[0.16em] text-white/50">
        Loading building
      </div>
    ),
  },
);

interface Profile {
  username?: string | null;
  tier?: string | null;
}

export function HouseClient() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nearestDoor, setNearestDoor] = useState<HouseDoorLayout | 'exit' | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([api.getMyAgents(), api.getProfile()])
      .then(([agentsRes, profileRes]) => {
        if (cancelled) return;
        if (!agentsRes.success) {
          setError(agentsRes.error || 'Could not load agents.');
          setAgents([]);
        } else {
          setAgents(sortAgentsForHouse(agentsRes.data));
        }
        if (profileRes.success) {
          setProfile(profileRes.data);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your house.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const activeCount = useMemo(
    () =>
      agents.filter((agent) => ['active', 'running', 'restarting'].includes(agent.status)).length,
    [agents],
  );

  const enterAgent = useCallback(
    (agent: Agent) => {
      router.push(`/agent/${agent.id}/room?from=building`);
    },
    [router],
  );

  if (authLoading || loading) {
    return (
      <div className="relative grid h-[calc(100vh-4rem)] min-h-[560px] place-items-center bg-[#070b12] text-white">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-white/55">
          <Loader2 size={16} className="animate-spin" />
          Loading building
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative grid h-[calc(100vh-4rem)] min-h-[560px] place-items-center bg-[#070b12] px-4 text-white">
        <div className="w-full max-w-md rounded-[6px] border border-white/12 bg-white/[0.06] p-6 text-center shadow-2xl backdrop-blur">
          <Home className="mx-auto text-emerald-300" size={28} />
          <h1 className="mt-4 text-2xl font-semibold">Sign in to enter your Building</h1>
          <p className="mt-2 text-sm text-white/58">
            Your building hallway is private and is built from your agents.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center justify-center rounded-[4px] bg-emerald-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-200"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px] overflow-hidden bg-[#070b12] text-white">
      <AgentHouseScene
        agents={agents}
        profile={profile}
        nearestDoor={nearestDoor}
        onNearestDoorChange={setNearestDoor}
        onDoorEnter={enterAgent}
        onExit={() => router.push('/city')}
      />

      <div className="pointer-events-auto absolute left-4 top-4 z-30 flex flex-wrap items-start gap-3">
        <div className="rounded-[6px] border border-white/12 bg-[#07101b]/82 px-4 py-3 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <Home size={14} />
            Hatcher Building
          </div>
          <h1 className="mt-1 text-lg font-semibold leading-tight">
            @{profile?.username || 'builder'}
          </h1>
          <p className="mt-1 text-xs text-white/56">
            {(profile?.tier || 'free').toUpperCase()} · {agents.length} agents · {activeCount}{' '}
            active
          </p>
        </div>
        <Link
          href="/city"
          className="inline-flex items-center gap-2 rounded-[6px] border border-white/12 bg-[#07101b]/82 px-3 py-2 text-xs font-semibold text-white/82 shadow-2xl backdrop-blur transition hover:border-cyan-300/40 hover:text-cyan-200"
        >
          <Map size={14} />
          City
        </Link>
      </div>

      {panelOpen ? (
        <aside className="pointer-events-auto absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[min(330px,calc(100vw-2rem))] flex-col rounded-[7px] border border-white/12 bg-[#111722]/88 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Agents
              </div>
              <p className="mt-1 text-xs text-white/50">click a row or enter the matching door</p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Hide agent list"
            >
              <X size={14} />
            </button>
          </div>
          {error ? (
            <div className="p-4 text-sm text-rose-200">{error}</div>
          ) : agents.length === 0 ? (
            <div className="p-4">
              <p className="text-sm text-white/62">No agents yet.</p>
              <Link
                href="/create"
                className="mt-3 inline-flex items-center gap-2 rounded-[4px] bg-emerald-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-200"
              >
                <Plus size={14} />
                Create agent
              </Link>
            </div>
          ) : (
            <div className="min-h-0 overflow-y-auto py-2">
              {agents.map((agent, index) => {
                const sColor = statusColor(agent.status);
                const fColor = frameworkColor(agent.framework);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => enterAgent(agent)}
                    className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/[0.06]"
                  >
                    <span className="w-8 shrink-0 font-mono text-[11px] text-white/35">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {agent.name}
                      </span>
                      <span className="block truncate text-xs" style={{ color: fColor }}>
                        {agent.framework}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[11px] text-white/52">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: sColor, boxShadow: `0 0 12px ${sColor}` }}
                      />
                      {labelAgentStatus(agent.status)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="pointer-events-auto absolute right-4 top-4 z-30 inline-flex items-center gap-2 rounded-[6px] border border-white/12 bg-[#111722]/88 px-3 py-2 text-xs font-semibold text-white/82 shadow-2xl backdrop-blur-xl transition hover:border-emerald-300/40 hover:text-emerald-200"
        >
          <DoorOpen size={14} />
          Agents
        </button>
      )}

      {nearestDoor && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/16 bg-black/65 px-4 py-2 text-sm text-white shadow-2xl backdrop-blur">
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-xs">E</kbd>{' '}
          {nearestDoor === 'exit' ? 'exit to City' : `enter ${nearestDoor.agent.name}`}
        </div>
      )}
    </div>
  );
}

function sortAgentsForHouse(agents: Agent[]): Agent[] {
  const statusRank: Record<string, number> = {
    active: 0,
    running: 0,
    restarting: 1,
    paused: 2,
    sleeping: 3,
    error: 4,
    killed: 4,
  };

  return [...agents].sort((a, b) => {
    const statusDiff = (statusRank[a.status] ?? 5) - (statusRank[b.status] ?? 5);
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });
}
