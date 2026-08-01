import { describe, expect, it } from 'vitest';
import type { HostedModelOption } from '@/lib/hosted-model-catalog';
import {
  costTierFromPricing,
  formatCreditsPer1M,
  mergeHostedModelsWithLivePricing,
  modelPricingById,
  parseModelPricingPayload,
  type FixedModelPricing,
  type ModelPricing,
  type PerTokenModelPricing,
} from '@/lib/model-pricing';

function perToken(overrides: Partial<PerTokenModelPricing> = {}): PerTokenModelPricing {
  return {
    kind: 'per_token',
    inputUsdPer1M: 2,
    outputUsdPer1M: 10,
    creditsPer1MInput: 2000,
    creditsPer1MOutput: 10000,
    source: 'catalog',
    ...overrides,
  };
}

function fixed(overrides: Partial<FixedModelPricing> = {}): FixedModelPricing {
  return {
    kind: 'fixed',
    creditsPerRequest: 1,
    usdPerRequest: 0.001,
    source: 'catalog',
    ...overrides,
  };
}

function hostedModel(overrides: Partial<HostedModelOption> & { id: string }): HostedModelOption {
  return {
    name: overrides.id,
    providerKey: overrides.id.split('/')[0] ?? 'openai',
    provider: 'Test Provider',
    category: 'Balanced',
    cost: 'Medium',
    context: '128K',
    description: 'Test model.',
    ...overrides,
  };
}

describe('formatCreditsPer1M', () => {
  it('formats per-token credits compactly', () => {
    expect(formatCreditsPer1M(perToken())).toBe('2k in / 10k out credits per 1M');
  });

  it('keeps sub-thousand credit values plain', () => {
    expect(formatCreditsPer1M(perToken({ creditsPer1MInput: 750, creditsPer1MOutput: 900 })))
      .toBe('750 in / 900 out credits per 1M');
  });

  it('uses at most one decimal for compact values', () => {
    expect(formatCreditsPer1M(perToken({ creditsPer1MInput: 12500, creditsPer1MOutput: 1_500_000 })))
      .toBe('12.5k in / 1.5M out credits per 1M');
  });

  it('formats a single-credit fixed price with a singular unit', () => {
    expect(formatCreditsPer1M(fixed())).toBe('1 credit per request');
  });

  it('formats multi-credit fixed prices with a plural unit', () => {
    expect(formatCreditsPer1M(fixed({ creditsPerRequest: 3, usdPerRequest: 0.003 })))
      .toBe('3 credits per request');
    expect(formatCreditsPer1M(fixed({ creditsPerRequest: 2000, usdPerRequest: 2 })))
      .toBe('2k credits per request');
  });

  it('prefixes estimated per-token pricing with a tilde', () => {
    expect(formatCreditsPer1M(perToken({ source: 'estimate', creditsPer1MInput: 250, creditsPer1MOutput: 1000 })))
      .toBe('~250 in / 1k out credits per 1M');
    expect(formatCreditsPer1M(perToken({ estimated: true })))
      .toBe('~2k in / 10k out credits per 1M');
  });

  it('keeps catalog and openrouter per-token pricing unprefixed', () => {
    expect(formatCreditsPer1M(perToken({ source: 'catalog' }))).toBe('2k in / 10k out credits per 1M');
    expect(formatCreditsPer1M(perToken({ source: 'openrouter' }))).toBe('2k in / 10k out credits per 1M');
  });

  it('leaves fixed pricing unprefixed regardless of source', () => {
    expect(formatCreditsPer1M(fixed({ source: 'estimate' }))).toBe('1 credit per request');
  });
});

describe('costTierFromPricing', () => {
  it('returns Variable when pricing is unknown', () => {
    expect(costTierFromPricing(null)).toBe('Variable');
    expect(costTierFromPricing(undefined)).toBe('Variable');
  });

  it('derives per-token tiers from USD rates with the platform thresholds', () => {
    expect(costTierFromPricing(perToken({ inputUsdPer1M: 0.1, outputUsdPer1M: 0.5 }))).toBe('Low');
    expect(costTierFromPricing(perToken({ inputUsdPer1M: 0.5, outputUsdPer1M: 1 }))).toBe('Medium');
    expect(costTierFromPricing(perToken({ inputUsdPer1M: 0.1, outputUsdPer1M: 3 }))).toBe('Medium');
    expect(costTierFromPricing(perToken({ inputUsdPer1M: 5, outputUsdPer1M: 30 }))).toBe('High');
    expect(costTierFromPricing(perToken({ inputUsdPer1M: 10, outputUsdPer1M: 30 }))).toBe('Premium');
    expect(costTierFromPricing(perToken({ inputUsdPer1M: 1, outputUsdPer1M: 50 }))).toBe('Premium');
  });

  it('derives fixed tiers from the AI Credit estimate bands', () => {
    expect(costTierFromPricing(fixed({ creditsPerRequest: 1 }))).toBe('Low');
    expect(costTierFromPricing(fixed({ creditsPerRequest: 5 }))).toBe('Low');
    expect(costTierFromPricing(fixed({ creditsPerRequest: 20 }))).toBe('Medium');
    expect(costTierFromPricing(fixed({ creditsPerRequest: 80 }))).toBe('High');
    expect(costTierFromPricing(fixed({ creditsPerRequest: 250 }))).toBe('Premium');
  });
});

describe('parseModelPricingPayload', () => {
  const contractPayload = {
    models: [
      { id: 'openai/gpt-5.5', pricing: perToken({ inputUsdPer1M: 5, outputUsdPer1M: 30, creditsPer1MInput: 5000, creditsPer1MOutput: 30000 }) },
      { id: 'partner/fixed-example', pricing: fixed() },
      { id: 'virtuals/deepseek-deepseek-v3-2', pricing: null },
    ],
    billingNote: 'Hosted models are billed at provider cost with no markup: 1,000 AI Credits = $1.00.',
    fetchedAt: '2026-07-29T08:39:00.000Z',
  };

  it('parses the contract payload', () => {
    const parsed = parseModelPricingPayload(contractPayload);
    expect(parsed).not.toBeNull();
    expect(parsed?.models).toHaveLength(3);
    expect(parsed?.models[0]?.pricing).toMatchObject({ kind: 'per_token', creditsPer1MInput: 5000 });
    expect(parsed?.models[1]?.pricing).toMatchObject({ kind: 'fixed', creditsPerRequest: 1 });
    expect(parsed?.models[2]?.pricing).toBeNull();
    expect(parsed?.billingNote).toContain('1,000 AI Credits');
  });

  it('rejects payloads without a models array', () => {
    expect(parseModelPricingPayload(null)).toBeNull();
    expect(parseModelPricingPayload('nope')).toBeNull();
    expect(parseModelPricingPayload({ billingNote: 'x' })).toBeNull();
    expect(parseModelPricingPayload({ models: 'not-an-array' })).toBeNull();
  });

  it('nulls malformed pricing and drops entries without an id', () => {
    const parsed = parseModelPricingPayload({
      models: [
        { id: 'openai/gpt-5.5', pricing: { kind: 'per_token', inputUsdPer1M: 'NaN' } },
        { pricing: fixed() },
        { id: 'partner/fixed-example', pricing: { kind: 'mystery' } },
      ],
      billingNote: 42,
      fetchedAt: null,
    });
    expect(parsed?.models).toEqual([
      { id: 'openai/gpt-5.5', pricing: null },
      { id: 'partner/fixed-example', pricing: null },
    ]);
    expect(parsed?.billingNote).toBe('');
  });

  it('treats unknown per-token sources as estimates', () => {
    const parsed = parseModelPricingPayload({
      models: [{ id: 'openai/gpt-5.5', pricing: { ...perToken(), source: 'weird' } }],
    });
    expect(parsed?.models[0]?.pricing).toMatchObject({ kind: 'per_token', source: 'estimate' });
  });
});

describe('modelPricingById', () => {
  it('returns an empty map for a missing payload', () => {
    expect(modelPricingById(null).size).toBe(0);
  });

  it('indexes only entries that carry pricing', () => {
    const byId = modelPricingById({
      models: [
        { id: 'openai/gpt-5.5', pricing: perToken() },
        { id: 'virtuals/deepseek-deepseek-v3-2', pricing: null },
      ],
      billingNote: '',
      fetchedAt: '',
    });
    expect(byId.size).toBe(1);
    expect(byId.get('openai/gpt-5.5')).toMatchObject({ kind: 'per_token' });
  });
});

describe('mergeHostedModelsWithLivePricing', () => {
  const gpt = hostedModel({ id: 'openai/gpt-5.5', cost: 'Medium' });
  const fixedPriceModel = hostedModel({ id: 'partner/fixed-example', cost: 'Low', fixedPrice: '~$0.001/request' });
  const virtualsLive = hostedModel({
    id: 'virtuals/deepseek-deepseek-v3-2',
    providerKey: 'virtuals',
    cost: 'Variable',
    priceLabel: 'Provider catalog: $0.250 in / $0.350 out',
  });

  it('fills priceLabel and recomputes the tier for per-token pricing', () => {
    const byId = new Map<string, ModelPricing>([
      ['openai/gpt-5.5', perToken({ inputUsdPer1M: 5, outputUsdPer1M: 30, creditsPer1MInput: 5000, creditsPer1MOutput: 30000 })],
    ]);
    const [merged] = mergeHostedModelsWithLivePricing([gpt], byId);
    expect(merged).toMatchObject({
      id: 'openai/gpt-5.5',
      priceLabel: '5k in / 30k out credits per 1M',
      cost: 'High',
    });
  });

  it('fills fixedPrice and recomputes the tier for fixed pricing', () => {
    const byId = new Map<string, ModelPricing>([['partner/fixed-example', fixed()]]);
    const [merged] = mergeHostedModelsWithLivePricing([fixedPriceModel], byId);
    expect(merged).toMatchObject({
      id: 'partner/fixed-example',
      fixedPrice: '1 credit per request',
      cost: 'Low',
    });
  });

  it('carries the estimate marker into the merged price label', () => {
    const byId = new Map<string, ModelPricing>([
      ['openai/gpt-5.5', perToken({ source: 'estimate' })],
    ]);
    const [merged] = mergeHostedModelsWithLivePricing([gpt], byId);
    expect(merged?.priceLabel).toBe('~2k in / 10k out credits per 1M');
  });

  it('leaves models without live pricing untouched, including the Virtuals live merge', () => {
    const byId = new Map<string, ModelPricing>([['openai/gpt-5.5', perToken()]]);
    const merged = mergeHostedModelsWithLivePricing([gpt, virtualsLive], byId);
    expect(merged[1]).toBe(virtualsLive);
    expect(merged[1]?.priceLabel).toBe('Provider catalog: $0.250 in / $0.350 out');
    expect(merged[1]?.cost).toBe('Variable');
  });

  it('returns the input array unchanged when there is no pricing at all', () => {
    const models = [gpt, fixedPriceModel];
    expect(mergeHostedModelsWithLivePricing(models, new Map())).toBe(models);
  });

  it('does not mutate the source models', () => {
    const byId = new Map<string, ModelPricing>([['openai/gpt-5.5', perToken()]]);
    mergeHostedModelsWithLivePricing([gpt], byId);
    expect(gpt.priceLabel).toBeUndefined();
    expect(gpt.cost).toBe('Medium');
  });
});
