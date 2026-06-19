export type AutrActionStatus =
  | 'paper_buy_filled'
  | 'paper_sell_filled'
  | 'paper_buy_skipped_insufficient_balance'
  | 'paper_buy_skipped_missing_output_amount'
  | 'paper_buy_skipped_invalid_route'
  | 'paper_buy_skipped_max_positions'
  | 'paper_sell_skipped_no_position'
  | 'paper_sell_skipped_unpriced'
  | 'paper_sell_skipped_invalid_route';

export interface AutrLiveTraderAction {
  proposal_id: string;
  received_at: string;
  verdict: 'BUY' | 'SELL';
  status: AutrActionStatus;
  message: string;
  token_mint: string;
  input_mint: string;
  output_mint: string;
  input_amount_lamports: string;
  expected_output_amount: string;
  sol_delta_lamports: string;
  token_delta_raw: string;
  realized_pnl_lamports: string;
  cash_after_lamports: string;
  position_raw_amount: string;
  confidence: number;
  lane: string;
  caller: string;
  reason: string;
  wallet_pubkey: string | null;
  execution_status?: 'live_submitted' | 'live_failed' | 'live_skipped' | null;
  execution_signature?: string | null;
  execution_solscan_url?: string | null;
  execution_error?: string | null;
  execution_updated_at?: string | null;
  sol_delta_sol: string;
  realized_pnl_sol: string;
  cash_after_sol: string;
}

export interface AutrLiveTraderPosition {
  mint: string;
  raw_amount: string;
  raw_amount_number: number | null;
  cost_lamports: string;
  cost_sol: string;
  realized_pnl_lamports: string;
  realized_pnl_sol: string;
  mark_value_lamports: string;
  mark_value_sol: string;
  unrealized_pnl_lamports: string;
  unrealized_pnl_sol: string;
  unrealized_pnl_pct: string;
  mark_source: 'jupiter_quote' | 'cost_basis';
  mark_status: 'priced' | 'cost_basis' | 'closed';
  mark_updated_at: string | null;
  buy_count: number;
  sell_count: number;
  opened_at: string;
  updated_at: string;
  status: 'open' | 'closed';
}

export interface AutrLiveTraderSnapshot {
  mode: 'live_test';
  agent_id: string;
  wallet_pubkey: string;
  data_source: 'autr_webhook_real_signals';
  execution_mode: 'guarded_live_test';
  starting_balance_lamports: string;
  starting_balance_sol: string;
  cash_lamports: string;
  cash_sol: string;
  open_cost_lamports: string;
  open_cost_sol: string;
  open_mark_lamports: string;
  open_mark_sol: string;
  equity_lamports: string;
  equity_sol: string;
  realized_pnl_lamports: string;
  realized_pnl_sol: string;
  realized_pnl_pct: string;
  unrealized_pnl_lamports: string;
  unrealized_pnl_sol: string;
  unrealized_pnl_pct: string;
  total_pnl_lamports: string;
  total_pnl_sol: string;
  total_pnl_pct: string;
  valuation_status: 'priced' | 'partial' | 'cost_basis';
  open_positions_count: number;
  stats: {
    proposals_seen: number;
    buys_filled: number;
    sells_filled: number;
    skipped: number;
  };
  positions: AutrLiveTraderPosition[];
  recent_actions: AutrLiveTraderAction[];
  updated_at: string | null;
  last_signal_at: string | null;
}

export type DashboardTone = 'accent' | 'success' | 'warning' | 'danger' | 'muted';

export const AUTR_LIVE_POLL_INTERVAL_MS = 3_000;

const actionStatusLabels: Record<AutrActionStatus, string> = {
  paper_buy_filled: 'BUY tracked',
  paper_sell_filled: 'SELL tracked',
  paper_buy_skipped_insufficient_balance: 'BUY skipped',
  paper_buy_skipped_missing_output_amount: 'BUY skipped',
  paper_buy_skipped_invalid_route: 'BUY skipped',
  paper_buy_skipped_max_positions: 'BUY skipped',
  paper_sell_skipped_no_position: 'SELL skipped',
  paper_sell_skipped_unpriced: 'SELL unpriced',
  paper_sell_skipped_invalid_route: 'SELL skipped',
};

export function shortAddress(value: string, head = 6, tail = 6): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function formatSignedSol(value: string): string {
  if (value.startsWith('-')) return `${value} SOL`;
  if (value === '0.000000000') return `${value} SOL`;
  return `+${value} SOL`;
}

export function actionTone(status: AutrActionStatus): DashboardTone {
  if (status === 'paper_buy_filled') return 'success';
  if (status === 'paper_sell_filled') return 'accent';
  if (status.includes('unpriced') || status.includes('max_positions')) return 'warning';
  if (status.includes('invalid') || status.includes('insufficient') || status.includes('missing_output')) return 'danger';
  return 'muted';
}

export function actionStatusLabel(status: AutrActionStatus): string {
  return actionStatusLabels[status];
}

export function latestActivityLabel(snapshot: AutrLiveTraderSnapshot): string {
  const latest = snapshot.recent_actions[0];
  if (!latest) return 'Waiting for the next AUTR signal';
  return actionStatusLabel(latest.status);
}

export function snapshotActivityKey(snapshot: AutrLiveTraderSnapshot): string {
  const latest = snapshot.recent_actions[0];
  return [
    snapshot.updated_at ?? 'never',
    snapshot.stats.proposals_seen,
    snapshot.stats.buys_filled,
    snapshot.stats.sells_filled,
    snapshot.stats.skipped,
    snapshot.equity_lamports,
    snapshot.open_mark_lamports,
    snapshot.total_pnl_lamports,
    snapshot.valuation_status,
    latest?.proposal_id ?? 'none',
    latest?.execution_status ?? 'no-execution',
    latest?.execution_signature ?? 'no-signature',
  ].join(':');
}

export function emptyAutrLiveTraderSnapshot(): AutrLiveTraderSnapshot {
  return {
    mode: 'live_test',
    agent_id: 'cce1b05d-e967-411e-900b-80a58463a19a',
    wallet_pubkey: 'BtGuT8JGrhr7Cf9P7r2K4WDSs5t7FNFRiq3qdcRexcmT',
    data_source: 'autr_webhook_real_signals',
    execution_mode: 'guarded_live_test',
    starting_balance_lamports: '1000000000',
    starting_balance_sol: '1.000000000',
    cash_lamports: '1000000000',
    cash_sol: '1.000000000',
    open_cost_lamports: '0',
    open_cost_sol: '0.000000000',
    open_mark_lamports: '0',
    open_mark_sol: '0.000000000',
    equity_lamports: '1000000000',
    equity_sol: '1.000000000',
    realized_pnl_lamports: '0',
    realized_pnl_sol: '0.000000000',
    realized_pnl_pct: '0.0000',
    unrealized_pnl_lamports: '0',
    unrealized_pnl_sol: '0.000000000',
    unrealized_pnl_pct: '0.0000',
    total_pnl_lamports: '0',
    total_pnl_sol: '0.000000000',
    total_pnl_pct: '0.0000',
    valuation_status: 'cost_basis',
    open_positions_count: 0,
    stats: {
      proposals_seen: 0,
      buys_filled: 0,
      sells_filled: 0,
      skipped: 0,
    },
    positions: [],
    recent_actions: [],
    updated_at: null,
    last_signal_at: null,
  };
}
