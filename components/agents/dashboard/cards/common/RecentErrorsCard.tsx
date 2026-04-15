'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';
import { timeAgo } from '@/lib/utils';

export interface ErrorEntry {
  ts: string;
  level: 'WARN' | 'ERROR' | 'FATAL' | 'UNKNOWN';
  message: string;
  source: string | null;
}

export interface ErrorsResponse {
  entries: ErrorEntry[];
  sourceFile: string | null;
}

type FetchResult =
  | { success: true; data: ErrorsResponse }
  | { success: false; error: string };

export interface RecentErrorsCardProps {
  fetchErrors: () => Promise<FetchResult>;
  /** Label suffix shown next to the count. Default: "in current log". */
  countLabel?: string;
  /** All-clear copy. Default mentions "the current log window". */
  allClearMessage?: string;
}

function levelStyle(level: ErrorEntry['level']) {
  switch (level) {
    case 'FATAL':
      return { border: 'border-red-500/40',  bg: 'bg-red-500/10',       text: 'text-red-400',  icon: XCircle };
    case 'ERROR':
      return { border: 'border-red-500/30',  bg: 'bg-red-500/[0.06]',   text: 'text-red-400',  icon: XCircle };
    case 'WARN':
      return { border: 'border-amber-500/30', bg: 'bg-amber-500/[0.06]', text: 'text-amber-400', icon: AlertTriangle };
    default:
      return { border: 'border-[var(--border-default)]', bg: 'bg-[var(--bg-card)]', text: 'text-[var(--text-muted)]', icon: AlertTriangle };
  }
}

export function RecentErrorsCard({
  fetchErrors,
  countLabel = 'in current log',
  allClearMessage = 'All clear — no WARN/ERROR/FATAL entries in the current log window.',
}: RecentErrorsCardProps) {
  const { agent } = useAgentContext();
  const isActive = agent.status === 'active';
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetchErrors();
      if (res.success) {
        setEntries(res.data.entries);
        setSourceFile(res.data.sourceFile);
        setError(null);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchErrors, isActive]);

  useEffect(() => {
    load();
  }, [load]);

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
        <p className="text-xs text-[var(--text-muted)]">{allClearMessage}</p>
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
            {entries.length} {countLabel}
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
                  {timeAgo(entry.ts, { switchToDateAfterDays: 7, dateFormat: 'short-month' })}
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
