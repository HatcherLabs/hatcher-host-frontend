'use client';
import Link from 'next/link';
import { DoorOpen } from 'lucide-react';
import type { CityAgent, CityResponse } from '@/components/city/types';

interface Props {
  counts: CityResponse['counts'] | null;
  ownedAgents: CityAgent[];
  generatedAt?: string | null;
  hasMyBuilding?: boolean;
  onMyBuildingClick?: () => void;
  onFindMyBuildingClick?: () => void;
}

function labelStatus(status: CityAgent['status']) {
  switch (status) {
    case 'running':
      return 'active';
    case 'sleeping':
      return 'sleeping';
    case 'paused':
      return 'paused';
    case 'crashed':
      return 'needs attention';
  }
}

export function LiveCityHud({
  counts,
  ownedAgents,
  generatedAt,
  hasMyBuilding = false,
  onMyBuildingClick,
  onFindMyBuildingClick,
}: Props) {
  const topOwned = ownedAgents
    .filter((agent) => agent.visibility !== 'private')
    .sort((a, b) => {
      const runningDiff =
        Number(b.status === 'running') - Number(a.status === 'running');
      if (runningDiff !== 0) return runningDiff;
      return b.messageCount - a.messageCount;
    })
    .slice(0, 5);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-3">
        <div className="rounded-lg border border-white/10 bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-300/80">
            Hatcher City
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            Live Agent Network
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/65">
            <span>{counts?.users ?? counts?.total ?? 0} users</span>
            <span>{counts?.total ?? 0} agents</span>
            <span>{counts?.running ?? 0} active</span>
            {generatedAt && (
              <span>updated {new Date(generatedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {hasMyBuilding && onMyBuildingClick && (
            <button
              type="button"
              onClick={onMyBuildingClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/45 bg-black/58 px-3 py-2 text-xs font-semibold text-amber-200 backdrop-blur-xl transition hover:bg-amber-300 hover:text-black"
            >
              <DoorOpen size={14} />
              Go to building
            </button>
          )}
          {onFindMyBuildingClick && (
            <button
              type="button"
              onClick={onFindMyBuildingClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl transition hover:border-cyan-300/45 hover:text-cyan-200"
            >
              Find mine
            </button>
          )}
          <Link
            href="/create"
            className="rounded-lg border border-emerald-300/25 bg-emerald-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-200"
          >
            Create agent
          </Link>
        </div>
      </div>

      {topOwned.length > 0 ? (
        <div className="pointer-events-auto absolute right-4 top-28 w-64 rounded-lg border border-amber-300/20 bg-black/58 p-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-200">My agents</p>
            <Link
              href="/dashboard/agents"
              className="text-[11px] text-white/55 hover:text-white"
            >
              dashboard
            </Link>
          </div>
          <div className="grid gap-1.5">
            {topOwned.map((agent) => (
              <Link
                key={agent.id}
                href={`/dashboard/agent/${agent.id}`}
                className="group rounded-md border border-white/8 bg-white/[0.035] px-2.5 py-2 transition hover:border-amber-300/35 hover:bg-amber-300/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-white">
                    {agent.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-white/50">
                    {labelStatus(agent.status)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-200/70">
                  {agent.framework} · {agent.messageCount} msgs
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white/70 backdrop-blur-xl">
          Active agents move through the city. Your agents turn gold after
          login.
        </div>
      )}
    </div>
  );
}
