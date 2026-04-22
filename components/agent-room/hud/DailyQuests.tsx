'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface Quest {
  key: string;
  label: string;
  desc: string;
  icon: string;
  target: number;
}

const QUEST_POOL: Quest[] = [
  { key: 'chat5', label: 'Daily Standup', desc: 'Send 5 messages to your agent.', icon: '💬', target: 5 },
  { key: 'chat10', label: 'Chatty Mode', desc: 'Send 10 messages in one session.', icon: '🗯️', target: 10 },
  { key: 'chat20', label: 'Power User', desc: 'Send 20 messages today.', icon: '⚡', target: 20 },
  { key: 'visit', label: 'Visit the Room', desc: 'Open the Agent Room today.', icon: '🏠', target: 1 },
  { key: 'leaderboard', label: 'Check the Ranks', desc: 'Open the leaderboard modal.', icon: '🏆', target: 1 },
  { key: 'memory', label: 'Read the Scrolls', desc: 'Open the agent memory panel.', icon: '📜', target: 1 },
  { key: 'share', label: 'Show Off', desc: 'Tap Share or Embed to signal-boost your agent.', icon: '📸', target: 1 },
  { key: 'voice', label: 'Voice It', desc: 'Turn on voice mode.', icon: '🎤', target: 1 },
];

interface DailyState {
  date: string;        // YYYY-MM-DD local
  questKeys: string[]; // 3 chosen per day, stable for that day
  progress: Record<string, number>;
  claimed: boolean;
  streak: number;
  lastClaimedDate: string | null;
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayStr(today: string): string {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return todayStr.call({}) !== today ? today : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function storageKey(agentId: string) {
  return `hatcher:agent-room:daily:${agentId}`;
}

function pickDailyQuests(seed: string): Quest[] {
  // Simple deterministic rotation: seeded by date-string hash so each day has
  // the same 3 quests for everyone, no server needed.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const pool = [...QUEST_POOL];
  const out: Quest[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = h % pool.length;
    h = Math.floor(h / pool.length) || h * 7 + 13;
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return out;
}

function loadState(agentId: string): DailyState {
  const today = todayStr();
  if (typeof window === 'undefined') {
    return {
      date: today,
      questKeys: pickDailyQuests(today).map((q) => q.key),
      progress: {},
      claimed: false,
      streak: 0,
      lastClaimedDate: null,
    };
  }
  try {
    const raw = localStorage.getItem(storageKey(agentId));
    if (!raw) throw new Error('fresh');
    const s = JSON.parse(raw) as DailyState;
    if (s.date !== today) {
      // Roll over — streak continues only if we claimed yesterday's.
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      const continued = s.lastClaimedDate === yStr;
      return {
        date: today,
        questKeys: pickDailyQuests(today).map((q) => q.key),
        progress: {},
        claimed: false,
        streak: continued ? s.streak : 0,
        lastClaimedDate: s.lastClaimedDate,
      };
    }
    return s;
  } catch {
    return {
      date: today,
      questKeys: pickDailyQuests(today).map((q) => q.key),
      progress: {},
      claimed: false,
      streak: 0,
      lastClaimedDate: null,
    };
  }
}

function saveState(agentId: string, s: DailyState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(agentId), JSON.stringify(s));
  } catch { /* quota */ }
}

export function useDailyQuests(agentId: string) {
  const [state, setState] = useState<DailyState>(() => loadState(agentId));

  useEffect(() => {
    setState(loadState(agentId));
  }, [agentId]);

  const bump = useCallback((questKey: string, by = 1) => {
    setState((prev) => {
      if (!prev.questKeys.includes(questKey)) return prev;
      const nextProgress = { ...prev.progress, [questKey]: (prev.progress[questKey] ?? 0) + by };
      const next = { ...prev, progress: nextProgress };
      saveState(agentId, next);
      return next;
    });
  }, [agentId]);

  const claim = useCallback(() => {
    setState((prev) => {
      if (prev.claimed) return prev;
      const next: DailyState = {
        ...prev,
        claimed: true,
        streak: prev.streak + 1,
        lastClaimedDate: prev.date,
      };
      saveState(agentId, next);
      return next;
    });
  }, [agentId]);

  return { state, bump, claim };
}

interface Props {
  agentId: string;
  state: DailyState;
  onClaim: () => void;
}

export function DailyQuestsButton({ agentId, state, onClaim }: Props) {
  const [open, setOpen] = useState(false);
  const quests = useMemo(
    () => state.questKeys.map((k) => QUEST_POOL.find((q) => q.key === k)!).filter(Boolean),
    [state.questKeys],
  );
  const allDone = quests.every((q) => (state.progress[q.key] ?? 0) >= q.target);
  const completeCount = quests.filter((q) => (state.progress[q.key] ?? 0) >= q.target).length;

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute top-[88px] right-3 z-20 hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] backdrop-blur-xl transition-all hover:scale-105 sm:flex md:top-5 md:right-[495px] md:text-[11px] md:tracking-[2px]"
        style={{
          background: 'rgba(12, 14, 22, 0.82)',
          borderColor: allDone ? 'var(--room-primary)' : 'var(--room-border)',
          color: 'var(--room-bright)',
          boxShadow: allDone
            ? '0 0 20px color-mix(in srgb, var(--room-primary) 40%, transparent)'
            : '0 0 14px color-mix(in srgb, var(--room-primary) 16%, transparent)',
        }}
        title="Daily quests"
      >
        <span aria-hidden>{state.streak > 0 ? '🔥' : '📅'}</span>
        <span className="hidden sm:inline">
          {state.streak > 0 ? `${state.streak}d` : 'Daily'} · {completeCount}/{quests.length}
        </span>
      </button>
      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm md:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-2xl border backdrop-blur-xl"
            style={{
              background: 'rgba(12, 14, 22, 0.94)',
              borderColor: 'var(--room-primary)',
              boxShadow: '0 0 60px color-mix(in srgb, var(--room-primary) 30%, transparent)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div>
                <div
                  className="text-[10px] uppercase tracking-[3px]"
                  style={{ color: 'var(--room-primary)' }}
                >
                  DAILY QUESTS
                </div>
                <div className="mt-1 text-base font-bold text-gray-100">
                  {state.streak > 0 ? (
                    <>🔥 {state.streak}-day streak</>
                  ) : (
                    <>Build your streak</>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-xs uppercase tracking-wider text-gray-400 hover:text-gray-200"
              >
                ESC
              </button>
            </div>
            <div className="space-y-2 px-5 py-4">
              {quests.map((q) => {
                const progress = state.progress[q.key] ?? 0;
                const done = progress >= q.target;
                const pct = Math.min(100, Math.round((progress / q.target) * 100));
                return (
                  <div
                    key={q.key}
                    className="rounded-lg border p-3"
                    style={{
                      borderColor: done
                        ? 'var(--room-primary)'
                        : 'rgba(255,255,255,0.06)',
                      background: done
                        ? 'color-mix(in srgb, var(--room-primary) 8%, transparent)'
                        : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{q.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-100">{q.label}</div>
                          <div className="text-[11px] text-gray-400">{q.desc}</div>
                        </div>
                      </div>
                      <span
                        className="tabular-nums text-xs font-bold"
                        style={{ color: done ? 'var(--room-primary)' : '#9ca3af' }}
                      >
                        {Math.min(progress, q.target)} / {q.target}
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: done ? 'var(--room-primary)' : 'var(--room-dim)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/5 px-5 py-4">
              <button
                disabled={!allDone || state.claimed}
                onClick={onClaim}
                className="w-full rounded-lg px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: allDone && !state.claimed ? 'var(--room-primary)' : 'rgba(255,255,255,0.05)',
                  color: allDone && !state.claimed ? '#1a1400' : '#9ca3af',
                }}
              >
                {state.claimed
                  ? `Claimed — come back tomorrow 🌙`
                  : allDone
                    ? `Claim · extend streak to ${state.streak + 1}d 🔥`
                    : `Complete all quests to claim`}
              </button>
              <div className="mt-2 text-center text-[10px] uppercase tracking-wider text-gray-500">
                agent: {agentId.slice(0, 8)}… · rotates at midnight
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
