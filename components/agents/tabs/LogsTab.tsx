'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownToLine,
  Bug,
  Download,
  Info,
  RotateCcw,
  ScrollText,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
  LOG_LEVEL_COLORS,
  type LogFilter,
} from '../AgentContext';

/* ── Framework log format descriptions ── */
const FRAMEWORK_LOG_INFO: Record<string, { label: string; description: string; accent: string; border: string; bg: string }> = {
  openclaw: {
    label: 'OpenClaw',
    description: 'Structured JSON logs with automatic level detection. Tool calls, LLM requests, and plugin events are tagged.',
    accent: 'text-[var(--color-info)]',
    border: 'border-[var(--color-info-border)]',
    bg: 'bg-[var(--color-info-bg)]',
  },
  hermes: {
    label: 'Hermes',
    description: 'Plain-text stdout/stderr logs. Warnings and errors are detected via keyword matching.',
    accent: 'text-[var(--accent)]',
    border: 'border-[var(--border-hover)]',
    bg: 'bg-[var(--tech-accent-soft)]',
  },
};

/* ── Level badge config ── */
const LEVEL_BADGE_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string; border: string }> = {
  info: { icon: Info, color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info-bg)]', border: 'border-[var(--color-info-border)]' },
  warn: { icon: AlertTriangle, color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-bg)]', border: 'border-[var(--color-warning-border)]' },
  error: { icon: XCircle, color: 'text-[var(--color-destructive)]', bg: 'bg-[var(--color-destructive-bg)]', border: 'border-[var(--color-destructive-border)]' },
  debug: { icon: Bug, color: 'text-zinc-400', bg: 'bg-zinc-500/15', border: 'border-zinc-500/25' },
};

export function LogsTab() {
  const tLogs = useTranslations('dashboard.agentDetail.logs');
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
    logsEndRef,
    loadLogs,
    wsLogsConnected,
  } = ctx;
  const framework = agent.framework ?? 'openclaw';
  const fwInfo = FRAMEWORK_LOG_INFO[framework] ?? FRAMEWORK_LOG_INFO.openclaw;

  const visibleLogs = logs;

  // Apply the same level-filter + search-text logic the context uses,
  // but keep this tab's counts scoped to the visible log set.
  const visibleFilteredLogs = useMemo(() => {
    let result = visibleLogs;
    if (logFilter !== 'all') {
      result = result.filter((l) => l.level === logFilter);
    }
    if (logSearch) {
      const q = logSearch.toLowerCase();
      result = result.filter((l) => l.message.toLowerCase().includes(q));
    }
    return result;
  }, [visibleLogs, logFilter, logSearch]);

  /* ── Log counts by level (over visible slice) ── */
  const counts = useMemo(() => {
    const c = { all: visibleLogs.length, info: 0, warn: 0, error: 0, debug: 0 };
    for (const l of visibleLogs) {
      if (l.level in c) c[l.level as keyof typeof c]++;
    }
    return c;
  }, [visibleLogs]);

  const handleDownload = () => {
    const text = visibleLogs
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

      {/* ── Toolbar: search + level filters + actions ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder={tLogs('searchPlaceholder')}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg pl-8 pr-8 py-1.5 text-xs font-mono text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8b5cf6]/50 focus:bg-[var(--bg-elevated)] transition-all"
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

        {/* Level filter badges */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLogFilter('all')}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              logFilter === 'all'
                ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--text-primary)]'
                : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tLogs('all')} <span className="opacity-60 text-[10px]">{logs.length}</span>
          </button>
          {(['info', 'warn', 'error', 'debug'] as const).map((level) => {
            const cfg = LEVEL_BADGE_CONFIG[level];
            const Icon = cfg.icon;
            const count = counts[level];
            if (count === 0 && level === 'debug') return null;
            return (
              <button
                key={level}
                onClick={() => setLogFilter(level === logFilter ? 'all' : level as LogFilter)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                  logFilter === level
                    ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                    : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Icon size={10} />
                <span className="uppercase font-medium">{level}</span>
                <span className={`ml-0.5 tabular-nums ${logFilter === level ? 'opacity-80' : 'opacity-50'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Connection status badge */}
        {isActive && wsLogsConnected ? (
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--status-live)] bg-[var(--status-live-bg)] px-2 py-1 rounded-full border border-[var(--status-live-border)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-live)] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--status-live)]" />
            </span>
            {tLogs('connected')}
          </span>
        ) : isActive ? (
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--status-deploying)] bg-[var(--status-deploying-bg)] px-2 py-1 rounded-full border border-[var(--status-deploying-border)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-deploying)] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--status-deploying)]" />
            </span>
            {tLogs('reconnecting')}
          </span>
        ) : null}

        {/* Action buttons */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          title={autoScroll ? tLogs('autoScrollEnabled') : tLogs('autoScrollDisabled')}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
            autoScroll
              ? 'border-[var(--status-live-border)] bg-[var(--status-live-bg)] text-[var(--status-live)]'
              : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <ArrowDownToLine size={12} />
          {autoScroll ? tLogs('pinned') : tLogs('scroll')}
        </button>

        <button
          onClick={loadLogs}
          disabled={logsLoading}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={12} className={logsLoading ? 'animate-spin' : ''} />
          {logsLoading ? tLogs('loading') : tLogs('refresh')}
        </button>

        <button
          onClick={handleDownload}
          disabled={logs.length === 0}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={12} />
          {tLogs('download')}
        </button>
      </div>

      {/* Log viewer */}
      <GlassCard className="!p-0 overflow-hidden">
        {/* Terminal-style header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-default)] bg-black/20">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-destructive)]/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-warning)]/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-live)]/60" />
          <span className="ml-3 text-[10px] font-mono text-[var(--text-muted)]">
            {agent.name} -- {tLogs('entries', { count: `${visibleFilteredLogs.length}${logSearch || logFilter !== 'all' ? ` / ${visibleLogs.length}` : ''}` })}
          </span>
          {autoScroll && (
            <span className="ml-auto text-[10px] text-[var(--status-live)] flex items-center gap-1">
              <ArrowDownToLine size={9} />
              {tLogs('pinnedToBottom')}
            </span>
          )}
        </div>
        <div className="log-viewer overflow-y-auto max-h-[calc(100dvh-400px)] min-h-[300px] sm:min-h-[400px] py-2">
          {logsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : visibleFilteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <ScrollText size={24} className="text-[var(--text-muted)]/50" />
              <p className="text-sm text-[var(--text-muted)]">
                {logs.length === 0
                  ? tLogs('noLogs')
                  : logSearch
                    ? tLogs('noLogsMatching', { query: logSearch })
                    : tLogs('noLevelLogs', { level: logFilter })}
              </p>
            </div>
          ) : (
            visibleFilteredLogs.map((log, i) => {
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
      <mark className="bg-[var(--tech-accent-soft)] text-[var(--accent)] rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
