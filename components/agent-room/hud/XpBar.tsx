'use client';

interface Props {
  level: number;
  xp: number;
  max: number;
}

export function XpBar({ level, xp, max }: Props) {
  const pct = Math.min(100, Math.round((xp / max) * 100));
  return (
    <div className="absolute bottom-[92px] left-1/2 z-10 flex w-[min(500px,80vw)] -translate-x-1/2 items-center gap-2.5 text-[10px] uppercase tracking-wider text-gray-400">
      <span>XP</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, var(--room-dim), var(--room-primary), var(--room-bright))',
            boxShadow: '0 0 10px var(--room-primary)',
          }}
        />
      </div>
      <span>
        {level} → {level + 1} · {xp.toLocaleString()} / {max.toLocaleString()}
      </span>
    </div>
  );
}
