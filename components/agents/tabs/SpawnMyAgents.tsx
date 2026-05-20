'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  Copy,
  ExternalLink,
  MessageCircle,
  Pencil,
  RefreshCw,
  Send,
  UserRound,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  SpawnAgent,
  SpawnEvent,
  SpawnPaymentInstructions,
  SpawnPortfolioResponse,
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

function formatUsd(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function formatPct(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
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

function dexscreenerToken(mint: string): string {
  return `https://dexscreener.com/solana/${mint}`;
}

function spawnProfile(spawnAgentId: string): string {
  return `https://spawnagents.fun/agent.html?id=${encodeURIComponent(spawnAgentId)}`;
}

function spawnChat(spawnAgentId: string): string {
  return `https://spawnagents.fun/chat.html?agent=${encodeURIComponent(spawnAgentId)}`;
}

function spawnEdit(spawnAgentId: string): string {
  return `https://spawnagents.fun/lab?edit=${encodeURIComponent(spawnAgentId)}`;
}

function eventData(event: SpawnEvent): Record<string, unknown> {
  if (event.data && typeof event.data === 'object' && !Array.isArray(event.data)) return event.data;
  if (typeof event.data !== 'string') return {};
  try {
    const parsed = JSON.parse(event.data);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function eventTimestamp(event: SpawnEvent): number | null {
  if (typeof event.timestamp === 'number' && Number.isFinite(event.timestamp)) return event.timestamp;
  if (!event.created_at) return null;
  const parsed = Date.parse(event.created_at);
  return Number.isFinite(parsed) ? parsed : null;
}

function eventSummary(event: SpawnEvent): string {
  const data = eventData(event);
  if (event.type === 'trade') {
    const action = typeof data.action === 'string' ? data.action : 'trade';
    const token = typeof data.token === 'string'
      ? data.token
      : typeof data.mint === 'string'
        ? short(data.mint)
        : 'token';
    const amount = typeof data.amount === 'number' ? formatSol(data.amount) : '';
    return [action.toUpperCase(), token, amount].filter(Boolean).join(' ');
  }
  if (event.type === 'custom_agent_created') return 'Agent created';
  if (event.type === 'execute_spawn_funded') return 'Trading capital funded';
  if (event.type === 'execute_migration') return 'Agent wallet migrated';
  if (event.type === 'metaplex_minted') return 'Metaplex asset minted';
  return event.type.replace(/_/g, ' ');
}

function computeAgeDays(bornAt: string | null | undefined): string {
  if (!bornAt) return '-';
  const born = Date.parse(bornAt);
  if (!Number.isFinite(born)) return '-';
  const days = Math.max(0, Math.floor((Date.now() - born) / 86_400_000));
  return `${days}d`;
}

function computeWinRate(trades: SpawnTrade[]): string {
  const exits = trades.filter((trade) => String(trade.action).toLowerCase() === 'sell');
  if (exits.length === 0) return '0%';
  const wins = exits.filter((trade) => typeof trade.pnl_sol === 'number' && trade.pnl_sol > 0).length;
  return formatPct((wins / exits.length) * 100);
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
  const [portfolio, setPortfolio] = useState<SpawnPortfolioResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
    setDetailLoading(true);
    setTrades([]);
    setPositions(null);
    setPortfolio(null);
    setEvents([]);
    try {
      const [tradesRes, positionsRes, portfolioRes, activityRes] = await Promise.all([
        api.getAgentSpawnTrades(agentId, spawnAgent.id, { limit: 50 }),
        api.getAgentSpawnPositions(agentId, spawnAgent.id),
        api.getAgentSpawnPortfolio(agentId, spawnAgent.id),
        api.getAgentSpawnActivity(agentId, spawnAgent.id, { limit: 100 }),
      ]);
      if (tradesRes.success) setTrades(tradesRes.data.trades ?? []);
      if (positionsRes.success) setPositions(positionsRes.data);
      if (portfolioRes.success) setPortfolio(portfolioRes.data);
      if (activityRes.success) setEvents(activityRes.data.events ?? []);
    } finally {
      setDetailLoading(false);
    }
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
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {selected.status} - {selected.agent_type ?? 'spawn agent'} - {short(selected.id)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={spawnProfile(selected.id)} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
                <UserRound size={14} />
                Profile
              </a>
              <a href={spawnChat(selected.id)} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
                <MessageCircle size={14} />
                Chat
              </a>
              <a href={spawnEdit(selected.id)} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
                <Pencil size={14} />
                Edit
              </a>
              {selected.agent_wallet && (
                <a href={solscanAddress(selected.agent_wallet)} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
                  <ExternalLink size={14} />
                  Wallet
                </a>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Portfolio value" value={formatUsd(portfolio?.total_value_usd)} />
            <StatTile
              label="Total PnL"
              value={portfolio?.total_pnl_usd != null ? formatUsd(portfolio.total_pnl_usd) : formatSol(selected.total_pnl_sol)}
              tone={(portfolio?.total_pnl_usd ?? selected.total_pnl_sol ?? 0) < 0 ? 'danger' : 'success'}
            />
            <StatTile label="Trades" value={String(selected.total_trades ?? trades.length)} />
            <StatTile label="Win rate" value={computeWinRate(trades)} />
            <StatTile label="Age" value={computeAgeDays(selected.born_at)} />
            <StatTile label="SOL" value={formatSol(portfolio?.sol_balance)} />
            <StatTile label="Holdings" value={String((portfolio?.tokens?.length ?? 0) + (portfolio?.pm_positions?.length ?? 0))} />
            <StatTile label="Initial capital" value={formatSol(selected.initial_capital_sol)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled title="Signed Spawn command proxy not enabled yet" className="btn-secondary opacity-50">
              Top up
            </button>
            <button type="button" disabled title="Signed Spawn command proxy not enabled yet" className="btn-secondary opacity-50">
              {selected.paused ? 'Activate trading' : 'Pause trading'}
            </button>
            <button type="button" disabled title="Signed Spawn command proxy not enabled yet" className="btn-secondary opacity-50">
              Reproduce
            </button>
            <button type="button" disabled title="Signed Spawn command proxy not enabled yet" className="btn-secondary opacity-50">
              Withdraw
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            <DetailPanel title="Holdings" empty={!portfolio || (!portfolio.sol_balance && !portfolio.tokens?.length && !portfolio.pm_positions?.length)}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="text-[var(--text-muted)]">
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="py-2 font-mono uppercase tracking-[0.12em]">Asset</th>
                      <th className="py-2 font-mono uppercase tracking-[0.12em]">Amount</th>
                      <th className="py-2 font-mono uppercase tracking-[0.12em]">Value</th>
                      <th className="py-2 font-mono uppercase tracking-[0.12em]">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--border-default)]">
                      <td className="py-2 font-medium text-[var(--text-primary)]">SOL</td>
                      <td className="py-2 font-mono text-[var(--text-muted)]">{formatNumber(portfolio?.sol_balance)}</td>
                      <td className="py-2 font-mono text-[var(--text-primary)]">{formatUsd(portfolio?.sol_value_usd)}</td>
                      <td className="py-2 font-mono text-[var(--text-muted)]">-</td>
                    </tr>
                    {portfolio?.tokens?.map((token) => (
                      <tr key={token.mint} className="border-b border-[var(--border-default)] last:border-0">
                        <td className="py-2">
                          <a href={dexscreenerToken(token.mint)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)]">
                            {token.symbol || short(token.mint)}
                            <ExternalLink size={11} />
                          </a>
                          <div className="font-mono text-[var(--text-muted)]">{short(token.mint)}</div>
                        </td>
                        <td className="py-2 font-mono text-[var(--text-muted)]">{formatNumber(token.amount)}</td>
                        <td className="py-2 font-mono text-[var(--text-primary)]">{formatUsd(token.value_usd)}</td>
                        <td className={`py-2 font-mono ${(token.pnl_usd ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatUsd(token.pnl_usd)} <span className="text-[var(--text-muted)]">{formatPct(token.pnl_pct)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DetailPanel>

            <DetailPanel title="DNA profile" empty={!selected.dna}>
              <DnaProfile dna={selected.dna ?? {}} />
            </DetailPanel>

            <DetailPanel title="Open strategy positions" empty={!positions || (!positions.memecoin?.length && !positions.prediction?.length)}>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[var(--text-muted)]">{formatJson(positions ?? {})}</pre>
            </DetailPanel>
            <DetailPanel title="Trades" empty={trades.length === 0}>
              <div className="space-y-2">
                {trades.slice(0, 12).map((trade) => (
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
            <DetailPanel title="Activity" empty={events.length === 0}>
              <div className="space-y-2">
                {events.slice(0, 12).map((event) => {
                  const data = eventData(event);
                  const tx = typeof data.tx === 'string'
                    ? data.tx
                    : typeof data.funding_tx === 'string'
                      ? data.funding_tx
                      : null;
                  const timestamp = eventTimestamp(event);
                  return (
                    <div key={String(event.id)} className="rounded-md border border-[var(--border-default)] p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{eventSummary(event)}</span>
                        <span className="text-[var(--text-muted)]">{timestamp ? new Date(timestamp).toLocaleString() : '-'}</span>
                      </div>
                      <div className="mt-1 font-mono text-[var(--text-muted)]">{event.type}</div>
                      {tx && !tx.startsWith('pending') && (
                        <a href={solscanTx(tx)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[var(--accent)]">
                          tx <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </DetailPanel>
          </div>

          {detailLoading && (
            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <RefreshCw size={13} className="animate-spin" />
              Loading Spawn data...
            </div>
          )}
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

function StatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const valueClass = tone === 'success'
    ? 'text-emerald-400'
    : tone === 'danger'
      ? 'text-red-400'
      : 'text-[var(--text-primary)]';
  return (
    <div className="rounded-md border border-[var(--border-default)] px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</div>
      <div className={`mt-2 font-mono text-lg font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function DnaProfile({ dna }: { dna: Record<string, unknown> }) {
  const rows = [
    { key: 'aggression', label: 'Aggression', max: 1 },
    { key: 'patience', label: 'Patience', max: 1 },
    { key: 'risk_tolerance', label: 'Risk', max: 1 },
    { key: 'max_position_pct', label: 'Max position', max: 100, suffix: '%' },
    { key: 'sell_profit_pct', label: 'Take profit', max: 500, suffix: '%' },
    { key: 'sell_loss_pct', label: 'Stop loss', max: 100, suffix: '%' },
  ];
  const activeModes = [
    dna.trades_memecoins === true ? 'memecoin' : null,
    dna.trades_prediction === true ? 'prediction' : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
        <BarChart3 size={14} />
        {activeModes.length ? activeModes.join(' + ') : 'custom DNA'}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const raw = dna[row.key];
          const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
          const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / row.max) * 100));
          const display = value == null
            ? '-'
            : row.suffix
              ? `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}${row.suffix}`
              : formatPct(value * 100);
          return (
            <div key={row.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="text-[var(--text-muted)]">{row.label}</span>
                <span className="font-mono text-[var(--text-primary)]">{display}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
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
