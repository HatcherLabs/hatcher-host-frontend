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
import { useToast } from '@/components/ui/ToastProvider';
import { GlassCard, useAgentContext } from '@/components/agents/AgentContext';

const DEFAULT_DNA = {
  trades_memecoins: true,
  trades_prediction: false,
  aggression: 0.65,
  patience: 0.45,
  risk_tolerance: 0.55,
  sell_profit_pct: 100,
  sell_loss_pct: 25,
  max_position_pct: 20,
  max_trade_sol: 0.05,
  launchpads: ['pump', 'jupiter'],
  require_socials: true,
};

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function formatSol(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 4 })} SOL`;
}

function solscanTx(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

function solscanAddress(address: string): string {
  return `https://solscan.io/account/${address}`;
}

export function SpawnTab() {
  const { agent } = useAgentContext();
  const { toast } = useToast();
  const [agents, setAgents] = useState<SpawnAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [funding, setFunding] = useState(false);
  const [selected, setSelected] = useState<SpawnAgent | null>(null);
  const [payment, setPayment] = useState<SpawnPaymentInstructions | null>(null);
  const [status, setStatus] = useState<SpawnStatusResponse | null>(null);
  const [events, setEvents] = useState<SpawnEvent[]>([]);
  const [trades, setTrades] = useState<SpawnTrade[]>([]);
  const [positions, setPositions] = useState<SpawnPositionsResponse | null>(null);
  const [name, setName] = useState(`${agent.name} Spawn`);
  const [solAmount, setSolAmount] = useState('0.2');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [dnaJson, setDnaJson] = useState(JSON.stringify(DEFAULT_DNA, null, 2));
  const [formError, setFormError] = useState<string | null>(null);

  const ownerWallet = useMemo(() => payment?.owner_wallet ?? selected?.owner_wallet ?? null, [payment, selected]);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAgentSpawnAgents(agent.id);
      if (res.success) {
        setAgents(res.data.agents ?? []);
      } else {
        toast.error(`Spawn unavailable: ${res.error}`);
      }
    } finally {
      setLoading(false);
    }
  }, [agent.id, toast]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const createSpawnAgent = async () => {
    setFormError(null);
    let dna: Record<string, unknown>;
    try {
      dna = JSON.parse(dnaJson) as Record<string, unknown>;
    } catch {
      setFormError('DNA must be valid JSON.');
      return;
    }
    const amount = Number(solAmount);
    if (!Number.isFinite(amount) || amount < 0.2) {
      setFormError('Spawn requires at least 0.2 SOL.');
      return;
    }
    setCreating(true);
    try {
      const res = await api.createAgentSpawnAgent(agent.id, {
        name,
        solAmount: amount,
        dna,
        meta: {
          ...(avatar.trim() ? { avatar: avatar.trim() } : {}),
          ...(bio.trim() ? { bio: bio.trim() } : {}),
        },
      });
      if (res.success) {
        setPayment(res.data);
        setStatus(null);
        toast.success('Spawn payment prepared. Review the deposit before funding.');
      } else {
        setFormError(res.error);
      }
    } finally {
      setCreating(false);
    }
  };

  const fundSpawnDeposit = async () => {
    if (!payment) return;
    setFunding(true);
    try {
      const res = await api.fundAgentSpawnDeposit(agent.id, {
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

  const refreshStatus = async () => {
    const reference = payment?.reference;
    const spawnAgentId = payment?.agent_id ?? selected?.id;
    if (!reference && !spawnAgentId) return;
    const res = await api.getAgentSpawnStatus(agent.id, {
      ...(reference ? { ref: reference } : {}),
      ...(spawnAgentId ? { agentId: spawnAgentId } : {}),
    });
    if (res.success) {
      setStatus(res.data);
      if (res.data.status === 'confirmed') void loadAgents();
    }
  };

  const inspectAgent = async (spawnAgent: SpawnAgent) => {
    setSelected(spawnAgent);
    const [tradesRes, positionsRes, eventsRes] = await Promise.all([
      api.getAgentSpawnTrades(agent.id, spawnAgent.id, { limit: 20 }),
      api.getAgentSpawnPositions(agent.id, spawnAgent.id),
      api.getAgentSpawnEvents(agent.id, {
        since: Date.now() - 24 * 60 * 60 * 1000,
        agentId: spawnAgent.id,
        limit: 50,
      }),
    ]);
    if (tradesRes.success) setTrades(tradesRes.data.trades ?? []);
    if (positionsRes.success) setPositions(positionsRes.data);
    if (eventsRes.success) setEvents(eventsRes.data.events ?? []);
  };

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  return (
    <div className="space-y-5">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Rocket size={18} className="text-[var(--phosphor)]" />
              <h2 className="text-lg font-semibold">Spawn Partner Agents</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
              Create external Spawn agents from this Hatcher agent. Hatcher sends only the public owner wallet and
              deposit transaction; Spawn provisions the external trading wallet after the deposit confirms.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAgents()}
            className="btn-secondary inline-flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        {ownerWallet && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs text-[var(--text-muted)]">
            <Wallet size={14} />
            Owner wallet
            <span className="font-mono text-[var(--text-primary)]">{short(ownerWallet)}</span>
            <button type="button" onClick={() => void copyText(ownerWallet)} className="text-[var(--accent)]">
              <Copy size={13} />
            </button>
          </div>
        )}
      </GlassCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Prepare new Spawn agent</h3>
          <div className="mt-4 grid gap-3">
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Initial deposit
              <input
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Avatar URL
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-md border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              DNA JSON
              <textarea
                value={dnaJson}
                onChange={(e) => setDnaJson(e.target.value)}
                rows={12}
                className="mt-1 w-full resize-y rounded-md border border-[var(--border-default)] bg-transparent px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
              />
            </label>
            {formError && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{formError}</div>}
            <button
              type="button"
              onClick={() => void createSpawnAgent()}
              disabled={creating}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <Rocket size={15} />
              {creating ? 'Preparing...' : 'Prepare Spawn agent'}
            </button>
          </div>
        </GlassCard>

        <div className="space-y-5">
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
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Owned Spawn agents</h3>
              <span className="text-xs text-[var(--text-muted)]">{agents.length} total</span>
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
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{short(spawnAgent.id)} · {spawnAgent.status}</div>
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
        </div>
      </div>

      {selected && (
        <GlassCard className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{selected.name}</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{selected.status} · {selected.agent_type ?? 'spawn agent'}</p>
            </div>
            {selected.agent_wallet && (
              <a href={solscanAddress(selected.agent_wallet)} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
                <ExternalLink size={14} />
                Agent wallet
              </a>
            )}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <DetailPanel title="Positions" empty={!positions || (!positions.memecoin?.length && !positions.prediction?.length)}>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[var(--text-muted)]">{JSON.stringify(positions ?? {}, null, 2)}</pre>
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
      <span className="flex items-center gap-2 font-mono text-xs text-[var(--text-primary)]">
        {value}
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
