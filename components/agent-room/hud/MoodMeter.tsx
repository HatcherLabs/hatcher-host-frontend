'use client';
import { useTranslations } from 'next-intl';
import type { RoomLogLine } from '../types';

interface Props {
  logs: RoomLogLine[];
}

type MoodKey = 'warmingUp' | 'thriving' | 'upbeat' | 'steady' | 'struggling' | 'overheating';

function moodFromLogs(logs: RoomLogLine[]): { score: number; moodKey: MoodKey; emoji: string } {
  if (logs.length === 0) return { score: 0.5, moodKey: 'warmingUp', emoji: '😐' };
  const recent = logs.slice(0, 20);
  const ok = recent.filter((l) => l.level === 'ok' || l.level === 'info').length;
  const bad = recent.filter((l) => l.level === 'error' || l.level === 'warn').length;
  const total = recent.length;
  const score = Math.max(0, Math.min(1, (ok - bad * 2) / total / 2 + 0.5));
  if (score > 0.75) return { score, moodKey: 'thriving', emoji: '😎' };
  if (score > 0.55) return { score, moodKey: 'upbeat', emoji: '🙂' };
  if (score > 0.4) return { score, moodKey: 'steady', emoji: '😐' };
  if (score > 0.25) return { score, moodKey: 'struggling', emoji: '😕' };
  return { score, moodKey: 'overheating', emoji: '🥵' };
}

export function MoodMeter({ logs }: Props) {
  const t = useTranslations('agentRoom');
  const { score, moodKey, emoji } = moodFromLogs(logs);
  const pct = Math.round(score * 100);
  return (
    <div
      className="pointer-events-auto absolute bottom-[130px] left-1/2 z-10 hidden w-[min(500px,calc(100vw-24px))] -translate-x-1/2 items-center gap-3 rounded-full border px-3.5 py-1.5 backdrop-blur-xl md:flex"
      style={{
        background: 'rgba(12, 14, 22, 0.72)',
        borderColor: 'var(--room-border)',
      }}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-[10px] uppercase tracking-[2px] text-gray-400">{t('hud.moodLabel')}</span>
      <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              score > 0.55
                ? 'linear-gradient(90deg, #6ee7b7, #34d399)'
                : score > 0.4
                  ? 'linear-gradient(90deg, var(--room-dim), var(--room-primary))'
                  : 'linear-gradient(90deg, #f97316, #ef4444)',
            boxShadow:
              score > 0.55
                ? '0 0 10px #34d399'
                : score > 0.4
                  ? '0 0 10px var(--room-primary)'
                  : '0 0 10px #ef4444',
          }}
        />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--room-bright)' }}>
        {t(`mood.${moodKey}`)}
      </span>
    </div>
  );
}
