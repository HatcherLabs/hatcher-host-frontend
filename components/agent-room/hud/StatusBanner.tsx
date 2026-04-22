'use client';
import { useEffect, useState } from 'react';

interface Props {
  status: string;
}

const LABELS: Record<string, { title: string; hint: string; tone: 'warn' | 'info' | 'err' }> = {
  paused: {
    title: 'Agent is paused',
    hint: 'Go to the dashboard and click Start to wake it up.',
    tone: 'warn',
  },
  stopped: {
    title: 'Agent is stopped',
    hint: 'Start it from the dashboard to chat.',
    tone: 'warn',
  },
  starting: {
    title: 'Agent is starting up',
    hint: 'This takes 2–4 min on first boot. Chat will be live the moment it\'s ready.',
    tone: 'info',
  },
  initializing: {
    title: 'Initializing agent',
    hint: 'Seeding config and skills — usually 2 min, first boot can be longer.',
    tone: 'info',
  },
  pending: {
    title: 'Agent pending',
    hint: 'Waiting for start signal...',
    tone: 'info',
  },
  error: {
    title: 'Agent in error state',
    hint: 'Check Integrations tab or support — last boot failed.',
    tone: 'err',
  },
  crashed: {
    title: 'Agent crashed',
    hint: 'Auto-restart will retry. If it keeps crashing, check logs.',
    tone: 'err',
  },
};

export function StatusBanner({ status }: Props) {
  const [dot, setDot] = useState(0);
  const meta = LABELS[status];

  useEffect(() => {
    if (!meta || meta.tone !== 'info') return;
    const i = setInterval(() => setDot((d) => (d + 1) % 4), 450);
    return () => clearInterval(i);
  }, [meta]);

  if (!meta || status === 'active' || status === 'running') return null;

  const color =
    meta.tone === 'err'
      ? '#ef4444'
      : meta.tone === 'warn'
        ? '#fbbf24'
        : 'var(--room-primary)';

  return (
    <div
      className="pointer-events-auto absolute top-24 left-1/2 z-30 flex w-[min(520px,92vw)] -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl"
      style={{
        background: 'rgba(12, 14, 22, 0.85)',
        borderColor: color,
        boxShadow: `0 0 28px ${color}55`,
      }}
    >
      <span
        className="block h-2 w-2 rounded-full"
        style={{
          background: color,
          animation: meta.tone === 'info' ? 'statusPulse 1.2s infinite' : undefined,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
      <div className="flex-1">
        <div className="text-xs font-bold uppercase tracking-[2px]" style={{ color }}>
          {meta.title}
          {meta.tone === 'info' ? '.'.repeat(dot) : ''}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-300">{meta.hint}</div>
      </div>
      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
