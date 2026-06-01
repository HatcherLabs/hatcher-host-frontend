'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchLeaderboard,
  fetchSeason,
  type LeaderboardData,
  type LeaderRow,
  type SeasonData,
} from '@/lib/agent-dispatch/leaderboard';

const TABS = [
  { id: 'prizes', label: '🏆 Prizes' },
  { id: 'overall', label: 'All-time' },
  { id: 'openclaw', label: 'OpenClaw' },
  { id: 'hermes', label: 'Hermes' },
];

const RANK_COLOR = ['#ffd24a', '#cfd6e0', '#cd7f32'];

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ending…';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

export function DispatchLeaderboard({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('prizes');

  useEffect(() => {
    let alive = true;
    Promise.all([fetchLeaderboard(), fetchSeason()]).then(([lb, s]) => {
      if (alive) {
        setData(lb);
        setSeason(s);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const allTimeRows: LeaderRow[] =
    tab === 'overall' ? data?.overall ?? [] : tab === 'prizes' ? [] : data?.byFramework?.[tab] ?? [];
  const countdown = useMemo(() => (season ? timeLeft(season.monthEnd) : ''), [season]);

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
          <span aria-hidden>☷</span> Leaderboard
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
        ) : tab === 'prizes' ? (
          <SeasonView season={season} countdown={countdown} />
        ) : allTimeRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#9fceb4]">No scores yet — be the first to dispatch!</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {allTimeRows.map((r, i) => (
              <li key={`${r.username}-${i}`} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm">
                <span className="w-6 text-center font-bold" style={{ color: RANK_COLOR[i] ?? '#7faE96' }}>{i + 1}</span>
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
        <p className="mt-3 text-center text-[10px] text-[#5f8a76]">Scores upload a few seconds after you play. Sign in to compete.</p>
      </div>
    </div>
  );
}

function SeasonView({ season, countdown }: { season: SeasonData | null; countdown: string }) {
  if (!season) return <p className="py-8 text-center text-sm text-[#9fceb4]">Season unavailable.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-[#ffd24a]/30 bg-[#ffd24a]/5 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-[#ffd24a]">Monthly Season</span>
          <span className="text-xs text-[#9fceb4]">{countdown}</span>
        </div>
        <p className="mt-1 text-[11px] text-[#9fceb4]">
          Top players this month win AI Credits. Earn the most Data before the month ends.
        </p>
        {season.you && (
          <div className="mt-2 rounded-lg bg-black/30 px-3 py-2 text-xs">
            You&apos;re <span className="font-bold text-[#ffd24a]">#{season.you.rank}</span> with ◆{' '}
            {season.you.value.toLocaleString()}
            {season.you.prizeUsd > 0 ? (
              <span className="text-[#39ff88]"> · on track for ${season.you.prizeUsd} credits</span>
            ) : (
              <span className="text-[#7faE96]"> · reach top 25 for a prize</span>
            )}
          </div>
        )}
      </div>

      {/* Prize table */}
      <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
        {season.prizeTable.map((p) => (
          <div key={p.label} className="rounded-md border border-white/10 bg-black/20 py-1.5">
            <div className="font-bold text-[#39ff88]">${p.prizeUsd}</div>
            <div className="text-[#7faE96]">{p.label}</div>
          </div>
        ))}
      </div>

      {/* This month's board */}
      {season.board.length === 0 ? (
        <p className="py-4 text-center text-xs text-[#9fceb4]">No entries yet this month — be first!</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {season.board.map((r) => (
            <li key={r.rank} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm">
              <span className="w-6 text-center font-bold" style={{ color: RANK_COLOR[r.rank - 1] ?? '#7faE96' }}>{r.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{r.username}</span>
              {r.prizeUsd > 0 && <span className="text-xs font-bold text-[#39ff88]">${r.prizeUsd}</span>}
              <span className="w-20 text-right font-mono text-[#39ff88]">◆ {r.value.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}

      {/* Past winners */}
      {season.past.some((p) => p.winners.length > 0) && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-1 text-xs font-bold text-[#9fceb4]">Past winners</div>
          {season.past
            .filter((p) => p.winners.length > 0)
            .map((p) => (
              <div key={p.month} className="mb-1 text-[11px]">
                <span className="text-[#7faE96]">{p.month}:</span>{' '}
                {p.winners.slice(0, 3).map((w, i) => (
                  <span key={w.rank}>
                    {i > 0 && ', '}
                    <span style={{ color: RANK_COLOR[w.rank - 1] ?? '#dffbe9' }}>{w.username}</span>
                  </span>
                ))}
                {p.paidAt ? <span className="ml-1 text-[#39ff88]">✓ paid</span> : <span className="ml-1 text-[#7faE96]">· pending</span>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
