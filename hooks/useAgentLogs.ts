'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import type { LogEntry, LogFilter } from '@/components/agents/AgentContext';

function normalizeLogLevel(raw: unknown, fallback: LogEntry['level']): LogEntry['level'] {
  if (typeof raw === 'number') {
    if (raw >= 50) return 'error';
    if (raw >= 40) return 'warn';
    return 'info';
  }

  if (typeof raw !== 'string') return fallback;

  const level = raw.toLowerCase();
  if (level.includes('error') || level.includes('fatal')) return 'error';
  if (level.includes('warn')) return 'warn';
  return 'info';
}

function normalizeTimestamp(raw: unknown): string | null {
  if (typeof raw === 'string' && raw) return raw;
  if (typeof raw !== 'number') return null;

  const millis = raw < 1_000_000_000_000 ? raw * 1000 : raw;
  return new Date(millis).toISOString();
}

function parseStructuredLog(message: string, fallbackTimestamp: string): LogEntry | null {
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return null;

  try {
    const parsed = JSON.parse(message.slice(jsonStart)) as Record<string, unknown>;
    const structuredMessage = parsed.msg ?? parsed.message ?? parsed.event;

    return {
      timestamp:
        normalizeTimestamp(parsed.time ?? parsed.timestamp ?? parsed.ts) ?? fallbackTimestamp,
      level: normalizeLogLevel(parsed.level ?? parsed.severity, 'info'),
      message:
        typeof structuredMessage === 'string'
          ? structuredMessage
          : JSON.stringify(parsed),
    };
  } catch {
    return null;
  }
}

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
        const structured = parseStructuredLog(message, timestamp);
        if (structured) return structured;
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
