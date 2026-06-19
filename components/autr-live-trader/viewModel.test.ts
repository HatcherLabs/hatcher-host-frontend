import { describe, expect, it } from 'vitest';
import {
  actionStatusLabel,
  actionTone,
  formatSignedSol,
  latestActivityLabel,
  snapshotActivityKey,
  shortAddress,
  type AutrLiveTraderSnapshot,
} from './viewModel';

const baseSnapshot: AutrLiveTraderSnapshot = {
  mode: 'live_test',
  agent_id: 'cce1b05d-e967-411e-900b-80a58463a19a',
  wallet_pubkey: 'BtGuT8JGrhr7Cf9P7r2K4WDSs5t7FNFRiq3qdcRexcmT',
  data_source: 'autr_webhook_real_signals',
  execution_mode: 'guarded_live_test',
  starting_balance_lamports: '1000000000',
  starting_balance_sol: '1.000000000',
  cash_lamports: '2020000000',
  cash_sol: '2.020000000',
  open_cost_lamports: '0',
  open_cost_sol: '0.000000000',
  open_mark_lamports: '0',
  open_mark_sol: '0.000000000',
  equity_lamports: '2020000000',
  equity_sol: '2.020000000',
  realized_pnl_lamports: '20000000',
  realized_pnl_sol: '0.020000000',
  realized_pnl_pct: '1.0000',
  unrealized_pnl_lamports: '0',
  unrealized_pnl_sol: '0.000000000',
  unrealized_pnl_pct: '0.0000',
  total_pnl_lamports: '20000000',
  total_pnl_sol: '0.020000000',
  total_pnl_pct: '1.0000',
  valuation_status: 'cost_basis',
  open_positions_count: 0,
  stats: {
    proposals_seen: 2,
    buys_filled: 1,
    sells_filled: 1,
    skipped: 0,
  },
  positions: [],
  recent_actions: [],
  updated_at: '2024-06-10T08:00:10.000Z',
  last_signal_at: '2024-06-10T08:00:10.000Z',
};

describe('AUTR live trader view model', () => {
  it('shortens long Solana addresses without losing both ends', () => {
    expect(shortAddress('BtGuT8JGrhr7Cf9P7r2K4WDSs5t7FNFRiq3qdcRexcmT')).toBe('BtGuT8...RexcmT');
  });

  it('formats signed SOL deltas consistently', () => {
    expect(formatSignedSol('0.020000000')).toBe('+0.020000000 SOL');
    expect(formatSignedSol('-0.100000000')).toBe('-0.100000000 SOL');
    expect(formatSignedSol('0.000000000')).toBe('0.000000000 SOL');
  });

  it('maps AUTR trade statuses to dashboard tones and labels', () => {
    expect(actionTone('paper_buy_filled')).toBe('success');
    expect(actionTone('paper_sell_filled')).toBe('accent');
    expect(actionTone('paper_sell_skipped_unpriced')).toBe('warning');
    expect(actionTone('paper_buy_skipped_missing_output_amount')).toBe('danger');
    expect(actionStatusLabel('paper_buy_filled')).toBe('BUY tracked');
    expect(actionStatusLabel('paper_sell_filled')).toBe('SELL tracked');
    expect(actionStatusLabel('paper_buy_skipped_missing_output_amount')).toBe('BUY skipped');
  });

  it('summarizes latest activity for empty and active streams', () => {
    expect(latestActivityLabel(baseSnapshot)).toBe('Waiting for the next AUTR signal');
    expect(latestActivityLabel({
      ...baseSnapshot,
      recent_actions: [{
        proposal_id: '390559d4-6e21-4ecf-b3a6-8fce56fd73e6',
        received_at: '2024-06-10T08:00:10.000Z',
        verdict: 'SELL',
        status: 'paper_sell_filled',
        message: 'SELL fully exited from AUTR signal using payload quote',
        token_mint: 'Ddrae7atujkL2Np8myWgMF2LBU1E4ewRVQ3cwpAJpump',
        input_mint: 'Ddrae7atujkL2Np8myWgMF2LBU1E4ewRVQ3cwpAJpump',
        output_mint: 'So11111111111111111111111111111111111111112',
        input_amount_lamports: '45000000',
        expected_output_amount: '120000000',
        sol_delta_lamports: '120000000',
        token_delta_raw: '-45000000',
        realized_pnl_lamports: '20000000',
        cash_after_lamports: '2020000000',
        position_raw_amount: '0',
        confidence: 95,
        lane: 'social_scout',
        caller: 'alpha_cartel',
        reason: 'Take-profit exit triggered by AUTR',
        wallet_pubkey: null,
        sol_delta_sol: '0.120000000',
        realized_pnl_sol: '0.020000000',
        cash_after_sol: '2.020000000',
      }],
    })).toBe('SELL tracked');
  });

  it('builds a stable activity key that changes when a new signal lands', () => {
    const idleKey = snapshotActivityKey(baseSnapshot);
    const updated = {
      ...baseSnapshot,
      stats: {
        ...baseSnapshot.stats,
        proposals_seen: 3,
      },
      updated_at: '2024-06-10T08:01:10.000Z',
      recent_actions: [{
        proposal_id: 'e5ea8c9e-0958-4d29-83b7-f8c042ff3c4a',
        received_at: '2024-06-10T08:01:10.000Z',
        verdict: 'BUY',
        status: 'paper_buy_filled',
        message: 'BUY tracked from AUTR real signal',
        token_mint: '7oDa7STX3iHL2QViVyNR5FXzCct9TcjrbfaquGSwpump',
        input_mint: 'So11111111111111111111111111111111111111112',
        output_mint: '7oDa7STX3iHL2QViVyNR5FXzCct9TcjrbfaquGSwpump',
        input_amount_lamports: '1000000',
        expected_output_amount: '45000000',
        sol_delta_lamports: '-1000000',
        token_delta_raw: '45000000',
        realized_pnl_lamports: '0',
        cash_after_lamports: '1999000000',
        position_raw_amount: '45000000',
        confidence: 95,
        lane: 'social_scout',
        caller: 'alpha_cartel',
        reason: 'Mirrored production signal',
        wallet_pubkey: 'BtGuT8JGrhr7Cf9P7r2K4WDSs5t7FNFRiq3qdcRexcmT',
        execution_status: 'live_submitted',
        execution_signature: '3dCnnHDnPDvfRqXfYnBxbTtrt32v5UivRS2aRLtxb5w2ZqFc5JHR5NoAeVDa8W3uJX4kAFj5fNpFXySVJm3CBU9q',
        execution_solscan_url: 'https://solscan.io/tx/3dCnnHDnPDvfRqXfYnBxbTtrt32v5UivRS2aRLtxb5w2ZqFc5JHR5NoAeVDa8W3uJX4kAFj5fNpFXySVJm3CBU9q',
        sol_delta_sol: '-0.001000000',
        realized_pnl_sol: '0.000000000',
        cash_after_sol: '1.999000000',
      }],
    } satisfies AutrLiveTraderSnapshot;

    expect(snapshotActivityKey(updated)).not.toBe(idleKey);
    expect(snapshotActivityKey(updated)).toContain('e5ea8c9e-0958-4d29-83b7-f8c042ff3c4a');
    expect(snapshotActivityKey(updated)).toContain('live_submitted');
    expect(snapshotActivityKey(updated)).toContain('3dCnnHDnPDvfRqXfYnBxbTtrt32v5UivRS2aRLtxb5w2ZqFc5JHR5NoAeVDa8W3uJX4kAFj5fNpFXySVJm3CBU9q');
  });

  it('changes the activity key when live valuation changes without a new signal', () => {
    const idleKey = snapshotActivityKey(baseSnapshot);
    const repriced = {
      ...baseSnapshot,
      equity_lamports: '266394364',
      equity_sol: '0.266394364',
      open_mark_lamports: '16394364',
      open_mark_sol: '0.016394364',
      unrealized_pnl_lamports: '-33605636',
      unrealized_pnl_sol: '-0.033605636',
      unrealized_pnl_pct: '-11.2019',
      total_pnl_lamports: '-13605636',
      total_pnl_sol: '-0.013605636',
      total_pnl_pct: '-4.5352',
      valuation_status: 'priced',
    } satisfies AutrLiveTraderSnapshot;

    expect(snapshotActivityKey(repriced)).not.toBe(idleKey);
  });
});
