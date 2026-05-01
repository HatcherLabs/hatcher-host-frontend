'use client';
import { useCallback, useEffect, useState } from 'react';
import { PanelShell } from './PanelShell';
import { api } from '@/lib/api';

interface Props {
  agentId: string;
  framework: string;
  status: string;
  uptimeSec?: number;
  messagesToday?: number;
  tier?: string;
  onAction: () => void;
  onClose: () => void;
}

type Action = 'start' | 'stop' | 'restart';

export function StatusPanel({
  agentId,
  framework,
  status,
  uptimeSec,
  messagesToday,
  tier,
  onAction,
  onClose,
}: Props) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reputation, setReputation] = useState<{
    scorePct: number | null;
    total: number;
    onChainCount: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.getAgentReputation(agentId).then((r) => {
      if (cancelled || !r.success) return;
      setReputation({
        scorePct: r.data.scorePct,
        total: r.data.total,
        onChainCount: r.data.onChain.attestationCount,
      });
    }).catch(() => { /* best-effort */ });
    return () => { cancelled = true; };
  }, [agentId]);

  const run = useCallback(async (action: Action) => {
    setBusy(action);
    setError(null);
    try {
      if (action === 'start') await api.startAgent(agentId);
      else if (action === 'stop') await api.stopAgent(agentId);
      else await api.restartAgent(agentId);
      onAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  }, [agentId, onAction]);

  // Backend uses 'active' and sometimes 'running' / 'starting'; treat any
  // of them as "up" so Stop is enabled and Start is disabled correctly.
  const isRunning = status === 'active' || status === 'running' || status === 'starting';
  const minsUp = uptimeSec ? Math.floor(uptimeSec / 60) : 0;

  return (
    <PanelShell title="Status" framework={framework} onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Status" value={status} />
        <Stat label="Tier" value={tier ?? '—'} />
        <Stat label="Uptime" value={uptimeSec ? `${minsUp}m` : '—'} />
        <Stat label="Msgs today" value={messagesToday ?? '—'} />
      </div>
      {reputation && (reputation.total > 0 || reputation.onChainCount > 0) && (
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-2">
          <Stat
            label="★ Reputation"
            value={reputation.scorePct !== null ? `${reputation.scorePct}% (${reputation.total})` : '—'}
          />
          <Stat
            label="On-chain"
            value={reputation.onChainCount > 0 ? `${reputation.onChainCount} attestation${reputation.onChainCount === 1 ? '' : 's'}` : '—'}
          />
        </div>
      )}
      {error && <div className="mb-3 rounded-lg bg-red-900/40 p-2 text-sm text-red-200">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={() => run('start')}
          disabled={busy !== null || isRunning}
          className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium hover:bg-green-500 disabled:opacity-40"
        >
          {busy === 'start' ? '…' : 'Start'}
        </button>
        <button
          onClick={() => run('stop')}
          disabled={busy !== null || !isRunning}
          className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-40"
        >
          {busy === 'stop' ? '…' : 'Stop'}
        </button>
        <button
          onClick={() => run('restart')}
          disabled={busy !== null}
          className="flex-1 rounded-lg bg-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-600 disabled:opacity-40"
        >
          {busy === 'restart' ? '…' : 'Restart'}
        </button>
      </div>
    </PanelShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-neutral-800 p-3">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-1 truncate text-base font-medium">{value}</div>
    </div>
  );
}
