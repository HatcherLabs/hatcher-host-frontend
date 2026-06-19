# Active Stake Grouping Design

## Goal

Make `Your active stakes` easier to scan by grouping active Streamflow stake positions by pool while keeping each underlying on-chain position intact.

## Scope

This is a UI grouping change only. Individual Streamflow stake entries remain separate because each entry has its own deposit nonce, unlock date, reward status, and unstake/claim eligibility.

## Design

The staking page will render one group per pool that has active positions. Each group shows a summary with total staked HATCHER, estimated full-lock rewards, pool share, next unlock date, claimable AI Credits, and position count.

Inside each group, users can inspect the individual positions and use the existing per-position `Claim HATCHER` and `Unstake` actions. The grouping does not batch transactions, merge positions, or change unlock terms.

## Data Flow

The UI derives groups locally from `summary.activeStakes` and `config.pools`. A pure helper groups entries by `poolKey`, sorts groups by configured pool order, sorts positions by unlock date, and computes group totals.

Reward estimates use the existing `estimateActiveStakeRewards` helper with the group's total staked amount and the current live pool total.

## Testing

Add focused unit tests for the grouping helper:

- groups stakes by pool and totals staked HATCHER plus AI Credits
- sorts positions by unlock date and exposes the next unlock
- estimates group rewards from the live pool total
- keeps positions visible when pool config is missing, with estimates unavailable

Run the existing staking test set, type-check, lint, and build before PR.
