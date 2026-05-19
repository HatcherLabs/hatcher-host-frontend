import { describe, expect, it } from 'vitest';
import {
  getHostedModelOption,
  normalizeHostedModelForUi,
  resolveActiveModelDisplay,
  filterHostedModels,
} from '@/lib/hosted-model-catalog';

describe('hosted model catalog', () => {
  it('normalizes proxy-prefixed and retired hosted model ids', () => {
    expect(normalizeHostedModelForUi('hatcher-llm-proxy/qwen/qwen3-32b')).toBe(
      'qwen/qwen3.6-35b-a3b',
    );
  });

  it('builds a readable active hosted model display', () => {
    expect(
      resolveActiveModelDisplay({
        provider: 'openrouter',
        model: 'idle/claude-sonnet-4-6',
      }),
    ).toMatchObject({
      name: 'Claude Sonnet 4.6 (IDLE)',
      provider: 'IDLE',
      route: 'IDLE partner',
    });
  });

  it('builds a readable BYOK model display', () => {
    expect(
      resolveActiveModelDisplay({
        provider: 'venice',
        model: 'venice-uncensored',
      }),
    ).toMatchObject({
      name: 'venice-uncensored',
      provider: 'Venice AI',
      privacy: 'BYOK direct',
    });
  });

  it('filters hosted models by provider, tag, cost, and privacy route', () => {
    const filtered = filterHostedModels({
      provider: 'idle',
      tag: 'fixed price',
      maxCostRank: 2,
      privacy: 'partner',
    });

    expect(filtered.map((model) => model.id)).toContain('idle/claude-haiku-4-5');
    expect(filtered.every((model) => model.providerKey === 'idle')).toBe(true);
  });

  it('returns saved model metadata for unknown hosted ids', () => {
    expect(getHostedModelOption('custom/provider-model')).toMatchObject({
      id: 'custom/provider-model',
      category: 'Saved',
      cost: 'Variable',
    });
  });
});
