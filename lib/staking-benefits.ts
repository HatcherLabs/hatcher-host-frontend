// Pure helpers for the staking Platform Benefits card.
//
// Benefits come from HATCHER locked in the 30d/90d pools. Tiers are inclusive
// (>= threshold) and a benefit lasts only while its qualifying lock is active:
// GET /staking/benefits is the source of truth, these helpers only shape its
// payload for rendering.

export interface StakingBenefitThresholds {
  extraAgentSlot: number;
  boostS: number;
  boostL: number;
}

/** Mirror of the API contract's thresholds; used for signed-out static copy. */
export const STAKING_BENEFIT_DEFAULT_THRESHOLDS: StakingBenefitThresholds = {
  extraAgentSlot: 500_000,
  boostS: 1_000_000,
  boostL: 5_000_000,
};

export type StakingBenefitStepKey = keyof StakingBenefitThresholds;

export interface StakingBenefitStep {
  key: StakingBenefitStepKey;
  label: string;
  threshold: number;
  reached: boolean;
}

const STEP_LABELS: Record<StakingBenefitStepKey, string> = {
  extraAgentSlot: '+1 agent slot',
  boostS: 'Free Boost S',
  boostL: 'Free Boost L + Staker badge',
};

/** 500000 -> "500k", 1000000 -> "1M", 1500000 -> "1.5M"; small values stay raw. */
export function formatBenefitThreshold(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const compact = (scaled: number, suffix: string) => {
    const rounded = Math.round(scaled * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}${suffix}`;
  };
  if (Math.abs(value) >= 1_000_000) return compact(value / 1_000_000, 'M');
  if (Math.abs(value) >= 1_000) return compact(value / 1_000, 'k');
  return `${value}`;
}

/** The 3-step tier indicator; a step is reached inclusively at its threshold. */
export function buildBenefitThresholdSteps(
  qualifyingStakedHatcher: number,
  thresholds: StakingBenefitThresholds,
): StakingBenefitStep[] {
  return (['extraAgentSlot', 'boostS', 'boostL'] as const).map((key) => ({
    key,
    label: STEP_LABELS[key],
    threshold: thresholds[key],
    reached: qualifyingStakedHatcher >= thresholds[key],
  }));
}

/** Progress toward the top (Boost L) threshold, clamped to 0-100. */
export function benefitProgressPercent(
  qualifyingStakedHatcher: number,
  thresholds: StakingBenefitThresholds,
): number {
  if (thresholds.boostL <= 0) return 0;
  const percent = (qualifyingStakedHatcher / thresholds.boostL) * 100;
  return Math.min(100, Math.max(0, percent));
}

export type BoostBenefitState = 'locked' | 'ready-to-designate' | 'active' | 'lapsed';

/**
 * `designatedAgentId` persists after entitlement lapses so a re-stake can
 * reactivate the boost on the same agent — hence the dedicated 'lapsed' state.
 */
export function resolveBoostBenefitState({
  entitled,
  designatedAgentId,
}: {
  entitled: boolean;
  designatedAgentId: string | null;
}): BoostBenefitState {
  if (entitled) return designatedAgentId ? 'active' : 'ready-to-designate';
  return designatedAgentId ? 'lapsed' : 'locked';
}

/** Agent name for a designation; falls back to the raw id for unknown agents. */
export function resolveDesignatedAgentName(
  designatedAgentId: string | null,
  agents: ReadonlyArray<{ id: string; name: string }>,
): string | null {
  if (!designatedAgentId) return null;
  return agents.find((agent) => agent.id === designatedAgentId)?.name ?? designatedAgentId;
}
