'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CityAgent, CityResponse, Framework, Category } from './types';
import { CATEGORIES, CATEGORY_LABELS } from './types';

interface Props {
  counts: CityResponse['counts'];
  hovered: CityAgent | null;
  mineAgents: CityAgent[];
  /** Caller injects the scene API so HUD buttons can drive the camera. */
  onFlyToDistrict?: (c: Category) => void;
  onFlyHome?: () => void;
}

const FW_LABEL: Record<Framework, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  elizaos: 'ElizaOS',
  milady: 'Milady',
};

const FW_COLORS: Record<Framework, string> = {
  openclaw: '#10b981',
  hermes: '#38bdf8',
  elizaos: '#a855f7',
  milady: '#ec4899',
};

// Step durations for tour mode (ms per district + final return home).
const TOUR_STEP_MS = 3500;

export function CityHud({ counts, hovered, mineAgents, onFlyToDistrict, onFlyHome }: Props) {
  const [tourOn, setTourOn] = useState(false);
  const [tourIdx, setTourIdx] = useState(0);
  const [legendOpen, setLegendOpen] = useState(false); // mobile collapsed state
  const [mineOpen, setMineOpen] = useState(false); // mobile collapsed state
  const tourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advance tour: at each tick, fly to next populated district. Skip
  // empty districts so we don't stop on blank ground.
  const tourCategories = CATEGORIES.filter((c) => (counts.byCategory[c] ?? 0) > 0);

  useEffect(() => {
    if (!tourOn) {
      if (tourTimerRef.current) {
        clearTimeout(tourTimerRef.current);
        tourTimerRef.current = null;
      }
      return;
    }
    if (!tourCategories.length) {
      setTourOn(false);
      return;
    }
    const c = tourCategories[tourIdx % tourCategories.length];
    onFlyToDistrict?.(c);
    tourTimerRef.current = setTimeout(() => {
      setTourIdx((i) => {
        const next = i + 1;
        if (next >= tourCategories.length) {
          // End tour after one full loop — fly back home.
          setTimeout(() => {
            onFlyHome?.();
            setTourOn(false);
          }, 200);
          return 0;
        }
        return next;
      });
    }, TOUR_STEP_MS);
    return () => {
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    };
  }, [tourOn, tourIdx, onFlyToDistrict, onFlyHome, tourCategories]);

  const toggleTour = useCallback(() => {
    setTourIdx(0);
    setTourOn((v) => !v);
  }, []);

  return (
    <>
      {/* Floating stats card — responsive: compact on mobile, wider on desktop. */}
      <div className="pointer-events-auto absolute left-2 top-2 z-20 flex items-center gap-2 border border-slate-800 bg-[#050814]/85 px-2 py-2 backdrop-blur sm:left-4 sm:top-4 sm:gap-5 sm:px-4 sm:py-2.5">
        <button
          onClick={onFlyHome}
          className="font-['Press_Start_2P',monospace] text-[8px] tracking-[1.5px] text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)] hover:text-amber-300 sm:text-[10px] sm:tracking-[2px]"
          title="Fly back to overview"
        >
          HATCHER CITY
        </button>
        <div className="hidden h-4 w-px bg-slate-700 sm:block" />
        <div className="flex items-center gap-2 font-mono text-xs text-slate-300 sm:gap-4 sm:text-sm">
          <Stat k="agents" v={counts.total.toLocaleString()} />
          <Stat k="run" v={counts.running.toLocaleString()} />
        </div>
        <div className="hidden h-4 w-px bg-slate-700 sm:block" />
        <button
          onClick={toggleTour}
          className={`font-['Press_Start_2P',monospace] text-[7px] tracking-[1px] px-1.5 py-1 border sm:text-[9px] sm:tracking-[2px] sm:px-2 ${
            tourOn
              ? 'border-amber-400 bg-amber-400 text-black'
              : 'border-slate-700 text-slate-300 hover:border-amber-400 hover:text-amber-400'
          }`}
          title="Auto-pan through every district"
        >
          {tourOn ? '■ STOP' : '▶ TOUR'}
        </button>
      </div>

      {/* Framework + district legend. District entries click to fly-to. */}
      <div className="pointer-events-auto absolute bottom-16 left-2 z-20 border border-slate-800 bg-[#050814]/90 p-2 font-mono text-sm text-slate-400 backdrop-blur sm:bottom-4 sm:left-4 sm:p-3">
        <button
          onClick={() => setLegendOpen((o) => !o)}
          className="mb-0 flex w-full items-center justify-between gap-2 font-['Press_Start_2P',monospace] text-[8px] tracking-[2px] text-amber-400 sm:mb-2"
          aria-expanded={legendOpen}
        >
          <span>LEGEND</span>
          <span className="sm:hidden">{legendOpen ? '▾' : '▸'}</span>
        </button>
        <div className={`${legendOpen ? 'block' : 'hidden'} sm:block`}>
        <div className="mb-2 mt-2 font-['Press_Start_2P',monospace] text-[8px] tracking-[2px] text-amber-400">
          FRAMEWORKS
        </div>
        {(Object.keys(FW_COLORS) as Framework[]).map((fw) => (
          <div key={fw} className="flex items-center gap-2 py-0.5">
            <span
              className="inline-block h-2.5 w-4 border border-black"
              style={{ background: FW_COLORS[fw] }}
            />
            {FW_LABEL[fw]}
            <span className="ml-auto text-slate-500">{counts.byFramework[fw] ?? 0}</span>
          </div>
        ))}
        <div className="my-2 h-px bg-slate-800" />
        <LegendRow color="#fbbf24" label="My agents" glow />

        <div className="mb-2 mt-3 font-['Press_Start_2P',monospace] text-[8px] tracking-[2px] text-amber-400">
          DISTRICTS
        </div>
        <div className="grid max-w-[220px] grid-cols-2 gap-x-3">
          {CATEGORIES.map((c) => {
            const count = counts.byCategory[c] ?? 0;
            if (!count) return null;
            return (
              <button
                key={c}
                onClick={() => onFlyToDistrict?.(c)}
                className="flex items-center gap-1 py-0.5 text-left text-[13px] text-slate-400 hover:text-amber-400"
              >
                <span className="flex-1 truncate">{CATEGORY_LABELS[c]}</span>
                <span className="text-slate-600">{count}</span>
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* Controls hint — hidden on mobile to save precious screen real-estate */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 border border-slate-800 bg-[#050814]/80 px-4 py-2 font-['Press_Start_2P',monospace] text-[8px] tracking-[2px] text-slate-400 sm:block">
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

      {/* My City panel — collapsible on mobile to free the canvas */}
      {mineAgents.length > 0 && (
        <div className="pointer-events-auto absolute right-2 top-2 z-20 w-48 border-2 border-amber-400 bg-[#0a0e1a]/95 p-2 shadow-[4px_4px_0_#000] sm:right-3 sm:top-4 sm:w-60 sm:p-3">
          <button
            onClick={() => setMineOpen((o) => !o)}
            className="mb-2 flex w-full items-center justify-between font-['Press_Start_2P',monospace] text-[9px] tracking-[1px] text-amber-400 sm:text-[10px]"
          >
            <span>★ MY CITY ({mineAgents.length})</span>
            <span className="sm:hidden">{mineOpen ? '▾' : '▸'}</span>
          </button>
          <div className={`${mineOpen ? 'block' : 'hidden'} max-h-64 space-y-0 overflow-y-auto sm:block`}>
            {mineAgents.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/agent/${a.id}`}
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
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 border-2 border-amber-400 bg-[#0a0e1a]/95 p-3 font-mono text-sm shadow-[4px_4px_0_#000,0_0_18px_rgba(251,191,36,0.2)]">
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
  return FW_COLORS[fw];
}

function tierLabel(t: number): string {
  return ['free', 'starter', 'pro', 'business', 'founding'][t] ?? 'free';
}
