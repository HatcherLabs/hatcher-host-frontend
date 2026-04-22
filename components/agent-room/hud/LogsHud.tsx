'use client';
import type { RoomLogLine } from '../types';

interface Props {
  logs: RoomLogLine[];
}

export function LogsHud({ logs }: Props) {
  return (
    <div
      className="pointer-events-auto absolute top-3 right-3 z-10 hidden w-[280px] rounded-2xl border px-3.5 py-3 backdrop-blur-xl md:top-5 md:right-5 md:block"
      style={{
        background: 'rgba(12, 14, 22, 0.72)',
        borderColor: 'var(--room-border)',
      }}
    >
      <div
        className="mb-2 text-[10px] font-bold uppercase tracking-[2px]"
        style={{ color: 'var(--room-primary)' }}
      >
        ◆ LIVE LOGS
      </div>
      <div className="h-[140px] overflow-hidden font-mono text-[10px] leading-snug text-gray-400">
        {logs.slice(0, 8).map((l, i) => (
          <div
            key={`${l.time}-${i}`}
            className="border-b border-white/[0.04] py-0.5"
          >
            <span className="mr-1.5" style={{ color: 'var(--room-dim)' }}>
              {l.time}
            </span>
            <span
              className="mr-1 text-[9px] uppercase"
              style={{ color: 'var(--room-bright)' }}
            >
              {l.level}
            </span>
            {l.text}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Waiting for logs...</div>
        )}
      </div>
    </div>
  );
}
