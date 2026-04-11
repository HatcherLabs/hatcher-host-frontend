'use client';

import { ScrollText } from 'lucide-react';
import { useAgentContext, GlassCard, Skeleton, LOG_LEVEL_COLORS } from '../../AgentContext';

/**
 * Compact live-logs preview card. Renders the most recent ~10 log lines
 * (tail) with a "View All" button that navigates to the full Logs tab.
 *
 * Data comes from AgentContext's `logs` + `logsLoading` — the parent
 * dashboard tab subscribes to the log stream for us.
 */
export function LiveLogsPreviewCard() {
  const { logs, logsLoading, isActive, setTab } = useAgentContext();

  return (
    <GlassCard className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <ScrollText size={14} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Live Logs</h3>
          {isActive && (
            <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={() => setTab('logs')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          View All
        </button>
      </div>
      <div className="log-viewer max-h-56 overflow-y-auto py-1">
        {logsLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-muted)]">No logs available yet.</p>
          </div>
        ) : (
          logs.slice(-10).map((log, i) => (
            <div key={i} className={`log-line log-line-${log.level}`}>
              <span className="log-timestamp">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span className={`log-badge log-badge-${log.level}`}>{log.level}</span>
              <span
                className={`truncate ${
                  LOG_LEVEL_COLORS[log.level] ?? 'text-[var(--text-secondary)]'
                }`}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
