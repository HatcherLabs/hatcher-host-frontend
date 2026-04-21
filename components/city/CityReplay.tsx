'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '@/lib/config';
import type { CityAgent, CityStatus } from './types';

interface ReplayHour {
  takenAt: string;
  running: number;
  totalMessages: number;
  statuses: Record<string, CityStatus>;
}

export interface ReplayOverlay {
  /** Map of agent id → overridden status for the currently scrubbed hour. */
  statuses: Record<string, CityStatus>;
  /** Label shown while scrubbing ("2h ago · 12:00 UTC"). */
  label: string;
}

interface Props {
  baseAgents: CityAgent[];
  onOverlay: (overlay: ReplayOverlay | null) => void;
}

// Formats an ISO hour slot like "14:00 · 3h ago".
function formatLabel(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const hoursAgo = Math.round((now - d.getTime()) / 3_600_000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  return hoursAgo <= 0
    ? `${hh}:00 UTC · now`
    : hoursAgo === 1
      ? `${hh}:00 UTC · 1h ago`
      : `${hh}:00 UTC · ${hoursAgo}h ago`;
}

export function CityReplay({ baseAgents, onOverlay }: Props) {
  const [hours, setHours] = useState<ReplayHour[] | null>(null);
  const [idx, setIdx] = useState<number | null>(null); // null = live/now
  const [open, setOpen] = useState(false);
  const lastIdxRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/public/city/replay`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { success?: boolean; data?: { hours: ReplayHour[] } } | null) => {
        if (cancelled || !j?.success || !j.data) return;
        // Drop empty slots up-front so the scrubber steps are meaningful.
        const filtered = j.data.hours.filter((h) => Object.keys(h.statuses).length > 0);
        if (filtered.length) setHours(filtered);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback(
    (i: number | null) => {
      setIdx(i);
      lastIdxRef.current = i;
      if (i === null || !hours?.length) {
        onOverlay(null);
        return;
      }
      const hour = hours[i];
      if (!hour) return;
      onOverlay({ statuses: hour.statuses, label: formatLabel(hour.takenAt) });
    },
    [hours, onOverlay],
  );

  // Reset overlay when agent list changes underneath us (filter flip
  // invalidates any indexed state).
  useEffect(() => {
    if (lastIdxRef.current !== null) apply(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseAgents.length]);

  const currentLabel = useMemo(() => {
    if (idx === null || !hours) return null;
    return formatLabel(hours[idx]!.takenAt);
  }, [idx, hours]);

  if (!hours || hours.length < 2) return null; // need at least 2 snapshots to scrub

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-20 max-w-sm">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="border border-slate-800 bg-[#050814]/85 px-3 py-2 font-['Press_Start_2P',monospace] text-[9px] tracking-[1px] text-slate-300 backdrop-blur hover:border-amber-400 hover:text-amber-400"
          title="Scrub the last 24h of agent activity"
        >
          ⏱ REPLAY 24h
        </button>
      ) : (
        <div className="border border-amber-400 bg-[#050814]/95 p-3 shadow-[4px_4px_0_#000] backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="font-['Press_Start_2P',monospace] text-[9px] tracking-[1px] text-amber-400">
              24H REPLAY
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => apply(null)}
                className="border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 hover:border-amber-400 hover:text-amber-400"
              >
                LIVE
              </button>
              <button
                onClick={() => {
                  apply(null);
                  setOpen(false);
                }}
                className="text-slate-500 hover:text-slate-200"
                aria-label="Close replay"
              >
                ✕
              </button>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={hours.length - 1}
            value={idx ?? hours.length - 1}
            onChange={(e) => apply(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
          <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400">
            <span>{formatLabel(hours[0]!.takenAt)}</span>
            <span className={currentLabel ? 'text-amber-400' : 'text-slate-600'}>
              {currentLabel ?? 'live'}
            </span>
            <span>now</span>
          </div>
          {idx !== null && hours[idx] && (
            <div className="mt-2 font-mono text-[12px] text-slate-400">
              running:{' '}
              <span className="text-emerald-400">{hours[idx].running}</span>
              <span className="mx-2 text-slate-700">·</span>
              total msgs: <span className="text-slate-200">
                {hours[idx].totalMessages.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
