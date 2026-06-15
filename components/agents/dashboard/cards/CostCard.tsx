'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { GlassCard, Skeleton } from '../../AgentContext';

interface UsageData {
  balance: number;
  monthlyGrant: number;
  tier: string;
}

/**
 * Account-level AI Credits card. Hosted LLM and web-search usage is
 * metered by the proxy; the UI reads the wallet balance instead of
 * estimating per-agent caps.
 */
export function CostCard(_props: { agentId: string }) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await api.getAiCreditBalance();
      if (res.success) {
        setData(res.data);
      }
    } catch {
      // Non-fatal — keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

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

  const pct = data.monthlyGrant > 0 ? Math.min((data.balance / data.monthlyGrant) * 100, 100) : 0;
  const barColor = pct < 10 ? 'bg-[var(--color-destructive)]' : pct < 25 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-accent)]';

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-[var(--color-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">AI Credits</h3>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
          {data.balance.toLocaleString()}
        </span>
        {data.monthlyGrant > 0 && (
          <span className="text-sm text-[var(--text-muted)]">/ {data.monthlyGrant.toLocaleString()} monthly grant</span>
        )}
      </div>

      {data.monthlyGrant > 0 && (
        <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}

      {data.monthlyGrant > 0 && pct < 25 && (
        <p className="text-[11px] text-[var(--color-warning)] mt-2">
          Low AI Credits balance. Top up or switch to BYOK before hosted usage pauses.
        </p>
      )}
    </GlassCard>
  );
}
