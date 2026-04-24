'use client';
import { useCallback, useEffect, useState } from 'react';
import { PanelShell } from './PanelShell';
import { api } from '@/lib/api';

interface Props {
  agentId: string;
  framework: string;
  onClose: () => void;
}

interface MemoryData {
  memoryMd: string;
  dailyLogs: Array<{ date: string; content: string }>;
}

export function MemoryPanel({ agentId, framework, onClose }: Props) {
  const [data, setData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAgentMemory(agentId);
      const payload = (res as { data?: MemoryData }).data ?? (res as unknown as MemoryData);
      setData({
        memoryMd: payload.memoryMd ?? '',
        dailyLogs: payload.dailyLogs ?? [],
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load memory.');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  return (
    <PanelShell title="Memory" framework={framework} onClose={onClose}>
      {loading && <div className="text-sm text-neutral-400">Loading…</div>}
      {error && <div className="mb-3 rounded-lg bg-red-900/40 p-2 text-sm text-red-200">{error}</div>}
      {data && (
        <div className="space-y-4">
          {data.memoryMd && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-neutral-300">Long-term memory</h3>
              <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-950 p-3 text-xs text-neutral-200">
                {data.memoryMd}
              </pre>
            </section>
          )}
          {data.dailyLogs.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-neutral-300">Daily logs</h3>
              <ul className="space-y-2">
                {data.dailyLogs.map((log) => (
                  <li key={log.date} className="rounded-lg bg-neutral-900 p-3">
                    <div className="mb-1 text-xs text-neutral-400">{log.date}</div>
                    <pre className="whitespace-pre-wrap text-xs text-neutral-200">{log.content}</pre>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!data.memoryMd && data.dailyLogs.length === 0 && (
            <div className="text-sm text-neutral-400">
              No memory yet. Chat with your agent to build it up.
            </div>
          )}
        </div>
      )}
    </PanelShell>
  );
}
