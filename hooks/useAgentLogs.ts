'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import type { LogEntry, LogFilter } from '@/components/agents/AgentContext';

export function useAgentLogs(id: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<LogFilter>('all');
  const [logSearch, setLogSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    const res = await api.getAgentLogs(id);
    setLogsLoading(false);
    if (res.success) {
      const raw = res.data.logs;
      const parsed: LogEntry[] = raw.map((entry: string | LogEntry) => {
        if (typeof entry === 'object' && entry.message) return entry;
        const line = String(entry);
        let timestamp = new Date().toISOString();
        let level: LogEntry['level'] = 'info';
        let message = line;
        const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s+(.*)/);
        if (tsMatch) { timestamp = tsMatch[1]!; message = tsMatch[2]!; }
        if (/\[?error\]?/i.test(message)) level = 'error';
        else if (/\[?warn(ing)?\]?/i.test(message)) level = 'warn';
        return { timestamp, level, message };
      });
      setLogs(parsed);
    }
  }, [id]);

  const filteredLogs = useMemo(
    () =>
      logs
        .filter((l) => logFilter === 'all' || l.level === logFilter)
        .filter((l) => !logSearch || l.message.toLowerCase().includes(logSearch.toLowerCase())),
    [logs, logFilter, logSearch],
  );

  return {
    logs, setLogs,
    logsLoading, setLogsLoading,
    logFilter, setLogFilter,
    logSearch, setLogSearch,
    autoScroll, setAutoScroll,
    logsEndRef,
    loadLogs,
    filteredLogs,
  };
}
