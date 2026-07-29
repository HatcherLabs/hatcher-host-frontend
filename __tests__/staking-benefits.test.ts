import { describe, expect, it } from 'vitest';
import {
  benefitProgressPercent,
  buildBenefitThresholdSteps,
  formatBenefitThreshold,
  resolveBoostBenefitState,
  resolveDesignatedAgentName,
  STAKING_BENEFIT_DEFAULT_THRESHOLDS,
} from '@/lib/staking-benefits';

const THRESHOLDS = { extraAgentSlot: 500_000, boostS: 1_000_000, boostL: 5_000_000 };

describe('staking benefit thresholds', () => {
  it('formats thresholds compactly for the 3-step indicator', () => {
    expect(formatBenefitThreshold(500_000)).toBe('500k');
    expect(formatBenefitThreshold(1_000_000)).toBe('1M');
    expect(formatBenefitThreshold(5_000_000)).toBe('5M');
    expect(formatBenefitThreshold(1_500_000)).toBe('1.5M');
    expect(formatBenefitThreshold(750)).toBe('750');
  });

  it('keeps the shipped default thresholds aligned with the API contract', () => {
    expect(STAKING_BENEFIT_DEFAULT_THRESHOLDS).toEqual(THRESHOLDS);
  });

  it('marks tier steps reached inclusively at exactly the threshold', () => {
    const steps = buildBenefitThresholdSteps(1_000_000, THRESHOLDS);
    expect(steps.map((step) => step.key)).toEqual(['extraAgentSlot', 'boostS', 'boostL']);
    expect(steps.map((step) => step.reached)).toEqual([true, true, false]);
  });

  it('marks no steps reached below the first tier and all at the top tier', () => {
    expect(buildBenefitThresholdSteps(499_999, THRESHOLDS).map((step) => step.reached))
      .toEqual([false, false, false]);
    expect(buildBenefitThresholdSteps(5_000_000, THRESHOLDS).map((step) => step.reached))
      .toEqual([true, true, true]);
  });

  it('exposes threshold amounts and labels for rendering', () => {
    const steps = buildBenefitThresholdSteps(0, THRESHOLDS);
    expect(steps.map((step) => step.threshold)).toEqual([500_000, 1_000_000, 5_000_000]);
    for (const step of steps) expect(step.label.length).toBeGreaterThan(0);
  });

  it('computes progress toward the top tier clamped to 0-100', () => {
    expect(benefitProgressPercent(0, THRESHOLDS)).toBe(0);
    expect(benefitProgressPercent(2_500_000, THRESHOLDS)).toBe(50);
    expect(benefitProgressPercent(5_000_000, THRESHOLDS)).toBe(100);
    expect(benefitProgressPercent(9_000_000, THRESHOLDS)).toBe(100);
    expect(benefitProgressPercent(-5, THRESHOLDS)).toBe(0);
  });
});

describe('boost benefit state machine', () => {
  it('is locked when not entitled and never designated', () => {
    expect(resolveBoostBenefitState({ entitled: false, designatedAgentId: null })).toBe('locked');
  });

  it('asks for a designation when entitled without one', () => {
    expect(resolveBoostBenefitState({ entitled: true, designatedAgentId: null }))
      .toBe('ready-to-designate');
  });

  it('is active while entitled with a designated agent', () => {
    expect(resolveBoostBenefitState({ entitled: true, designatedAgentId: 'agent-1' })).toBe('active');
  });

  it('is lapsed when the designation persists after entitlement ended', () => {
    expect(resolveBoostBenefitState({ entitled: false, designatedAgentId: 'agent-1' })).toBe('lapsed');
  });
});

describe('designated agent display', () => {
  const agents = [
    { id: 'agent-1', name: 'Atlas' },
    { id: 'agent-2', name: 'Scout' },
  ];

  it('shows the agent name for a known designation', () => {
    expect(resolveDesignatedAgentName('agent-2', agents)).toBe('Scout');
  });

  it('falls back to the raw id when the agent is not in the list', () => {
    expect(resolveDesignatedAgentName('agent-gone', agents)).toBe('agent-gone');
  });

  it('reports no designation as null', () => {
    expect(resolveDesignatedAgentName(null, agents)).toBeNull();
  });
});
