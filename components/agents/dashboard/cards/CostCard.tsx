'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, Infinity as InfinityIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { GlassCard, Skeleton } from '../../AgentContext';

interface UsageData {
  messages: {
    today: number;
    limit: number;
    isByok: boolean;
  };
}

/**
 * Daily messages consumption card — used today vs tier daily limit,
 * with a progress bar and BYOK (unlimited) badge handling. Shared
 * across all per-framework dashboards per the Etapa 1 "cost card:
 * messages/limit for v1" decision (no dollar-amount tracking).
 *
 * Polls `/agents/:id/usage` every 60s so the bar stays near-real-time
 * without hammering the API. Pauses when document.hidden.
 */
export function CostCard({ agentId }: { agentId: string }) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await api.getAgentUsage(agentId);
      if (res.success) {
        setData(res.data);
      }
    } catch {
      // Non-fatal — keep stale data
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchUsage();
    intervalRef.current = setInterval(fetchUsage, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUsage]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchUsage();
        intervalRef.current = setInterval(fetchUsage, 60_000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchUsage]);

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-2 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (!data) return null;

  const { today, limit, isByok } = data.messages;
  const pct = limit > 0 ? Math.min((today / limit) * 100, 100) : 0;
  const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-[var(--color-accent)]';

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={14} className="text-[var(--color-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Daily Messages</h3>
        {isByok && (
          <span className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <InfinityIcon size={10} />
            BYOK — unlimited
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{today}</span>
        {!isByok && limit > 0 && (
          <span className="text-sm text-[var(--text-muted)]">/ {limit} today</span>
        )}
        {isByok && <span className="text-sm text-[var(--text-muted)]">messages today</span>}
      </div>

      {!isByok && limit > 0 && (
        <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}

      {!isByok && limit > 0 && pct >= 90 && (
        <p className="text-[11px] text-red-400 mt-2">
          Close to the daily cap — upgrade your tier or switch to BYOK for unlimited.
        </p>
      )}
    </GlassCard>
  );
}
