'use client';
import type { RoomSkill } from '../types';

interface Props {
  skills: RoomSkill[];
}

export function SkillsColumn({ skills }: Props) {
  return (
    <div className="pointer-events-auto absolute top-1/2 left-5 z-10 flex -translate-y-1/2 flex-col gap-2">
      {skills.map((s) => (
        <div
          key={s.key}
          className="cursor-pointer rounded-xl border px-3.5 py-2.5 transition-all backdrop-blur-xl"
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
            {s.active ? 'ACTIVE' : 'IDLE'}
            {typeof s.calls === 'number' ? ` · ${s.calls} calls` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
