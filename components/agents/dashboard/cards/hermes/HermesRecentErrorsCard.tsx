'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface ErrorEntry {
  ts: string;
  level: 'WARN' | 'ERROR' | 'FATAL' | 'UNKNOWN';
  message: string;
  source: string | null;
}

function formatRelativeTime(isoTs: string): string {
  const d = new Date(isoTs);
  if (Number.isNaN(d.getTime())) return isoTs;
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'just now';
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function levelStyle(level: ErrorEntry['level']): {
  border: string;
  bg: string;
  text: string;
  icon: typeof AlertTriangle;
} {
  switch (level) {
    case 'FATAL':
      return {
        border: 'border-red-500/40',
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        icon: XCircle,
      };
    case 'ERROR':
      return {
        border: 'border-red-500/30',
        bg: 'bg-red-500/[0.06]',
        text: 'text-red-400',
        icon: XCircle,
      };
    case 'WARN':
      return {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/[0.06]',
        text: 'text-amber-400',
        icon: AlertTriangle,
      };
    default:
      return {
        border: 'border-[var(--border-default)]',
        bg: 'bg-[var(--bg-card)]',
        text: 'text-[var(--text-muted)]',
        icon: AlertTriangle,
      };
  }
}

/**
 * HermesRecentErrorsCard — surfaces WARN/ERROR/FATAL lines from
 * the container's `/home/hermes/.hermes/logs/errors.log` file.
 * Parsed server-side, we render up to 10 newest-first with
 * relative timestamps.
 */
export function HermesRecentErrorsCard() {
  const { agent } = useAgentContext();
  const isActive = agent.status === 'active';
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchErrors = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getHermesErrors(agent.id);
      if (res.success) {
        setEntries(res.data.entries);
        setSourceFile(res.data.sourceFile);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load errors');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id, isActive]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  if (!isActive) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Recent errors</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Agent is paused.</p>
      </GlassCard>
    );
  }

  if (loading) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Error feed unavailable: {error}
        </div>
      </GlassCard>
    );
  }

  if (entries.length === 0) {
    return (
      <GlassCard>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Recent errors</h3>
          </div>
          {sourceFile && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono">{sourceFile}</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          All clear — no WARN/ERROR/FATAL entries in the current log window.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Recent errors</h3>
          <span className="text-[10px] text-[var(--text-muted)]">
            {entries.length} in current log
          </span>
        </div>
        {sourceFile && (
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{sourceFile}</span>
        )}
      </div>

      <div className="space-y-2">
        {entries.map((entry, idx) => {
          const style = levelStyle(entry.level);
          const Icon = style.icon;
          return (
            <div
              key={`${entry.ts}-${idx}`}
              className={`rounded-xl px-3 py-2 ${style.bg} border ${style.border}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Icon size={11} className={style.text} />
                <span className={`text-[10px] font-semibold ${style.text} uppercase tracking-wider`}>
                  {entry.level}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-auto tabular-nums">
                  {formatRelativeTime(entry.ts)}
                </span>
              </div>
              <p
                className="text-xs text-[var(--text-secondary)] line-clamp-2 break-words"
                title={entry.message}
              >
                {entry.message}
              </p>
              {entry.source && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono truncate">
                  {entry.source}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
