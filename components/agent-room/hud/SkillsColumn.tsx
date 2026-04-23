'use client';
import { useTranslations } from 'next-intl';
import type { RoomSkill } from '../types';

interface Props {
  skills: RoomSkill[];
  onSkillClick?: (key: string) => void;
}

export function SkillsColumn({ skills, onSkillClick }: Props) {
  const t = useTranslations('agentRoom.hud');
  return (
    <div className="pointer-events-auto absolute top-1/2 left-5 z-10 hidden -translate-y-1/2 flex-col gap-2 md:flex">
      {skills.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onSkillClick?.(s.key)}
          className="group cursor-pointer rounded-xl border px-3.5 py-2.5 text-left transition-all backdrop-blur-xl hover:translate-x-1.5 hover:scale-[1.02]"
          style={{
            minWidth: 170,
            background: 'rgba(12, 14, 22, 0.72)',
            borderColor: s.active ? 'var(--room-primary)' : 'var(--room-border)',
            boxShadow: s.active
              ? '0 0 20px color-mix(in srgb, var(--room-primary) 30%, transparent)'
              : undefined,
          }}
        >
          <span className="mr-2 text-base">{s.icon}</span>
          <span className="text-xs font-semibold text-gray-100">{s.label}</span>
          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-gray-400">
            {s.active ? t('skillActive') : t('skillIdle')}
            {typeof s.calls === 'number' ? ` · ${t('skillCalls', { calls: s.calls })}` : ''}
          </div>
        </button>
      ))}
    </div>
  );
}
