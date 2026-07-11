import { describe, expect, it } from 'vitest';

import {
  mapVirtualsComputeModelToHostedModel,
  mergeHostedModelsWithVirtualsLive,
} from '@/lib/virtuals-compute-models';
import type { HostedModelOption } from '@/lib/hosted-model-catalog';

describe('Virtuals Compute model catalog', () => {
  it('maps Virtuals /v1/models records into hosted model options', () => {
    expect(mapVirtualsComputeModelToHostedModel({
      id: 'anthropic-claude-sonnet-4-6',
      name: 'Anthropic: Claude Sonnet 4.6',
      description: 'Claude model for agentic coding and long workflows.',
      contextLength: 1_000_000,
      pricing: { input: 3.6, output: 18, cacheInput: 0.36 },
    })).toMatchObject({
      id: 'virtuals/anthropic-claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      providerKey: 'virtuals',
      provider: 'Virtuals',
      category: 'Coding',
      cost: 'High',
      context: '1M',
      priceLabel: 'Provider catalog: $3.60 in / $18.00 out',
    });
  });

  it('replaces stale static Virtuals entries only when live models are available', () => {
    const staticModels: HostedModelOption[] = [
      {
        id: 'openai/gpt-5-mini',
        name: 'GPT-5 Mini',
        providerKey: 'openai',
        provider: 'OpenAI',
        category: 'Balanced',
        cost: 'Medium',
        context: '400K',
        description: 'Static OpenAI option.',
      },
      {
        id: 'virtuals/old-model',
        name: 'Old Virtuals model',
        providerKey: 'virtuals',
        provider: 'Virtuals',
        category: 'Balanced',
        cost: 'Variable',
        context: 'Provider-defined',
        description: 'Old static Virtuals option.',
      },
    ];
    const liveModels: HostedModelOption[] = [{
      id: 'virtuals/anthropic-claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      providerKey: 'virtuals',
      provider: 'Virtuals',
      category: 'Coding',
      cost: 'High',
      context: '1M',
      description: 'Live Virtuals option.',
    }];

    expect(mergeHostedModelsWithVirtualsLive(staticModels, liveModels).map((model) => model.id)).toEqual([
      'openai/gpt-5-mini',
      'virtuals/anthropic-claude-sonnet-4-6',
    ]);
    expect(mergeHostedModelsWithVirtualsLive(staticModels, []).map((model) => model.id)).toEqual([
      'openai/gpt-5-mini',
      'virtuals/old-model',
    ]);
  });
});
