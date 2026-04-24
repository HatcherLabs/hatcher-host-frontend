'use client';
import { useCallback, useEffect, useState } from 'react';
import { PanelShell } from './PanelShell';
import { api } from '@/lib/api';

interface Props {
  agentId: string;
  framework: string;
  onClose: () => void;
}

export function LogsPanel({ agentId, framework, onClose }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAgentLogs(agentId);
      const raw = (res as { data?: { logs?: unknown } }).data?.logs ?? (res as { logs?: unknown }).logs;
      let arr: string[] = [];
      if (Array.isArray(raw)) arr = raw.map(l => (typeof l === 'string' ? l : JSON.stringify(l)));
      else if (typeof raw === 'string') arr = raw.split('\n');
      setLines(arr);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  return (
    <PanelShell title="Logs" framework={framework} onClose={onClose}>
      <div className="mb-3 flex items-center justify-between text-xs text-neutral-400">
        <span>{lines.length} lines</span>
        <button onClick={load} className="rounded bg-neutral-800 px-2 py-1 hover:bg-neutral-700">Refresh</button>
      </div>
      {loading && <div className="text-sm text-neutral-400">Loading…</div>}
      {error && <div className="mb-3 rounded-lg bg-red-900/40 p-2 text-sm text-red-200">{error}</div>}
      <pre className="max-h-[60vh] overflow-auto rounded-lg bg-neutral-950 p-3 font-mono text-[11px] leading-snug text-neutral-200">
        {lines.length === 0 && !loading && !error && '— no logs yet —'}
        {lines.join('\n')}
      </pre>
    </PanelShell>
  );
}
