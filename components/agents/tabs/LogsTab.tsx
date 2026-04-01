'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownToLine,
  Bug,
  Download,
  Filter,
  Info,
  Lock,
  RotateCcw,
  ScrollText,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
  LOG_LEVEL_COLORS,
  FRAMEWORK_BADGE,
  type LogFilter,
} from '../AgentContext';

/* ── Framework log format descriptions ── */
const FRAMEWORK_LOG_INFO: Record<string, { label: string; description: string; accent: string; border: string; bg: string }> = {
  openclaw: {
    label: 'OpenClaw',
    description: 'Structured JSON logs with automatic level detection. Tool calls, LLM requests, and plugin events are tagged.',
    accent: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/[0.06]',
  },
  hermes: {
    label: 'Hermes',
    description: 'Plain-text stdout/stderr logs. Warnings and errors are detected via keyword matching.',
    accent: 'text-purple-400',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/[0.06]',
  },
  elizaos: {
    label: 'ElizaOS',
    description: 'Structured logs with plugin namespaces. Actions, evaluators, and providers emit tagged entries.',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/20',
    bg: 'bg-cyan-500/[0.06]',
  },
  milady: {
    label: 'Milady',
    description: 'Hybrid log format with JSON metadata. Personality and response generation events are tracked.',
    accent: 'text-rose-400',
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/[0.06]',
  },
};

/* ── Level badge config ── */
const LEVEL_BADGE_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string; border: string }> = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/25' },
  warn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/25' },
  debug: { icon: Bug, color: 'text-zinc-400', bg: 'bg-zinc-500/15', border: 'border-zinc-500/25' },
};

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
    logSearch,
    setLogSearch,
    autoScroll,
    setAutoScroll,
    filteredLogs,
    logsEndRef,
    loadLogs,
    userTier,
  } = ctx;

  const isPro = userTier === 'pro';
  const framework = agent.framework ?? 'openclaw';
  const fwInfo = FRAMEWORK_LOG_INFO[framework] ?? FRAMEWORK_LOG_INFO.openclaw;

  /* ── Log counts by level ── */
  const counts = useMemo(() => {
    const c = { all: logs.length, info: 0, warn: 0, error: 0, debug: 0 };
    for (const l of logs) {
      if (l.level in c) c[l.level as keyof typeof c]++;
    }
    return c;
  }, [logs]);

  const handleDownload = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.name}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div key="tab-logs" className="space-y-4" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* ── Framework log format banner ── */}
      <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${fwInfo.border} ${fwInfo.bg}`}>
        <Info size={14} className={`${fwInfo.accent} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-medium ${fwInfo.accent}`}>{fwInfo.label} Logs</span>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{fwInfo.description}</p>
        </div>
      </div>

      {/* ── Log count summary ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['info', 'warn', 'error', 'debug'] as const).map((level) => {
          const cfg = LEVEL_BADGE_CONFIG[level];
          const Icon = cfg.icon;
          const count = counts[level];
          if (count === 0 && level === 'debug') return null;
          return (
            <button
              key={level}
              onClick={() => setLogFilter(level === logFilter ? 'all' : level as LogFilter)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                logFilter === level
                  ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                  : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon size={10} />
              <span className="uppercase font-medium">{level}</span>
              <span className={`ml-0.5 tabular-nums ${logFilter === level ? 'opacity-80' : 'opacity-50'}`}>{count}</span>
            </button>
          );
        })}
        <span className="text-[10px] text-[var(--text-muted)]/60 ml-1 tabular-nums">{logs.length} total</span>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-[var(--text-muted)]" />
        {(['all', 'info', 'warn', 'error'] as LogFilter[]).map((f) => {
          const filterColors: Record<string, string> = {
            all: '',
            info: logFilter === f ? 'border-blue-500/40 bg-blue-500/10 text-blue-400' : '',
            warn: logFilter === f ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : '',
            error: logFilter === f ? 'border-red-500/40 bg-red-500/10 text-red-400' : '',
          };
          return (
            <button
              key={f}
              onClick={() => setLogFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                logFilter === f
                  ? (filterColors[f] || 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[var(--text-primary)]')
                  : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="text-[10px] opacity-60">{counts[f as keyof typeof counts] ?? 0}</span>
            </button>
          );
        })}

        {/* SSE live indicator -- Pro only */}
        {isActive && tab === 'logs' && isPro && (
          <span className="flex items-center gap-1.5 ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Live
          </span>
        )}
        {!isPro && (
          <span className="flex items-center gap-1.5 ml-2 text-[10px] text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-1 rounded-full border border-[#8b5cf6]/20">
            <Lock size={10} />
            Pro
          </span>
        )}

        {/* Auto-scroll toggle */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          title={autoScroll ? 'Auto-scroll enabled — pinned to bottom' : 'Auto-scroll disabled'}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
            autoScroll
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <ArrowDownToLine size={12} className={autoScroll ? 'animate-bounce' : ''} />
          {autoScroll ? 'Pinned' : 'Auto-scroll'}
        </button>

        <button
          onClick={loadLogs}
          disabled={logsLoading}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={12} className={logsLoading ? 'animate-spin' : ''} />
          {logsLoading ? 'Loading...' : 'Refresh'}
        </button>

        <button
          onClick={handleDownload}
          disabled={logs.length === 0}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={12} />
          Download
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        <input
          type="text"
          value={logSearch}
          onChange={(e) => setLogSearch(e.target.value)}
          placeholder="Search logs..."
          className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg pl-8 pr-8 py-2 text-xs font-mono text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8b5cf6]/50 focus:bg-[var(--bg-elevated)] transition-all"
        />
        {logSearch && (
          <button
            onClick={() => setLogSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Log viewer */}
      <GlassCard className="!p-0 overflow-hidden">
        {/* Terminal-style header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-default)] bg-black/20">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-3 text-[10px] font-mono text-[var(--text-muted)]">
            {agent.name} -- {filteredLogs.length}{logSearch || logFilter !== 'all' ? ` / ${logs.length}` : ''} entries
          </span>
          {autoScroll && (
            <span className="ml-auto text-[10px] text-emerald-400/60 flex items-center gap-1">
              <ArrowDownToLine size={9} />
              pinned to bottom
            </span>
          )}
        </div>
        <div className="log-viewer overflow-y-auto max-h-[calc(100vh-400px)] min-h-[300px] sm:min-h-[400px] py-2">
          {logsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <ScrollText size={24} className="text-[var(--text-muted)]/50" />
              <p className="text-sm text-[var(--text-muted)]">
                {logs.length === 0
                  ? 'No logs available yet.'
                  : logSearch
                    ? `No logs matching "${logSearch}".`
                    : `No ${logFilter} logs found.`}
              </p>
            </div>
          ) : (
            filteredLogs.map((log, i) => {
              const badgeCfg = LEVEL_BADGE_CONFIG[log.level];
              const BadgeIcon = badgeCfg?.icon;
              return (
                <div
                  key={`${log.timestamp}-${i}`}
                  className={`log-line log-line-${log.level}`}
                >
                  <span className="log-timestamp">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2 } as Intl.DateTimeFormatOptions)}
                  </span>
                  {badgeCfg ? (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase border ${badgeCfg.bg} ${badgeCfg.border} ${badgeCfg.color}`}>
                      {BadgeIcon && <BadgeIcon size={9} />}
                      {log.level}
                    </span>
                  ) : (
                    <span className={`log-badge log-badge-${log.level}`}>
                      {log.level}
                    </span>
                  )}
                  <span className={`break-all flex-1 ${LOG_LEVEL_COLORS[log.level] ?? 'text-[var(--text-secondary)]'}`}>
                    {logSearch
                      ? highlightMatch(log.message, logSearch)
                      : log.message}
                  </span>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </GlassCard>
    </motion.div>
  );
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#8b5cf6]/30 text-[#c4b5fd] rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
