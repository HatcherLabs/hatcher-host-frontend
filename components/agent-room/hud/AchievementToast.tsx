'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface Achievement {
  key: string;
  threshold: number;
  label: string;
  desc: string;
  icon: string;
}

const ACHIEVEMENTS_BY_FRAMEWORK: Record<string, Achievement[]> = {
  openclaw: [
    { key: 'hatched', threshold: 1, label: 'Hatched', desc: 'Your pincer sent its first message.', icon: '🥚' },
    { key: 'warming_up', threshold: 50, label: 'Warming Up', desc: '50 messages handled.', icon: '🌡️' },
    { key: 'busy_pincer', threshold: 100, label: 'Busy Pincer', desc: '100 messages crossed.', icon: '🤏' },
    { key: 'chatty', threshold: 500, label: 'Chatty Crustacean', desc: 'Half a thousand messages.', icon: '💬' },
    { key: 'completionist', threshold: 1000, label: 'Crustacean Completionist', desc: '1,000 messages sent.', icon: '🏆' },
    { key: 'coral_master', threshold: 5000, label: 'Coral Master', desc: '5,000 messages — elite tier.', icon: '🪸' },
    { key: 'leviathan', threshold: 10000, label: 'Leviathan Pincer', desc: '10,000 messages — deep sea legend.', icon: '🦞' },
  ],
  hermes: [
    { key: 'first_letter', threshold: 1, label: 'First Letter', desc: 'Your messenger dispatched its first reply.', icon: '✉️' },
    { key: 'warming_up', threshold: 50, label: 'Quill Ready', desc: '50 dispatches across the wire.', icon: '🪶' },
    { key: 'busy_courier', threshold: 100, label: 'Busy Courier', desc: '100 messages delivered.', icon: '📨' },
    { key: 'chatty', threshold: 500, label: 'Half-Thousand Herald', desc: '500 messages carried.', icon: '📜' },
    { key: 'completionist', threshold: 1000, label: 'Librarian of the Loop', desc: '1,000 messages archived.', icon: '📚' },
    { key: 'master', threshold: 5000, label: 'Master of Missives', desc: '5,000 dispatches — canon tier.', icon: '🏛️' },
    { key: 'oracle', threshold: 10000, label: 'Silent Oracle', desc: '10,000 messages — mythic reach.', icon: '🔮' },
  ],
  elizaos: [
    { key: 'first_spark', threshold: 1, label: 'First Spark', desc: 'Your oracle answered its first call.', icon: '✨' },
    { key: 'warming_up', threshold: 50, label: 'Social Glow', desc: '50 conversations kindled.', icon: '💬' },
    { key: 'busy_oracle', threshold: 100, label: 'Busy Oracle', desc: '100 messages through the lattice.', icon: '🔮' },
    { key: 'chatty', threshold: 500, label: 'Many-Tongued', desc: 'Half a thousand voices heard.', icon: '🌊' },
    { key: 'completionist', threshold: 1000, label: 'Nexus Keeper', desc: '1,000 messages — grove tier.', icon: '🐙' },
    { key: 'master', threshold: 5000, label: 'Hive Mind', desc: '5,000 messages — swarm-level reach.', icon: '🧠' },
    { key: 'legend', threshold: 10000, label: 'Deep Current', desc: '10,000 messages — abyssal oracle.', icon: '🌌' },
  ],
  milady: [
    { key: 'first_stroke', threshold: 1, label: 'First Stroke', desc: 'Your muse made her opening mark.', icon: '🌸' },
    { key: 'warming_up', threshold: 50, label: 'Rough Sketch', desc: '50 creations in the gallery.', icon: '✏️' },
    { key: 'busy_brush', threshold: 100, label: 'Busy Brush', desc: '100 pieces rendered.', icon: '🖌️' },
    { key: 'chatty', threshold: 500, label: 'Half-Thousand Palette', desc: '500 works — prolific.', icon: '🎨' },
    { key: 'completionist', threshold: 1000, label: 'Studio Star', desc: '1,000 messages — studio darling.', icon: '⭐' },
    { key: 'master', threshold: 5000, label: 'Iconic Muse', desc: '5,000 — cult status.', icon: '💖' },
    { key: 'legend', threshold: 10000, label: 'Eternal Muse', desc: '10,000 — timeless legend.', icon: '👑' },
  ],
};

function achievementsFor(framework: string): Achievement[] {
  return ACHIEVEMENTS_BY_FRAMEWORK[framework] ?? ACHIEVEMENTS_BY_FRAMEWORK.openclaw!;
}

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
  framework: string;
}

export function AchievementToast({ agentId, messageCount, framework }: Props) {
  const t = useTranslations('agentRoom.achievements');
  const [current, setCurrent] = useState<Achievement | null>(null);

  useEffect(() => {
    const achievements = achievementsFor(framework);
    const seen = loadSeen(agentId);
    const unseen = achievements
      .filter((a) => messageCount >= a.threshold && !seen.has(a.key))
      .sort((a, b) => b.threshold - a.threshold);
    if (unseen.length === 0) return;
    const next = unseen[0]!;
    setCurrent(next);
    seen.add(next.key);
    saveSeen(agentId, seen);
    const timer = setTimeout(() => setCurrent(null), 6000);
    return () => clearTimeout(timer);
  }, [agentId, messageCount, framework]);

  if (!current) return null;

  return (
    <div
      className="pointer-events-auto absolute top-[140px] right-3 z-20 w-[min(300px,calc(100vw-24px))] rounded-2xl border px-3 py-2.5 pl-12 backdrop-blur-xl md:top-[200px] md:right-5 md:px-4 md:py-3 md:pl-14"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--room-primary) 14%, transparent), color-mix(in srgb, var(--room-primary) 4%, transparent))',
        borderColor: 'var(--room-primary)',
        animation: 'roomToastSlide 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
      }}
    >
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">{current.icon}</div>
      <div className="text-[9px] uppercase tracking-[2px] font-bold" style={{ color: 'var(--room-primary)' }}>
        {t('unlocked')}
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
