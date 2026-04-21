'use client';

import { useMemo, useState } from 'react';
import type { CityAgent, Framework } from './types';
import { CATEGORY_ICON } from './types';

interface Props {
  agents: CityAgent[];
  onFlyToAgent: (id: string) => void;
}

const FW_COLOR: Record<Framework, string> = {
  openclaw: '#10b981',
  hermes: '#38bdf8',
  elizaos: '#a855f7',
  milady: '#ec4899',
};

export function CityLeaderboard({ agents, onFlyToAgent }: Props) {
  const [open, setOpen] = useState(true);

  const top = useMemo(
    () =>
      [...agents]
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10),
    [agents],
  );

  if (!top.length) return null;

  return (
    <div className="pointer-events-auto absolute left-2 bottom-[16.5rem] z-20 w-60 border border-slate-800 bg-[#050814]/90 p-2 backdrop-blur sm:left-4 sm:bottom-auto sm:top-20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between font-['Press_Start_2P',monospace] text-[9px] tracking-[2px] text-amber-400"
      >
        <span>★ TOP 10 BUSIEST</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <ol className="mt-2 space-y-0 font-mono text-xs">
          {top.map((a, idx) => (
            <li key={a.id}>
              <button
                onClick={() => onFlyToAgent(a.id)}
                className="group flex w-full items-center gap-2 border-t border-slate-800/60 px-1 py-1.5 text-left hover:bg-amber-400/10"
                title={`${a.name} — ${a.messageCount.toLocaleString()} messages`}
              >
                <span
                  className="w-5 shrink-0 text-right text-slate-500 group-hover:text-amber-400"
                >
                  {idx + 1}
                </span>
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center border border-black text-[11px]"
                  style={{ background: FW_COLOR[a.framework] }}
                  title={a.framework}
                >
                  {CATEGORY_ICON[a.category] ?? '•'}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-100 group-hover:text-amber-300">
                  {a.name}
                </span>
                <span className="shrink-0 text-slate-500">
                  {formatCount(a.messageCount)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}
