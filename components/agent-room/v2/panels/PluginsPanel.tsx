'use client';
import { useCallback, useEffect, useState } from 'react';
import { PanelShell } from './PanelShell';
import { api } from '@/lib/api';

interface InstalledPlugin {
  name: string;
  type: 'skill' | 'plugin';
  source: string;
  description: string | null;
  status: 'installed' | 'pending_restart' | 'failed';
  error?: string;
  requiresRestart?: boolean;
}

interface Props {
  agentId: string;
  framework: string;
  onClose: () => void;
}

export function PluginsPanel({ agentId, framework, onClose }: Props) {
  const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAgentPlugins(agentId);
      const data = (res as { data?: { installed?: InstalledPlugin[] } }).data
        ?? (res as unknown as { installed?: InstalledPlugin[] });
      setInstalled(data.installed ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plugins.');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  return (
    <PanelShell title="Plugins" framework={framework} onClose={onClose}>
      {loading && <div className="text-sm text-neutral-400">Loading…</div>}
      {error && <div className="mb-3 rounded-lg bg-red-900/40 p-2 text-sm text-red-200">{error}</div>}
      {!loading && !error && installed.length === 0 && (
        <div className="mb-4 text-sm text-neutral-400">
          No plugins installed yet. Browse and install from the{' '}
          <a href={`/agent/${agentId}#plugins`} className="underline">dashboard</a>.
        </div>
      )}
      {installed.length > 0 && (
        <ul className="mb-4 space-y-2">
          {installed.map(p => (
            <li key={`${p.type}:${p.name}`} className="rounded-lg bg-neutral-800 p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  {p.description && <div className="truncate text-xs text-neutral-400">{p.description}</div>}
                </div>
                <span className="ml-3 flex-shrink-0 rounded-full bg-green-600 px-2 py-0.5 text-[10px] text-white">
                  {p.status === 'pending_restart' ? 'ready' : 'ok'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <a
        href={`/agent/${agentId}#plugins`}
        className="inline-block w-full rounded-lg bg-white py-2 text-center text-sm font-medium text-black hover:bg-neutral-200"
      >
        Open full editor →
      </a>
    </PanelShell>
  );
}
