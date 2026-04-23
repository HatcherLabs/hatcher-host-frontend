'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  status: string;
}

type StatusKey = 'paused' | 'stopped' | 'starting' | 'initializing' | 'pending' | 'error' | 'crashed';

const STATUS_TONE: Record<string, 'warn' | 'info' | 'err'> = {
  paused: 'warn',
  stopped: 'warn',
  starting: 'info',
  initializing: 'info',
  pending: 'info',
  error: 'err',
  crashed: 'err',
};

const KNOWN_STATUSES = new Set<string>(['paused', 'stopped', 'starting', 'initializing', 'pending', 'error', 'crashed']);

export function StatusBanner({ status }: Props) {
  const t = useTranslations('agentRoom.status');
  const [dot, setDot] = useState(0);
  const tone = STATUS_TONE[status];

  useEffect(() => {
    if (!tone || tone !== 'info') return;
    const i = setInterval(() => setDot((d) => (d + 1) % 4), 450);
    return () => clearInterval(i);
  }, [tone]);

  if (!tone || status === 'active' || status === 'running') return null;
  if (!KNOWN_STATUSES.has(status)) return null;

  const sk = status as StatusKey;

  const color =
    tone === 'err'
      ? '#ef4444'
      : tone === 'warn'
        ? '#fbbf24'
        : 'var(--room-primary)';

  return (
    <div
      className="pointer-events-auto absolute top-[74px] left-1/2 z-30 flex w-[min(520px,calc(100vw-16px))] -translate-x-1/2 items-center gap-3 rounded-xl border px-3 py-2.5 backdrop-blur-xl md:top-24 md:px-4 md:py-3"
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
          animation: tone === 'info' ? 'statusPulse 1.2s infinite' : undefined,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
      <div className="flex-1">
        <div className="text-xs font-bold uppercase tracking-[2px]" style={{ color }}>
          {t(`${sk}.title`)}
          {tone === 'info' ? '.'.repeat(dot) : ''}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-300">{t(`${sk}.hint`)}</div>
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
