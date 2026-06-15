import { describe, expect, it } from 'vitest';
import {
  getHostedModelOption,
  normalizeHostedModelForUi,
  resolveActiveModelDisplay,
  filterHostedModels,
} from '@/lib/hosted-model-catalog';

describe('hosted model catalog', () => {
  it('normalizes proxy-prefixed and retired hosted model ids', () => {
    const hostedProxyProviderKey = ['hatcher', 'llm', 'proxy'].join('-');

    expect(normalizeHostedModelForUi(`${hostedProxyProviderKey}/qwen/qwen3-32b`)).toBe(
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

  it('surfaces the expanded AceData hosted model catalog', () => {
    expect(getHostedModelOption('acedata/claude-sonnet-4-6')).toMatchObject({
      name: 'Claude Sonnet 4.6 (AceData)',
      provider: 'AceData',
      context: '1M',
    });

    expect(getHostedModelOption('acedata/gemini-2.5-pro')).toMatchObject({
      name: 'Gemini 2.5 Pro (AceData)',
      provider: 'AceData',
    });

    const aceDataModels = filterHostedModels({
      provider: 'acedata',
      privacy: 'partner',
      search: 'deepseek',
    });

    expect(aceDataModels.map((model) => model.id)).toContain('acedata/deepseek-v3.2-exp');
    expect(aceDataModels.every((model) => model.providerKey === 'acedata')).toBe(true);
  });

  it('surfaces MiniMax models as platform-hosted models through UsePod and OpenRouter', () => {
    expect(getHostedModelOption('minimax/minimax-m3')).toMatchObject({
      name: 'MiniMax M3',
      provider: 'MiniMax',
      providerKey: 'minimax',
      context: '1M',
    });

    expect(
      resolveActiveModelDisplay({
        provider: 'openrouter',
        model: 'minimax/minimax-m3',
      }),
    ).toMatchObject({
      provider: 'MiniMax',
      route: 'UsePod primary / OpenRouter fallback',
      privacy: 'Hatcher-hosted',
    });

    const miniMaxModels = filterHostedModels({
      provider: 'minimax',
      privacy: 'hatcher',
      search: 'm2.7',
    });

    expect(miniMaxModels.map((model) => model.id)).toContain('minimax/minimax-m2.7');
  });

  it('returns saved model metadata for unknown hosted ids', () => {
    expect(getHostedModelOption('custom/provider-model')).toMatchObject({
      id: 'custom/provider-model',
      category: 'Saved',
      cost: 'Variable',
    });
  });
});
