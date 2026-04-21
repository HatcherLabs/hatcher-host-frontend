'use client';

import Link from 'next/link';
import type { CityAgent, CityResponse, Framework } from './types';

interface Props {
  counts: CityResponse['counts'];
  hovered: CityAgent | null;
  mineAgents: CityAgent[];
}

const FW_LABEL: Record<Framework, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  elizaos: 'ElizaOS',
  milady: 'Milady',
};

export function CityHud({ counts, hovered, mineAgents }: Props) {
  return (
    <>
      {/* Top bar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center gap-4 border-b border-slate-800/60 bg-[#050814]/80 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          className="pointer-events-auto font-['Press_Start_2P',monospace] text-sm tracking-[2px] text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
        >
          HATCHER CITY
        </Link>
        <span className="font-mono text-[10px] tracking-[2px] text-slate-500">
          LIVE · hatcher.host fleet
        </span>
        <div className="ml-auto flex items-center gap-4 font-mono text-sm text-slate-300">
          <Stat k="agents" v={counts.total.toLocaleString()} />
          <Stat k="running" v={counts.running.toLocaleString()} />
          <Stat k="frameworks" v="4" />
          <Stat k="districts" v="13" />
        </div>
      </div>

      {/* Framework legend */}
      <div className="pointer-events-none fixed bottom-4 left-4 z-20 border border-slate-800 bg-[#050814]/80 p-3 font-mono text-sm text-slate-400">
        <div className="mb-2 font-['Press_Start_2P',monospace] text-[8px] tracking-[2px] text-amber-400">
          FRAMEWORKS
        </div>
        <LegendRow color="#10b981" label="OpenClaw" />
        <LegendRow color="#38bdf8" label="Hermes" />
        <LegendRow color="#a855f7" label="ElizaOS" />
        <LegendRow color="#ec4899" label="Milady" />
        <div className="my-2 h-px bg-slate-800" />
        <LegendRow color="#fbbf24" label="My agents" glow />
      </div>

      {/* Controls hint */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-20 -translate-x-1/2 border border-slate-800 bg-[#050814]/80 px-4 py-2 font-['Press_Start_2P',monospace] text-[8px] tracking-[2px] text-slate-400">
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-slate-200">
          DRAG
        </kbd>{' '}
        orbit &nbsp;·&nbsp;
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-slate-200">
          SCROLL
        </kbd>{' '}
        zoom &nbsp;·&nbsp;
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-slate-200">
          CLICK
        </kbd>{' '}
        open
      </div>

      {/* My City panel */}
      {mineAgents.length > 0 && (
        <div className="pointer-events-auto fixed right-3 top-16 z-20 w-60 border-2 border-amber-400 bg-[#0a0e1a]/95 p-3 shadow-[4px_4px_0_#000]">
          <h3 className="mb-2 font-['Press_Start_2P',monospace] text-[10px] tracking-[1px] text-amber-400">
            ★ MY CITY ({mineAgents.length})
          </h3>
          <div className="max-h-64 space-y-0 overflow-y-auto">
            {mineAgents.map(a => (
              <Link
                key={a.id}
                href={a.slug ? `/dashboard/agent/${a.id}` : `/agent/${a.id}`}
                className="flex items-center gap-2 border-t border-slate-700/30 px-1 py-1.5 font-mono text-sm hover:bg-amber-400/10"
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black text-xs"
                  style={{ background: fwColor(a.framework) }}
                >
                  {a.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    a.name[0]?.toUpperCase() ?? '?'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-slate-100">{a.name}</div>
                  <div className="truncate text-[11px] text-slate-500">
                    {a.category} · {tierLabel(a.tier)}
                  </div>
                </div>
                <StatusDot status={a.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Hover card */}
      {hovered && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-30 -translate-x-1/2 border-2 border-amber-400 bg-[#0a0e1a]/95 p-3 font-mono text-sm shadow-[4px_4px_0_#000,0_0_18px_rgba(251,191,36,0.2)]">
          <div className="mb-1 font-['Press_Start_2P',monospace] text-[9px] tracking-[1px] text-amber-400">
            {hovered.name.toUpperCase()}
            {hovered.mine && ' ★'}
          </div>
          <div className="text-slate-400">
            {FW_LABEL[hovered.framework]} · {tierLabel(hovered.tier)}
          </div>
          <div className="text-slate-400">
            {hovered.category} · {hovered.status}
          </div>
          <div className="text-slate-400">↑ {hovered.messageCount.toLocaleString()} msgs</div>
          <div className="mt-2 bg-amber-400 px-2 py-1 text-center font-['Press_Start_2P',monospace] text-[8px] tracking-[1px] text-black">
            CLICK TO OPEN →
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className="font-['Press_Start_2P',monospace] text-[8px] tracking-[1px] text-amber-400">
        {k}
      </span>
      <b className="text-base font-normal text-slate-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]">
        {v}
      </b>
    </div>
  );
}

function LegendRow({ color, label, glow }: { color: string; label: string; glow?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        className="inline-block h-2.5 w-4 border border-black"
        style={{ background: color, boxShadow: glow ? `0 0 8px ${color}` : undefined }}
      />
      {label}
    </div>
  );
}

function StatusDot({ status }: { status: CityAgent['status'] }) {
  const bg =
    status === 'running'
      ? '#22c55e'
      : status === 'paused'
        ? '#fbbf24'
        : status === 'crashed'
          ? '#ef4444'
          : '#64748b';
  const glow = status === 'running' || status === 'crashed';
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ background: bg, boxShadow: glow ? `0 0 6px ${bg}` : undefined }}
    />
  );
}

function fwColor(fw: Framework): string {
  switch (fw) {
    case 'openclaw': return '#10b981';
    case 'hermes':   return '#38bdf8';
    case 'elizaos':  return '#a855f7';
    case 'milady':   return '#ec4899';
  }
}

function tierLabel(t: number): string {
  return ['free', 'starter', 'pro', 'business', 'founding'][t] ?? 'free';
}
