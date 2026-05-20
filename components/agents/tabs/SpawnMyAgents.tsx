'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, Copy, ExternalLink, RefreshCw, Rocket, Send, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import type {
  SpawnAgent,
  SpawnEvent,
  SpawnPaymentInstructions,
  SpawnPositionsResponse,
  SpawnStatusResponse,
  SpawnTrade,
} from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function formatSol(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 4 })} SOL`;
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function solscanTx(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

function solscanAddress(address: string): string {
  return `https://solscan.io/account/${address}`;
}

export function SpawnMyAgents({
  agentId,
  payment,
}: {
  agentId: string;
  payment: SpawnPaymentInstructions | null;
}) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<SpawnAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [selected, setSelected] = useState<SpawnAgent | null>(null);
  const [status, setStatus] = useState<SpawnStatusResponse | null>(null);
  const [events, setEvents] = useState<SpawnEvent[]>([]);
  const [trades, setTrades] = useState<SpawnTrade[]>([]);
  const [positions, setPositions] = useState<SpawnPositionsResponse | null>(null);

  const ownerWallet = useMemo(() => payment?.owner_wallet ?? selected?.owner_wallet ?? null, [payment, selected]);

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAgentSpawnAgents(agentId);
      if (res.success) {
        setAgents(res.data.agents ?? []);
      } else {
        toast.error(`Spawn unavailable: ${res.error}`);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId, toast]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    setStatus(null);
  }, [payment?.reference]);

  const refreshStatus = useCallback(async () => {
    const reference = payment?.reference;
    const spawnAgentId = payment?.agent_id ?? selected?.id;
    if (!reference && !spawnAgentId) return;
    const res = await api.getAgentSpawnStatus(agentId, {
      ...(reference ? { ref: reference } : {}),
      ...(spawnAgentId ? { agentId: spawnAgentId } : {}),
    });
    if (res.success) {
      setStatus(res.data);
      if (res.data.status === 'confirmed') void loadAgents();
    }
  }, [agentId, loadAgents, payment?.agent_id, payment?.reference, selected?.id]);

  useEffect(() => {
    if (!payment?.reference || status?.status === 'confirmed') return;
    void refreshStatus();
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [payment?.reference, refreshStatus, status?.status]);

  const fundSpawnDeposit = async () => {
    if (!payment) return;
    setFunding(true);
    try {
      const res = await api.fundAgentSpawnDeposit(agentId, {
        recipient: payment.recipient,
        amount: payment.amount,
        reference: payment.reference,
        paymentId: payment.payment_id,
      });
      if (res.success) {
        toast.success(`Deposit sent: ${short(res.data.transfer.signature)}`);
        void refreshStatus();
      } else {
        toast.error(`Deposit failed: ${res.error}`);
      }
    } finally {
      setFunding(false);
    }
  };

  const inspectAgent = async (spawnAgent: SpawnAgent) => {
    setSelected(spawnAgent);
    const [tradesRes, positionsRes, eventsRes] = await Promise.all([
      api.getAgentSpawnTrades(agentId, spawnAgent.id, { limit: 20 }),
      api.getAgentSpawnPositions(agentId, spawnAgent.id),
      api.getAgentSpawnEvents(agentId, {
        since: Date.now() - 24 * 60 * 60 * 1000,
        agentId: spawnAgent.id,
        limit: 50,
      }),
    ]);
    if (tradesRes.success) setTrades(tradesRes.data.trades ?? []);
    if (positionsRes.success) setPositions(positionsRes.data);
    if (eventsRes.success) setEvents(eventsRes.data.events ?? []);
  };

  return (
    <div className="space-y-5">
      {ownerWallet && (
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <Wallet size={14} />
            Owner wallet
            <span className="font-mono text-[var(--text-primary)]">{short(ownerWallet)}</span>
            <button type="button" onClick={() => void copyText(ownerWallet)} className="text-[var(--accent)]">
              <Copy size={13} />
            </button>
          </div>
        </GlassCard>
      )}

      {payment && (
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Payment instructions</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Funding sends SOL from the Hatcher agent wallet with the Spawn reference key.</p>
            </div>
            <button type="button" onClick={() => void refreshStatus()} className="btn-secondary inline-flex items-center gap-2">
              <Activity size={14} />
              Status
            </button>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <InfoRow label="Agent" value={`${payment.agent_name} (${short(payment.agent_id)})`} />
            <InfoRow label="Amount" value={formatSol(payment.amount)} />
            <InfoRow label="Recipient" value={short(payment.recipient)} copyValue={payment.recipient} onCopy={copyText} />
            <InfoRow label="Reference" value={short(payment.reference)} copyValue={payment.reference} onCopy={copyText} />
            {status && <InfoRow label="Status" value={status.status} />}
          </div>
          <button
            type="button"
            onClick={() => void fundSpawnDeposit()}
            disabled={funding}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Send size={15} />
            {funding ? 'Funding...' : 'Fund deposit'}
          </button>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">My Spawn agents</h3>
          <button type="button" onClick={() => void loadAgents()} className="btn-secondary inline-flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {agents.length === 0 && (
            <div className="rounded-md border border-[var(--border-default)] px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              No Spawn agents returned for this agent wallet yet.
            </div>
          )}
          {agents.map((spawnAgent) => (
            <button
              type="button"
              key={spawnAgent.id}
              onClick={() => void inspectAgent(spawnAgent)}
              className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${
                selected?.id === spawnAgent.id
                  ? 'border-[var(--accent)] bg-[rgba(74,222,128,0.08)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">{spawnAgent.name}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{short(spawnAgent.id)} - {spawnAgent.status}</div>
                </div>
                <div className="text-right text-xs text-[var(--text-muted)]">
                  <div>{formatSol(spawnAgent.total_pnl_sol)}</div>
                  <div>{spawnAgent.total_trades ?? 0} trades</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      {selected && (
        <GlassCard className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{selected.name}</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{selected.status} - {selected.agent_type ?? 'spawn agent'}</p>
            </div>
            {selected.agent_wallet && (
              <a href={solscanAddress(selected.agent_wallet)} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
                <ExternalLink size={14} />
                Agent wallet
              </a>
            )}
          </div>
          <div className="mt-4 grid gap-4">
            <DetailPanel title="Positions" empty={!positions || (!positions.memecoin?.length && !positions.prediction?.length)}>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[var(--text-muted)]">{formatJson(positions ?? {})}</pre>
            </DetailPanel>
            <DetailPanel title="Trades" empty={trades.length === 0}>
              <div className="space-y-2">
                {trades.slice(0, 8).map((trade) => (
                  <div key={String(trade.id)} className="rounded-md border border-[var(--border-default)] p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{trade.action}</span>
                      <span className="text-[var(--text-muted)]">{formatSol(trade.amount_sol)}</span>
                    </div>
                    <div className="mt-1 font-mono text-[var(--text-muted)]">{short(trade.token_address)}</div>
                    {trade.tx_signature && (
                      <a href={solscanTx(trade.tx_signature)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[var(--accent)]">
                        tx <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </DetailPanel>
            <DetailPanel title="Events" empty={events.length === 0}>
              <div className="space-y-2">
                {events.slice(0, 10).map((event) => (
                  <div key={String(event.id)} className="rounded-md border border-[var(--border-default)] p-2 text-xs">
                    <div className="font-medium text-[var(--text-primary)]">{event.type}</div>
                    <div className="mt-1 text-[var(--text-muted)]">{new Date(event.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </DetailPanel>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyValue,
  onCopy,
}: {
  label: string;
  value: string;
  copyValue?: string;
  onCopy?: (value: string) => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-default)] px-3 py-2">
      <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</span>
      <span className="flex min-w-0 items-center gap-2 font-mono text-xs text-[var(--text-primary)]">
        <span className="truncate">{value}</span>
        {copyValue && onCopy && (
          <button type="button" onClick={() => void onCopy(copyValue)} className="text-[var(--accent)]">
            <Copy size={12} />
          </button>
        )}
      </span>
    </div>
  );
}

function DetailPanel({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--border-default)] p-3">
      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{title}</h4>
      <div className="mt-3">
        {empty ? (
          <div className="rounded-md border border-dashed border-[var(--border-default)] px-3 py-6 text-center text-xs text-[var(--text-muted)]">
            No data yet.
          </div>
        ) : children}
      </div>
    </div>
  );
}
