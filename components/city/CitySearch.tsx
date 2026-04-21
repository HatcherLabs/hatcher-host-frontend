'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CityAgent, Category, Framework } from './types';
import { CATEGORY_ICON, CATEGORY_LABELS, CATEGORIES } from './types';

interface Props {
  agents: CityAgent[];
  onPickAgent: (id: string) => void;
  onPickDistrict: (c: Category) => void;
}

type Match =
  | { kind: 'agent'; agent: CityAgent; score: number }
  | { kind: 'district'; category: Category; score: number };

const FW_COLOR: Record<Framework, string> = {
  openclaw: '#10b981',
  hermes: '#38bdf8',
  elizaos: '#a855f7',
  milady: '#ec4899',
};

// Simple fuzzy: exact prefix > substring > character-scatter.
// Returns null if no match, otherwise a score where lower = better.
function score(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 0;
  if (t.startsWith(q)) return 0;
  const idx = t.indexOf(q);
  if (idx !== -1) return 1 + idx;
  // character-scatter
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  if (qi < q.length) return null;
  return 100 + t.length - q.length;
}

export function CitySearch({ agents, onPickAgent, onPickDistrict }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard: Cmd/Ctrl+K opens, Esc closes, arrows navigate, enter picks.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // "/" also opens when no input is focused
      if (
        e.key === '/' &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const matches: Match[] = useMemo(() => {
    if (!query) {
      // Default view: top 5 districts by population as quick jumps.
      return CATEGORIES.slice(0, 6).map((category) => ({
        kind: 'district',
        category,
        score: 0,
      }));
    }
    const out: Match[] = [];
    for (const a of agents) {
      const s = Math.min(
        score(query, a.name) ?? Infinity,
        score(query, a.slug ?? '') ?? Infinity,
      );
      if (Number.isFinite(s)) out.push({ kind: 'agent', agent: a, score: s });
    }
    for (const c of CATEGORIES) {
      const s = score(query, CATEGORY_LABELS[c]);
      if (s !== null) out.push({ kind: 'district', category: c, score: s - 0.5 }); // slight boost so districts show on short queries
    }
    out.sort((a, b) => a.score - b.score);
    return out.slice(0, 20);
  }, [query, agents]);

  const commit = useCallback(
    (m: Match) => {
      setOpen(false);
      if (m.kind === 'agent') onPickAgent(m.agent.id);
      else onPickDistrict(m.category);
    },
    [onPickAgent, onPickDistrict],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(matches.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const m = matches[cursor];
      if (m) commit(m);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute right-2 top-16 z-20 border border-slate-800 bg-[#050814]/85 px-3 py-2 font-mono text-xs text-slate-300 hover:border-amber-400 hover:text-amber-400 sm:right-auto sm:left-1/2 sm:top-16 sm:-translate-x-1/2"
        title="Search agents and districts (⌘K)"
      >
        🔍 Search <span className="ml-1 text-slate-500">⌘K</span>
      </button>
    );
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg border-2 border-amber-400 bg-[#0a0e1a] shadow-[6px_6px_0_#000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2 font-mono text-sm">
          <span className="text-slate-500">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search agents or districts…"
            className="flex-1 bg-transparent text-slate-100 outline-none placeholder-slate-500"
          />
          <span className="text-[10px] text-slate-600">Esc to close</span>
        </div>
        <ul className="max-h-80 overflow-y-auto font-mono">
          {matches.length === 0 && (
            <li className="px-3 py-4 text-sm text-slate-500">No matches.</li>
          )}
          {matches.map((m, idx) => {
            const active = idx === cursor;
            return (
              <li key={m.kind === 'agent' ? `a:${m.agent.id}` : `d:${m.category}`}>
                <button
                  onMouseEnter={() => setCursor(idx)}
                  onClick={() => commit(m)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    active ? 'bg-amber-400/10 text-amber-300' : 'text-slate-200 hover:bg-amber-400/5'
                  }`}
                >
                  {m.kind === 'agent' ? (
                    <>
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center border border-black text-sm"
                        style={{ background: FW_COLOR[m.agent.framework] }}
                      >
                        {CATEGORY_ICON[m.agent.category] ?? m.agent.name[0]?.toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{m.agent.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {m.agent.framework} · {m.agent.category}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-black bg-slate-800 text-sm">
                        {CATEGORY_ICON[m.category]}
                      </span>
                      <span className="flex-1 truncate text-amber-400">
                        {CATEGORY_LABELS[m.category]}
                      </span>
                      <span className="text-[11px] text-slate-500">district</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
