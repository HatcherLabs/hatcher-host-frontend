'use client';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';

interface Props {
  agentId: string;
}

const BEAT_MS = 25_000;
const POLL_MS = 15_000;
const SESSION_KEY = 'hatcher:room:session-id';

function ensureSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = `sess_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // Some browsers block sessionStorage in iframes/private mode.
    return `sess_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

export function LiveViewers({ agentId }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!agentId) return;
    const sessionId = ensureSessionId();
    let alive = true;
    let beatTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function beat() {
      try {
        const res = await fetch(`${API_URL}/public/agents/${agentId}/presence/beat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) return;
        const j = (await res.json()) as { data?: { count?: number } };
        if (alive && typeof j.data?.count === 'number') setCount(j.data.count);
      } catch { /* network flaky, ignore */ }
    }

    async function poll() {
      try {
        const res = await fetch(`${API_URL}/public/agents/${agentId}/presence`, { cache: 'no-store' });
        if (!res.ok) return;
        const j = (await res.json()) as { data?: { count?: number } };
        if (alive && typeof j.data?.count === 'number') setCount(j.data.count);
      } catch { /* ignore */ }
    }

    // First beat immediately to get our session counted + seed the count.
    beat();
    beatTimer = setInterval(beat, BEAT_MS);
    pollTimer = setInterval(poll, POLL_MS);

    // Pause heartbeat when tab is hidden — idle tabs shouldn't inflate count.
    function visibility() {
      if (document.hidden) {
        if (beatTimer) { clearInterval(beatTimer); beatTimer = null; }
      } else if (!beatTimer) {
        beat();
        beatTimer = setInterval(beat, BEAT_MS);
      }
    }
    document.addEventListener('visibilitychange', visibility);

    return () => {
      alive = false;
      if (beatTimer) clearInterval(beatTimer);
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [agentId]);

  if (count == null) return null;

  return (
    <div
      className="pointer-events-none absolute top-3 right-[200px] z-10 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1.5px] backdrop-blur-xl md:top-5 md:right-[585px] md:text-[11px] md:tracking-[2px]"
      style={{
        background: 'rgba(12, 14, 22, 0.72)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
        color: '#fca5a5',
      }}
      title={`${count} ${count === 1 ? 'viewer' : 'viewers'} right now`}
    >
      <span
        className="block h-1.5 w-1.5 rounded-full bg-red-400"
        style={{ boxShadow: '0 0 8px #ef4444', animation: 'viewerBlink 1.4s infinite' }}
      />
      <span className="hidden sm:inline">
        {count} {count === 1 ? 'watching' : 'watching'}
      </span>
      <span className="sm:hidden tabular-nums">{count}</span>
      <style>{`
        @keyframes viewerBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
