# Staking Reward Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline staking rewards simulator to `/staking` so users can enter a HATCHER amount and see estimated pool share, HATCHER rewards, AI Credits, and APR before staking.

**Architecture:** Keep reward math in a pure frontend helper so it is independently testable and easy to reuse. The UI consumes existing staking config fields from `/staking/config`; no API schema change is required.

**Tech Stack:** Next.js client component, React `useMemo`, Vitest, TypeScript.

---

### Task 1: Reward Estimate Helper

**Files:**
- Create: `lib/staking-reward-estimator.ts`
- Test: `__tests__/staking-reward-estimator.test.ts`

- [x] **Step 1: Write failing tests for estimate math.**

Test a 1,000,000 HATCHER input in the 30D pool with 9,000,000 already staked. Expected pool share after stake is 10%, estimated 30D rewards are 37,500 HATCHER, AI Credits are 1,500, and APR after stake is 45%.

- [x] **Step 2: Run the test and confirm it fails because the module is missing.**

Run: `npm test -- --run __tests__/staking-reward-estimator.test.ts`

- [x] **Step 3: Implement the pure helper.**

Export `estimateStakingRewards(pool, amountHatcher)` and return `null` for missing pools, non-finite amounts, zero, or negative amounts. For valid input calculate:

```ts
poolTotalAfterStake = pool.totalStakedHatcher + amountHatcher
poolShareFraction = amountHatcher / poolTotalAfterStake
rewardBudgetForLock = pool.key === '7d'
  ? pool.weeklyRewardBudgetHatcher
  : pool.monthlyRewardBudgetHatcher * (pool.durationDays / 30)
estimatedHatcherRewards = rewardBudgetForLock * poolShareFraction
estimatedAiCredits = Math.floor(amountHatcher / 1_000_000 * pool.aiCreditsPerDayPerMillion * pool.durationDays)
estimatedAprAfterStake = pool.monthlyRewardBudgetHatcher * 12 / poolTotalAfterStake * 100
```

- [x] **Step 4: Re-run the estimator tests and confirm they pass.**

Run: `npm test -- --run __tests__/staking-reward-estimator.test.ts`

### Task 2: Inline Staking UI

**Files:**
- Modify: `app/[locale]/staking/StakingClient.tsx`
- Test: `__tests__/staking-client-state.test.ts`

- [x] **Step 1: Import the estimator and derive `rewardEstimate` with `useMemo`.**

Use the parsed numeric `stakeAmount` and `selectedPool`. Keep the calculation render-only; do not add network requests or state setters.

- [x] **Step 2: Render a `Reward estimate` section below the amount controls.**

Show an empty state when no valid amount is entered. For valid estimates show:
- estimated HATCHER rewards for the selected lock
- estimated pool share
- pool total after stake
- estimated APR after stake
- estimated AI Credits for the full lock

- [x] **Step 3: Add tests for formatting helpers if needed.**

Prefer testing the pure estimator instead of snapshotting the whole component.

### Task 3: Verification

**Files:**
- No additional files expected.

- [x] **Step 1: Run focused tests.**

Run: `npm test -- --run __tests__/staking-reward-estimator.test.ts __tests__/staking-client-state.test.ts __tests__/streamflow-staking.test.ts`

- [x] **Step 2: Run quality gates.**

Run:
- `npm run type-check -- --pretty false`
- `npm run lint`
- `npm run build`

- [x] **Step 3: Do rendered QA when available.**

Use the Browser plugin if available. If Browser invocation fails, record the failure and do not claim browser QA passed without fallback permission.
