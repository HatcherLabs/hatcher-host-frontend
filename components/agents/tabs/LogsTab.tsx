'use client';

import { motion } from 'framer-motion';
import {
  Filter,
  RotateCcw,
  ScrollText,
} from 'lucide-react';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
  LOG_LEVEL_COLORS,
  type LogFilter,
} from '../AgentContext';

export function LogsTab() {
  const ctx = useAgentContext();
  const {
    agent,
    isActive,
    tab,
    logs,
    logsLoading,
    logFilter,
    setLogFilter,
    filteredLogs,
    logsEndRef,
    loadLogs,
  } = ctx;

  return (
    <motion.div key="tab-logs" className="space-y-4" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-[#71717a]" />
        {(['all', 'info', 'warn', 'error'] as LogFilter[]).map((f) => {
          const filterColors: Record<string, string> = {
            all: '',
            info: logFilter === f ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : '',
            warn: logFilter === f ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : '',
            error: logFilter === f ? 'border-red-500/40 bg-red-500/10 text-red-400' : '',
          };
          const counts = { all: logs.length, info: logs.filter(l => l.level === 'info').length, warn: logs.filter(l => l.level === 'warn').length, error: logs.filter(l => l.level === 'error').length };
          return (
            <button
              key={f}
              onClick={() => setLogFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                logFilter === f
                  ? (filterColors[f] || 'border-[#f97316]/40 bg-[#f97316]/10 text-[#FFFFFF]')
                  : 'border-[rgba(46,43,74,0.4)] text-[#71717a] hover:border-[rgba(46,43,74,0.6)] hover:text-[#A5A1C2]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="text-[10px] opacity-60">{counts[f]}</span>
            </button>
          );
        })}

        {/* SSE live indicator */}
        {isActive && tab === 'logs' && (
          <span className="flex items-center gap-1.5 ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Live
          </span>
        )}

        <button
          onClick={loadLogs}
          disabled={logsLoading}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-[rgba(46,43,74,0.4)] text-[#71717a] hover:border-[rgba(46,43,74,0.6)] hover:text-[#A5A1C2] transition-all flex items-center gap-1.5"
        >
          <RotateCcw size={12} className={logsLoading ? 'animate-spin' : ''} />
          {logsLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Log viewer */}
      <GlassCard className="!p-0 overflow-hidden">
        {/* Terminal-style header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-black/20">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-3 text-[10px] font-mono text-[#71717a]">
            {agent.name} -- {filteredLogs.length} entries
          </span>
        </div>
        <div className="log-viewer overflow-y-auto max-h-[calc(100vh-340px)] min-h-[400px] py-2">
          {logsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <ScrollText size={24} className="text-[#71717a]/50" />
              <p className="text-sm text-[#71717a]">
                {logs.length === 0 ? 'No logs available yet.' : `No ${logFilter} logs found.`}
              </p>
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div
                key={`${log.timestamp}-${i}`}
                className={`log-line log-line-${log.level}`}
              >
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2 } as Intl.DateTimeFormatOptions)}
                </span>
                <span className={`log-badge log-badge-${log.level}`}>
                  {log.level}
                </span>
                <span className={`break-all flex-1 ${LOG_LEVEL_COLORS[log.level] ?? 'text-[#A5A1C2]'}`}>{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </GlassCard>
    </motion.div>
  );
}
