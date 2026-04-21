'use client';

import { useMemo } from 'react';
import type { CityAgent, CityResponse, Framework, CityStatus } from './types';

export interface FilterState {
  frameworks: Set<Framework>;
  status: 'all' | 'running' | 'active';
  tier: 'all' | 'paid' | 'founding';
  mineOnly: boolean;
}

export const ALL_FRAMEWORKS: Framework[] = ['openclaw', 'hermes', 'elizaos', 'milady'];

export function defaultFilters(): FilterState {
  return {
    frameworks: new Set(ALL_FRAMEWORKS),
    status: 'all',
    tier: 'all',
    mineOnly: false,
  };
}

// URL round-tripping — short keys so shareable links stay tidy.
export function filtersToSearchParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.frameworks.size < ALL_FRAMEWORKS.length) {
    p.set('fw', ALL_FRAMEWORKS.filter((x) => f.frameworks.has(x)).join(','));
  }
  if (f.status !== 'all') p.set('status', f.status);
  if (f.tier !== 'all') p.set('tier', f.tier);
  if (f.mineOnly) p.set('mine', '1');
  return p;
}

export function filtersFromSearchParams(p: URLSearchParams): FilterState {
  const fw = p.get('fw');
  const frameworks = fw
    ? new Set<Framework>(
        fw
          .split(',')
          .filter((x): x is Framework => ALL_FRAMEWORKS.includes(x as Framework)),
      )
    : new Set<Framework>(ALL_FRAMEWORKS);
  const statusRaw = p.get('status');
  const status: FilterState['status'] =
    statusRaw === 'running' || statusRaw === 'active' ? statusRaw : 'all';
  const tierRaw = p.get('tier');
  const tier: FilterState['tier'] =
    tierRaw === 'paid' || tierRaw === 'founding' ? tierRaw : 'all';
  const mineOnly = p.get('mine') === '1';
  return { frameworks, status, tier, mineOnly };
}

export function applyFilters(agents: CityAgent[], f: FilterState): CityAgent[] {
  return agents.filter((a) => {
    if (!f.frameworks.has(a.framework)) return false;
    if (f.status === 'running' && a.status !== 'running') return false;
    // "active" excludes crashed — everything else ok (running + paused + sleeping).
    if (f.status === 'active' && a.status === 'crashed') return false;
    if (f.tier === 'paid' && a.tier === 0) return false;
    if (f.tier === 'founding' && a.tier !== 4) return false;
    if (f.mineOnly && !a.mine) return false;
    return true;
  });
}

const FW_COLORS: Record<Framework, string> = {
  openclaw: '#10b981',
  hermes: '#38bdf8',
  elizaos: '#a855f7',
  milady: '#ec4899',
};

interface Props {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  counts: CityResponse['counts'];
  hasMine: boolean;
}

export function CityFilters({ filters, onChange, counts, hasMine }: Props) {
  const toggleFramework = (fw: Framework) => {
    const next = new Set(filters.frameworks);
    if (next.has(fw)) next.delete(fw);
    else next.add(fw);
    if (!next.size) return; // don't allow the empty state; last click re-enables
    onChange({ ...filters, frameworks: next });
  };

  const visibleTotal = useMemo(() => {
    let n = 0;
    for (const fw of filters.frameworks) n += counts.byFramework[fw] ?? 0;
    return n;
  }, [filters.frameworks, counts]);

  // On mobile we only show the compact framework-chip row — the tier
  // and status filters are pulled into a small details panel below so
  // the bar never stacks and covers the map.
  return (
    <div className="pointer-events-auto absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 border border-slate-800 bg-[#050814]/90 px-2 py-1.5 backdrop-blur sm:bottom-auto sm:top-4 sm:gap-2 sm:px-3 sm:py-2">
      {/* Framework chips */}
      {ALL_FRAMEWORKS.map((fw) => {
        const on = filters.frameworks.has(fw);
        return (
          <button
            key={fw}
            onClick={() => toggleFramework(fw)}
            className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-xs transition ${
              on
                ? 'border-slate-500 text-slate-100'
                : 'border-slate-800 text-slate-600 line-through'
            }`}
          >
            <span
              className="inline-block h-2 w-2 border border-black"
              style={{ background: on ? FW_COLORS[fw] : '#475569' }}
            />
            {fw}
            <span className="text-slate-500">{counts.byFramework[fw] ?? 0}</span>
          </button>
        );
      })}

      <span className="mx-1 h-4 w-px bg-slate-700" />

      {/* Status */}
      <Chip
        label={`all ${visibleTotal}`}
        on={filters.status === 'all'}
        onClick={() => onChange({ ...filters, status: 'all' })}
      />
      <Chip
        label="running"
        on={filters.status === 'running'}
        onClick={() => onChange({ ...filters, status: 'running' })}
      />
      <Chip
        label="active"
        on={filters.status === 'active'}
        onClick={() => onChange({ ...filters, status: 'active' })}
      />

      <span className="mx-1 h-4 w-px bg-slate-700" />

      {/* Tier */}
      <Chip
        label="paid"
        on={filters.tier === 'paid'}
        onClick={() => onChange({ ...filters, tier: filters.tier === 'paid' ? 'all' : 'paid' })}
      />
      <Chip
        label="founding ♛"
        on={filters.tier === 'founding'}
        onClick={() =>
          onChange({ ...filters, tier: filters.tier === 'founding' ? 'all' : 'founding' })
        }
      />

      {hasMine && (
        <>
          <span className="mx-1 h-4 w-px bg-slate-700" />
          <Chip
            label="★ mine"
            on={filters.mineOnly}
            onClick={() => onChange({ ...filters, mineOnly: !filters.mineOnly })}
          />
        </>
      )}
    </div>
  );
}

function Chip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`border px-2 py-1 font-mono text-xs transition ${
        on
          ? 'border-amber-400 text-amber-400'
          : 'border-slate-800 text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

// Helper so other components can filter by the current status without
// duplicating the crashed/active logic.
export function statusIsActive(s: CityStatus): boolean {
  return s !== 'crashed';
}
