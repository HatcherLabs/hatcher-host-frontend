# Active Stake Reward Estimates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show live estimated HATCHER rewards for each existing active stake in `/staking`.

**Architecture:** Reuse the frontend staking reward estimator module. Add a pure helper for active stakes where the stake is already included in the live pool total, then render the estimate inside the existing `Your active stakes` row without adding a new page or API endpoint.

**Tech Stack:** Next.js client component, React, TypeScript, Vitest.

---

### Task 1: Active Stake Estimator

**Files:**
- Modify: `lib/staking-reward-estimator.ts`
- Test: `__tests__/staking-reward-estimator.test.ts`

- [x] **Step 1: Write failing tests.**

Add tests for `estimateActiveStakeRewards(pool, stakeAmount)`:
- 1,000,000 HATCHER active stake inside a 10,000,000 HATCHER 30D pool returns 10% share and 37,500 HATCHER estimated rewards.
- 1,000,000 HATCHER active stake inside a 2,000,000 HATCHER 7D pool returns 28,846 HATCHER estimated rewards.
- invalid pool totals or invalid stake amounts return `null`.

- [x] **Step 2: Run the focused test and confirm RED.**

Run: `npm test -- --run __tests__/staking-reward-estimator.test.ts`

- [x] **Step 3: Implement the helper.**

Use `pool.totalStakedHatcher` as the denominator because the active stake is already included in live pool totals:

```ts
poolShareFraction = Math.min(1, stakeHatcher / pool.totalStakedHatcher)
estimatedHatcherRewards = rewardBudgetForLock(pool) * poolShareFraction
```

- [x] **Step 4: Re-run focused tests and confirm GREEN.**

Run: `npm test -- --run __tests__/staking-reward-estimator.test.ts`

### Task 2: Active Stakes UI

**Files:**
- Modify: `app/[locale]/staking/StakingClient.tsx`

- [x] **Step 1: Import `estimateActiveStakeRewards`.**

- [x] **Step 2: Compute the active stake estimate in each active stake row.**

Find the pool from `config?.pools` by `stake.poolKey`; do not call any extra APIs.

- [x] **Step 3: Render the estimate under `HATCHER rewards`.**

Show:
- `Est. full-lock rewards`
- `~X HATCHER`
- `Y% pool share`

Use `-` if config or pool totals are unavailable. Add one header note explaining these are live estimates and can change with pool size or Streamflow top-ups.

### Task 3: Verification and Release

**Files:**
- No additional files expected.

- [x] **Step 1: Run focused tests.**

Run: `npm test -- --run __tests__/staking-reward-estimator.test.ts __tests__/staking-client-state.test.ts __tests__/streamflow-staking.test.ts`

- [x] **Step 2: Run quality gates.**

Run:
- `npm run type-check -- --pretty false`
- `npm run lint`
- `npm run build`

- [ ] **Step 3: Open PR, wait for CI, merge, and verify prod.**

Use the same PR/merge/deploy process as the previous staking simulator change.
