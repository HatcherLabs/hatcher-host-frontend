# Active Stake Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show active staking positions grouped by pool in `/staking` while preserving per-position Streamflow actions.

**Architecture:** Add one pure grouping helper in `lib/staking-active-stakes.ts` and use it from `StakingClient`. The helper derives display summaries from existing API data and existing reward-estimator logic; no API or transaction flow changes are needed.

**Tech Stack:** Next.js client component, React, TypeScript, Vitest.

---

### Task 1: Grouping Helper

**Files:**
- Create: `lib/staking-active-stakes.ts`
- Test: `__tests__/staking-active-stakes.test.ts`

- [x] **Step 1: Write failing tests.**

Add tests for `groupActiveStakesByPool(stakes, pools)`:
- two 90D stakes and one 7D stake become two groups ordered by pool config
- group totals include total staked HATCHER and claimable AI Credits
- stakes within a group are sorted by unlock date, and `nextUnlockAt` is the earliest unlock date
- group reward estimate uses the current pool total and configured lock budget
- missing pool config keeps the group visible with unavailable estimates

- [x] **Step 2: Run the focused test and confirm RED.**

Run: `npm test -- --run __tests__/staking-active-stakes.test.ts`

- [x] **Step 3: Implement the helper.**

Use `Map` lookups for pool config and group accumulation. Use `estimateActiveStakeRewards(pool, groupTotal)` for summary rewards.

- [x] **Step 4: Re-run focused tests and confirm GREEN.**

Run: `npm test -- --run __tests__/staking-active-stakes.test.ts`

### Task 2: Active Stakes UI

**Files:**
- Modify: `app/[locale]/staking/StakingClient.tsx`

- [x] **Step 1: Import and memoize grouped stakes.**

Use `useMemo` with `summary?.activeStakes` and `config?.pools`.

- [x] **Step 2: Replace the flat active stake list with pool groups.**

Each group summary should show total staked, estimated rewards, pool share, next unlock, claimable AI Credits, and position count.

- [x] **Step 3: Keep per-position actions inside each group.**

Render the existing claim/unstake controls per stake inside the group detail area.

### Task 3: Verification and Release

**Files:**
- No additional files expected.

- [x] **Step 1: Run focused tests.**

Run: `npm test -- --run __tests__/staking-active-stakes.test.ts __tests__/staking-reward-estimator.test.ts __tests__/staking-client-state.test.ts __tests__/streamflow-staking.test.ts`

- [x] **Step 2: Run quality gates.**

Run:
- `npm run type-check -- --pretty false`
- `npm run lint`
- `npm run build`

- [x] **Step 3: Validate rendered `/staking` layout if Browser tooling is available.**

Use Browser plugin first. If unavailable and fallback is explicitly allowed, use Playwright.

Browser plugin attempted, but `iab` was unavailable in this session. Standalone Playwright fallback was not used because fallback was not explicitly approved.

- [ ] **Step 4: Open PR, wait for CI, merge, deploy, and verify production.**

Follow the same PR/merge/deploy flow as previous staking changes.
