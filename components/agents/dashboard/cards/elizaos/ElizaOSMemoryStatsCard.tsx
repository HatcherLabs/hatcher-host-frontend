'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Brain } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface MemoryData {
  total: number;
  returned: number;
  last24h: number;
}

/**
 * ElizaOS memory stats card. Shows total memory count + 24h delta
 * (memories newer than `Date.now() - 24h`). Derives the delta from
 * the `createdAt` millisecond timestamps on the returned sample —
 * no backend change required, even though the sample is capped.
 *
 * If the sample cap hides the true 24h delta (e.g. 1000 memories
 * created today but only 200 returned), the card shows "≥N" to
 * flag the lower bound. Good enough for the dashboard teaser; the
 * full picture lives in the Memory tab.
 */
export function ElizaOSMemoryStatsCard() {
  const { agent, setTab } = useAgentContext();
  const [data, setData] = useState<MemoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await api.getElizaosMemories(agent.id);
      if (res.success) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const last24h = res.data.memories.filter((m) => m.createdAt >= cutoff).length;
        setData({
          total: res.data.total,
          returned: res.data.returned,
          last24h,
        });
        setTruncated(res.data.returned < res.data.total);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load memories');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Memories unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Memory</h3>
        </div>
        <button
          onClick={() => setTab('memory')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          Browse
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
            {data.total}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Total memories</div>
        </div>
        <div className="rounded-xl px-3 py-2.5 bg-cyan-500/10 border border-cyan-500/20">
          <div className="text-lg font-bold text-cyan-400 tabular-nums">
            {truncated && data.last24h === data.returned ? '≥' : ''}
            {data.last24h}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Last 24h</div>
        </div>
      </div>

      {truncated && (
        <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">
          Showing {data.returned} of {data.total} in the 24h sample — the real 24h count may be higher.
        </p>
      )}
    </GlassCard>
  );
}
