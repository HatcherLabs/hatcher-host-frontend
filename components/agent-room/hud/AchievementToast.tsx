'use client';
import { useEffect, useState } from 'react';

export interface Achievement {
  key: string;
  threshold: number;
  label: string;
  desc: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { key: 'hatched', threshold: 1, label: 'Hatched', desc: 'Your pincer sent its first message.', icon: '🥚' },
  { key: 'warming_up', threshold: 50, label: 'Warming Up', desc: '50 messages handled.', icon: '🌡️' },
  { key: 'busy_pincer', threshold: 100, label: 'Busy Pincer', desc: '100 messages crossed.', icon: '🤏' },
  { key: 'chatty', threshold: 500, label: 'Chatty Crustacean', desc: 'Half a thousand messages.', icon: '💬' },
  { key: 'completionist', threshold: 1000, label: 'Crustacean Completionist', desc: '1,000 messages sent.', icon: '🏆' },
  { key: 'coral_master', threshold: 5000, label: 'Coral Master', desc: '5,000 messages — elite tier.', icon: '🪸' },
  { key: 'leviathan', threshold: 10000, label: 'Leviathan Pincer', desc: '10,000 messages — deep sea legend.', icon: '🦞' },
];

function storageKey(agentId: string) {
  return `hatcher:agent-room:seen-achievements:${agentId}`;
}

function loadSeen(agentId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(storageKey(agentId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(agentId: string, seen: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(agentId), JSON.stringify(Array.from(seen)));
  } catch {
    /* ignore quota */
  }
}

interface Props {
  agentId: string;
  messageCount: number;
}

export function AchievementToast({ agentId, messageCount }: Props) {
  const [current, setCurrent] = useState<Achievement | null>(null);

  useEffect(() => {
    const seen = loadSeen(agentId);
    const unseen = ACHIEVEMENTS
      .filter((a) => messageCount >= a.threshold && !seen.has(a.key))
      .sort((a, b) => b.threshold - a.threshold);
    if (unseen.length === 0) return;
    const next = unseen[0]!;
    setCurrent(next);
    seen.add(next.key);
    saveSeen(agentId, seen);
    const t = setTimeout(() => setCurrent(null), 6000);
    return () => clearTimeout(t);
  }, [agentId, messageCount]);

  if (!current) return null;

  return (
    <div
      className="pointer-events-auto absolute top-[200px] right-5 z-20 w-[300px] rounded-2xl border px-4 py-3 pl-14 backdrop-blur-xl"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--room-primary) 14%, transparent), color-mix(in srgb, var(--room-primary) 4%, transparent))',
        borderColor: 'var(--room-primary)',
        animation: 'roomToastSlide 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
      }}
    >
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">{current.icon}</div>
      <div className="text-[9px] uppercase tracking-[2px] font-bold" style={{ color: 'var(--room-primary)' }}>
        ★ ACHIEVEMENT UNLOCKED
      </div>
      <div className="mt-0.5 text-sm font-bold text-gray-100">{current.label}</div>
      <div className="mt-0.5 text-[11px] text-gray-400 leading-snug">{current.desc}</div>
      <style>{`
        @keyframes roomToastSlide {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
