'use client';
import type { RoomAgent } from '../types';

interface Props {
  agent: RoomAgent;
  level: number;
  uptimeLabel: string;
}

export function StatsHud({ agent, level, uptimeLabel }: Props) {
  return (
    <div
      className="pointer-events-auto absolute top-3 left-3 z-10 w-[min(240px,calc(100vw-120px))] rounded-2xl border px-4 py-3 backdrop-blur-xl md:top-5 md:left-5 md:w-auto md:min-w-[240px] md:px-5 md:py-3.5"
      style={{
        background: 'rgba(12, 14, 22, 0.72)',
        borderColor: 'var(--room-border)',
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-[2px]"
        style={{ color: 'var(--room-primary)' }}
      >
        ◆ {agent.framework.toUpperCase()} AGENT · LV {level}
      </div>
      <div className="mt-1.5 text-base font-bold text-gray-100 md:text-xl">
        {agent.name}
        <div className="mt-0.5 text-[10px] font-normal text-gray-400 md:text-[11px]">
          uptime {uptimeLabel}
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
        <Stat value={agent.messageCount.toLocaleString()} label="messages" />
        <Stat value={agent.status} label="status" />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-md px-2 py-1.5"
      style={{ background: 'color-mix(in srgb, var(--room-primary) 6%, transparent)' }}
    >
      <b className="block text-sm font-bold" style={{ color: 'var(--room-primary)' }}>
        {value}
      </b>
      <span className="text-[10px] uppercase tracking-wider text-gray-400">{label}</span>
    </div>
  );
}
