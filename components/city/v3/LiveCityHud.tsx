'use client';
import Link from 'next/link';
import { Bot, DoorOpen, Eye, MessageSquare } from 'lucide-react';
import type { CityAgent, CityResponse } from '@/components/city/types';
import type { LiveAgentMarkerLayout } from './liveLayout';
import { publicAgentChatHref, selectActiveCityAgents } from './activeAgentList';

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
  activeAgents = [],
  onMyBuildingClick,
  onFindMyBuildingClick,
  onAgentViewClick,
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
  const topActive = selectActiveCityAgents(activeAgents, 8);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 hidden md:block">
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
                  {agent.framework} · {agent.messageCount} interactions
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : topActive.length === 0 ? (
        <div className="absolute bottom-24 left-4 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white/70 backdrop-blur-xl">
          Active agents move through the city. Your agents turn gold after
          login.
        </div>
      ) : null}

      {topActive.length > 0 && (
        <div className="pointer-events-auto absolute bottom-24 left-4 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-cyan-200/20 bg-black/62 p-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200">
              <Bot size={13} />
              Active agents
            </p>
            <span className="text-[11px] text-white/45">{topActive.length} shown</span>
          </div>
          <div className="grid max-h-[310px] gap-1.5 overflow-y-auto pr-1">
            {topActive.map((agent) => {
              const chatHref = publicAgentChatHref(agent);
              return (
                <div
                  key={agent.agentId}
                  className="grid gap-2 rounded-md border border-white/8 bg-white/[0.035] px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-white">
                        {agent.agentName}
                      </span>
                      <span className="shrink-0 text-[10px] text-emerald-200/75">
                        {labelStatus(agent.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                      {agent.framework}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onAgentViewClick && (
                      <button
                        type="button"
                        onClick={() => onAgentViewClick(agent.agentId)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-[4px] border border-white/12 bg-white/[0.055] px-2 py-1.5 text-[11px] font-semibold text-white/78 transition hover:border-cyan-200/45 hover:text-cyan-100"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    )}
                    {chatHref && (
                      <Link
                        href={chatHref}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-[4px] border border-emerald-300/30 bg-emerald-300 px-2 py-1.5 text-[11px] font-semibold text-black transition hover:bg-emerald-200"
                      >
                        <MessageSquare size={12} />
                        Chat
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
