'use client';
import Link from 'next/link';
import { ArrowLeft, DoorOpen } from 'lucide-react';
import type { CityAgent, CityResponse } from '@/components/city/types';
import type { LiveAgentMarkerLayout } from './liveLayout';
import { cityAgentDisplayName } from './cityDisplay';

interface Props {
  counts: CityResponse['counts'] | null;
  ownedAgents: CityAgent[];
  generatedAt?: string | null;
  hasMyBuilding?: boolean;
  activeAgents?: LiveAgentMarkerLayout[];
  onMyBuildingClick?: () => void;
  onFindMyBuildingClick?: () => void;
  onAgentViewClick?: (agentId: string) => void;
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
    .sort((a, b) => {
      const runningDiff = Number(b.status === 'running') - Number(a.status === 'running');
      if (runningDiff !== 0) return runningDiff;
      return (b.messageCount ?? 0) - (a.messageCount ?? 0);
    })
    .slice(0, 5);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 hidden md:block">
      <div className="absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-3">
        <div className="rounded-lg border border-white/10 bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-300/80">
            Hatcher City
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Live Agent Network</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/65">
            <span>{counts?.total ?? 0} public agents</span>
            <span>{counts?.running ?? 0} active</span>
            <span>{counts?.byFramework?.openclaw ?? 0} OpenClaw</span>
            <span>{counts?.byFramework?.hermes ?? 0} Hermes</span>
            {generatedAt && <span>updated {new Date(generatedAt).toLocaleTimeString()}</span>}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(57,255,136,0.55)]"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(8, ((counts?.running ?? 0) / Math.max(1, counts?.total ?? 1)) * 100),
                )}%`,
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(57,255,136,0.8)]" />
              live
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.75)]" />
              yours
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.75)]" />
              public
            </span>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl transition hover:border-cyan-300/45 hover:text-cyan-200"
          >
            <ArrowLeft size={14} />
            Back to site
          </Link>
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

      {topOwned.length > 0 && (
        <div className="pointer-events-auto absolute right-4 top-28 w-64 rounded-lg border border-amber-300/20 bg-black/58 p-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-200">My agents</p>
            <Link href="/dashboard/agents" className="text-[11px] text-white/55 hover:text-white">
              dashboard
            </Link>
          </div>
          <div className="grid gap-1.5">
            {topOwned.map((agent) => (
              <Link
                key={agent.id}
                href={`/dashboard/agent/${agent.dashboardAgentId ?? agent.id}`}
                className="group rounded-md border border-white/8 bg-white/[0.035] px-2.5 py-2 transition hover:border-amber-300/35 hover:bg-amber-300/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-white">
                    {cityAgentDisplayName(agent)}
                  </span>
                  <span className="shrink-0 text-[10px] text-white/50">
                    {labelStatus(agent.status)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-200/70">
                  {agent.framework} · View
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
