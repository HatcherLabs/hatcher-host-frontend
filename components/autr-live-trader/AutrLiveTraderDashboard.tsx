'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Clock3,
  ExternalLink,
  Radio,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  AUTR_LIVE_POLL_INTERVAL_MS,
  actionStatusLabel,
  actionTone,
  dexscreenerSolanaTokenUrl,
  emptyAutrLiveTraderSnapshot,
  formatSignedSol,
  latestActivityLabel,
  shortAddress,
  snapshotActivityKey,
  type AutrActionStatus,
  type AutrLiveTraderAction,
  type AutrLiveTraderPosition,
  type AutrLiveTraderSnapshot,
  type DashboardTone,
} from './viewModel';

interface Props {
  initialSnapshot: AutrLiveTraderSnapshot | null;
  apiUrl: string;
  deployUrl: string;
}

const toneStyles: Record<DashboardTone, string> = {
  accent: 'border-[var(--color-accent-border)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]',
  success: 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]',
  warning: 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  danger: 'border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive)]',
  muted: 'border-[var(--border-default)] bg-[var(--bg-muted)] text-[var(--text-secondary)]',
};

export function AutrLiveTraderDashboard({ initialSnapshot, apiUrl, deployUrl }: Props) {
  const [snapshot, setSnapshot] = useState<AutrLiveTraderSnapshot>(
    initialSnapshot ?? emptyAutrLiveTraderSnapshot(),
  );
  const [error, setError] = useState<string | null>(null);
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null);
  const [lastChangeAt, setLastChangeAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activityKeyRef = useRef(snapshotActivityKey(initialSnapshot ?? emptyAutrLiveTraderSnapshot()));
  const apiBase = useMemo(() => apiUrl.replace(/\/$/, ''), [apiUrl]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${apiBase}/integrations/autr/live-trader`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const next = (await response.json()) as AutrLiveTraderSnapshot;
      const nextActivityKey = snapshotActivityKey(next);
      if (activityKeyRef.current !== nextActivityKey) {
        activityKeyRef.current = nextActivityKey;
        setLastChangeAt(new Date());
      }
      setSnapshot(next);
      setError(null);
      setLastPollAt(new Date());
    } catch (err) {
      setError((err as Error).message || 'Unable to refresh AUTR state');
    } finally {
      setIsRefreshing(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (!initialSnapshot) void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, AUTR_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [initialSnapshot, refresh]);

  const latestLabel = latestActivityLabel(snapshot);
  const totalPnlSol = snapshot.total_pnl_sol || snapshot.realized_pnl_sol;
  const totalPnlPct = snapshot.total_pnl_pct || snapshot.realized_pnl_pct;
  const totalPnlTone: DashboardTone = totalPnlSol.startsWith('-')
    ? 'danger'
    : totalPnlSol === '0.000000000'
      ? 'muted'
      : 'success';
  const valuationLabel = snapshot.valuation_status === 'priced'
    ? 'Jupiter live mark'
    : snapshot.valuation_status === 'partial'
      ? 'Partial live mark'
      : 'Cost basis fallback';
  const activePositions = snapshot.positions.filter((position) => position.status === 'open');
  const visiblePositions = activePositions;
  const pollSeconds = AUTR_LIVE_POLL_INTERVAL_MS / 1000;

  return (
    <section className="min-h-[calc(100vh-var(--app-nav-height,64px))] bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[var(--border-default)] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)] sm:text-3xl">
                  AUTR Live Trader
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning)]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Guarded live test
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                Real AUTR webhook signals tracked through the Hatcher execution wallet. First live session guardrails: 1 SOL wallet funding and 0.1 SOL max BUY.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3 text-sm font-semibold text-[var(--color-success)]">
              <Radio className="h-4 w-4" />
              {isRefreshing ? 'Syncing' : `Live ${pollSeconds}s`}
            </span>
            <a
              href={deployUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--control-active)] px-4 text-sm font-semibold text-[var(--control-active-text)] transition-opacity hover:opacity-90"
            >
              Deploy your own autonomous trader
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Starting balance"
            value={`${snapshot.starting_balance_sol} SOL`}
            detail={shortAddress(snapshot.wallet_pubkey)}
            icon={<Wallet className="h-4 w-4" />}
          />
          <MetricTile
            label="Live test equity"
            value={`${snapshot.equity_sol} SOL`}
            detail={valuationLabel}
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricTile
            label="Total PnL"
            value={formatSignedSol(totalPnlSol)}
            detail={`${totalPnlPct}% incl. open positions`}
            icon={totalPnlTone === 'success' ? <ArrowUpRight className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            tone={totalPnlTone}
          />
          <MetricTile
            label="Signals processed"
            value={String(snapshot.stats.proposals_seen)}
            detail={`${snapshot.stats.buys_filled} BUY / ${snapshot.stats.sells_filled} SELL / ${snapshot.stats.skipped} skipped`}
            icon={<Zap className="h-4 w-4" />}
          />
        </section>

        <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">Current state</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--text-primary)]">
                    {latestLabel}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {lastChangeAt ? `Updated live at ${formatDateTime(lastChangeAt.toISOString())}` : `Polling every ${pollSeconds}s`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:min-w-[320px]">
                  <MiniStat label="Cash" value={`${snapshot.cash_sol} SOL`} />
                  <MiniStat label="Open cost" value={`${snapshot.open_cost_sol} SOL`} />
                  <MiniStat label="Open mark" value={`${snapshot.open_mark_sol || snapshot.open_cost_sol} SOL`} />
                  <MiniStat label="Realized" value={formatSignedSol(snapshot.realized_pnl_sol)} />
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <ExecutionStep active={snapshot.stats.proposals_seen > 0} label="Signal received" />
                <ExecutionStep active={snapshot.stats.buys_filled + snapshot.stats.sells_filled > 0} label="Trade tracked" />
                <ExecutionStep active={snapshot.updated_at !== null} label="Snapshot refreshed" />
              </div>
              {error ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-3 py-2 text-sm text-[var(--color-destructive)]">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              ) : null}
            </div>

            <div className="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">Positions</p>
                  <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Open positions</h2>
                </div>
                <span className="rounded-md border border-[var(--border-default)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                  {valuationLabel}
                </span>
              </div>
              {visiblePositions.length > 0 ? (
                <div data-autr-positions-scroll className="mt-4 max-w-full overflow-x-auto rounded-md border border-[var(--border-default)]">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-[1.25fr_0.95fr_0.75fr_0.75fr_0.75fr] bg-[var(--bg-muted)] px-3 py-2 text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">
                      <span>Mint</span>
                      <span>Amount</span>
                      <span>Cost</span>
                      <span>Mark</span>
                      <span>PnL (SOL)</span>
                    </div>
                    {visiblePositions.map((position) => (
                      <PositionRow key={position.mint} position={position} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-[var(--border-default)] bg-[var(--bg-muted)] px-3 py-8 text-center text-sm text-[var(--text-muted)]">
                  No open positions yet.
                </div>
              )}
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-5">
            <div className="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-accent-border)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">Execution wallet</p>
                  <p className="mt-1 truncate font-mono text-sm text-[var(--text-primary)]">{shortAddress(snapshot.wallet_pubkey, 8, 8)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <DetailLine label="Agent ID" value={shortAddress(snapshot.agent_id, 8, 8)} />
                <DetailLine label="Mode" value="Guarded live test" />
                <DetailLine label="Valuation" value={valuationLabel} />
                <DetailLine label="Last signal" value={snapshot.last_signal_at ? formatDateTime(snapshot.last_signal_at) : 'Waiting'} />
                <DetailLine label="Last poll" value={lastPollAt ? formatDateTime(lastPollAt.toISOString()) : 'Initial'} />
                <DetailLine label="Polling" value={`${pollSeconds}s live`} />
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">Recent actions</p>
                  <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Signal tape</h2>
                </div>
                <Clock3 className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <div className="mt-4 space-y-3">
                {snapshot.recent_actions.length > 0 ? (
                  snapshot.recent_actions.slice(0, 8).map((action) => (
                    <ActionRow key={action.proposal_id} action={action} />
                  ))
                ) : (
                  <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-muted)] px-3 py-8 text-center text-sm text-[var(--text-muted)]">
                    Waiting for AUTR to push the first live signal.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon,
  tone = 'accent',
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone?: DashboardTone;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">{label}</span>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${toneStyles[tone]}`}>
          {icon}
        </span>
      </div>
      <div className="mt-4 font-mono text-xl font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-2 truncate text-sm text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-muted)] px-3 py-2">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function ExecutionStep({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={`rounded-md border px-3 py-3 ${active ? toneStyles.success : toneStyles.muted}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-[var(--color-success)]' : 'bg-[var(--text-dim)]'}`} />
        {label}
      </div>
    </div>
  );
}

function PositionRow({ position }: { position: AutrLiveTraderPosition }) {
  const pnlValue = position.status === 'open'
    ? position.unrealized_pnl_sol
    : position.realized_pnl_sol;
  const displayPnl = formatSignedSol(pnlValue).replace(' SOL', '');
  const pnlTone = pnlValue.startsWith('-') ? 'text-[var(--color-destructive)]' : 'text-[var(--color-success)]';
  const tokenUrl = dexscreenerSolanaTokenUrl(position.mint);
  return (
    <div className="grid grid-cols-[1.25fr_0.95fr_0.75fr_0.75fr_0.75fr] border-t border-[var(--border-default)] px-3 py-3 text-sm">
      <a
        href={tokenUrl}
        target="_blank"
        rel="noreferrer"
        title={`Open ${position.mint} on Dexscreener`}
        aria-label={`Open ${position.mint} on Dexscreener`}
        className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[var(--text-primary)] transition-colors hover:text-[var(--color-accent)]"
      >
        <span className="min-w-0 truncate">{shortAddress(position.mint, 7, 7)}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
      <span className="min-w-0 truncate font-mono text-[var(--text-secondary)]">{position.raw_amount}</span>
      <span className="min-w-0 truncate font-mono text-[var(--text-secondary)]">{position.cost_sol}</span>
      <span className="min-w-0 truncate font-mono text-[var(--text-secondary)]">{position.mark_value_sol}</span>
      <span className={`min-w-0 truncate font-mono ${pnlTone}`}>{displayPnl}</span>
    </div>
  );
}

function ActionRow({ action }: { action: AutrLiveTraderAction }) {
  const tone = actionTone(action.status);
  const Icon = action.verdict === 'BUY' ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${toneStyles[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">{action.verdict}</span>
              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneStyles[tone]}`}>
                {actionStatusLabel(action.status)}
              </span>
              <ExecutionBadge action={action} />
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{action.reason}</p>
          </div>
        </div>
        <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{formatDateTime(action.received_at)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MiniStat label="SOL delta" value={formatSignedSol(action.sol_delta_sol)} />
        <MiniStat label="Confidence" value={`${action.confidence}%`} />
      </div>
      <div className="mt-3 truncate font-mono text-xs text-[var(--text-dim)]">{shortAddress(action.token_mint, 8, 8)}</div>
    </div>
  );
}

function ExecutionBadge({ action }: { action: AutrLiveTraderAction }) {
  if (action.execution_signature && action.execution_solscan_url) {
    const isFailed = action.execution_status === 'live_failed';
    return (
      <a
        href={action.execution_solscan_url}
        target="_blank"
        rel="noreferrer"
        title={action.execution_error ?? action.execution_signature}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
          isFailed ? toneStyles.danger : toneStyles.success
        }`}
      >
        {isFailed ? 'TX failed' : 'TX'} {shortAddress(action.execution_signature, 4, 6)}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  if (action.execution_status === 'live_failed') {
    return (
      <span
        title={action.execution_error ?? undefined}
        className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneStyles.danger}`}
      >
        TX failed
      </span>
    );
  }

  if (action.execution_status === 'live_skipped') {
    return (
      <span
        title={action.execution_error ?? undefined}
        className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneStyles.warning}`}
      >
        TX skipped
      </span>
    );
  }

  return null;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="min-w-0 truncate font-mono text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}
