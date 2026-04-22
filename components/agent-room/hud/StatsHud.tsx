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
      className="pointer-events-auto absolute top-5 left-5 z-10 min-w-[240px] rounded-2xl border px-5 py-3.5 backdrop-blur-xl"
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
      <div className="mt-1.5 text-xl font-bold text-gray-100">
        {agent.name}
        <div className="mt-0.5 text-[11px] font-normal text-gray-400">uptime {uptimeLabel}</div>
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
