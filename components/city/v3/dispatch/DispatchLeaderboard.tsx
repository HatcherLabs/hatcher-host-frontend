'use client';
import { useEffect, useState } from 'react';
import { fetchLeaderboard, type LeaderboardData, type LeaderRow } from '@/lib/agent-dispatch/leaderboard';

const TABS = [
  { id: 'overall', label: 'Overall' },
  { id: 'openclaw', label: 'OpenClaw' },
  { id: 'hermes', label: 'Hermes' },
  { id: 'elizaos', label: 'ElizaOS' },
  { id: 'milady', label: 'Milady' },
];

const RANK_COLOR = ['#ffd24a', '#cfd6e0', '#cd7f32'];

export function DispatchLeaderboard({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overall');

  useEffect(() => {
    let alive = true;
    fetchLeaderboard().then((d) => {
      if (alive) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const rows: LeaderRow[] = tab === 'overall' ? data?.overall ?? [] : data?.byFramework?.[tab] ?? [];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur sm:items-center" onClick={onClose}>
      <div
        className="relative max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl border border-[#39ff88]/30 bg-[rgba(8,12,10,0.97)] p-5 text-[#dffbe9] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-md px-2 py-1 text-[#9fceb4] hover:bg-white/5 hover:text-white">
          ✕
        </button>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#39ff88]">
          <span aria-hidden>☷</span> Dispatch Leaderboard
        </h2>

        <div className="mb-3 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                tab === t.id ? 'bg-[#39ff88] text-black' : 'bg-white/5 text-[#9fceb4] hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-[#9fceb4]">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#9fceb4]">No scores yet — be the first to dispatch!</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {rows.map((r, i) => (
              <li
                key={`${r.username}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
              >
                <span className="w-6 text-center font-bold" style={{ color: RANK_COLOR[i] ?? '#7faE96' }}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {r.username}
                  {r.prestige > 0 && <span className="ml-1 text-xs text-[#ffd24a]">★{r.prestige}</span>}
                </span>
                <span className="text-xs text-[#9fceb4]">Lv {r.level}</span>
                <span className="w-20 text-right font-mono text-[#39ff88]">◆ {r.value.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-center text-[10px] text-[#5f8a76]">Updates a few seconds after you play. Sign in to appear.</p>
      </div>
    </div>
  );
}
