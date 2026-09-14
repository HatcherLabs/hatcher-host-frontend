import { describe, expect, it } from 'vitest';
import { HOSTED_MODELS } from '@/lib/hosted-model-catalog';
import { mergeHostedModelsWithLiveCatalog, parseModelPricingPayload, providersForHostedModels } from '@/lib/model-pricing';

describe('live model catalog', () => {
  it('keeps small-context models available only for compatible frameworks', () => {
    const payload = { models: [{ id: 'lab/small', context_length: 32000, pricing: null }], fetchedAt: '', billingNote: '' };
    expect(mergeHostedModelsWithLiveCatalog([], payload, 'hermes')).toHaveLength(0);
    expect(mergeHostedModelsWithLiveCatalog([], payload, 'openclaw')).toHaveLength(1);
  });
  it('adds unknown providers and models without a code release and removes withdrawn choices', () => {
    const payload = parseModelPricingPayload({ models: [{
      id: 'newlab/new-model', name: 'New model', owned_by: 'newlab', context_length: 256000,
      pricing: null, providers: ['usepod'],
    }], fetchedAt: '', billingNote: '' });
    const models = mergeHostedModelsWithLiveCatalog(HOSTED_MODELS, payload);
    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({ id: 'newlab/new-model', name: 'New model', providerKey: 'newlab', context: '256K', routes: ['usepod'] });
    expect(providersForHostedModels(models).some((provider) => provider.key === 'newlab')).toBe(true);
  });
  it('uses the fallback before the first successful fetch', () => {
    expect(mergeHostedModelsWithLiveCatalog(HOSTED_MODELS, null)).toBe(HOSTED_MODELS);
  });
  it('does not advertise retired integrations from a stale server response', () => {
    const models = mergeHostedModelsWithLiveCatalog([], { models: [{ id: 'virtuals/old', pricing: null }], fetchedAt: '', billingNote: '' });
    expect(models).toEqual([]);
  });
});
