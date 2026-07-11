import { describe, expect, it } from 'vitest';
import {
  HOSTED_MODELS,
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
    expect(normalizeHostedModelForUi('x-ai/grok-code-fast-1')).toBe('x-ai/grok-4.5');
    expect(normalizeHostedModelForUi('xiaomi/mimo-v2-omni')).toBe('xiaomi/mimo-v2.5');
    expect(normalizeHostedModelForUi('virtuals/llama-3-3-70b')).toBe('virtuals/deepseek-deepseek-v3-2');
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
    expect(HOSTED_MODELS.some((model) => model.id === 'acedata/gpt-5.5')).toBe(false);
  });

  it('keeps the static catalog aligned with current provider catalogs', () => {
    const ids = new Set(HOSTED_MODELS.map((model) => model.id));

    expect([
      'xiaomi/mimo-v2-pro',
      'xiaomi/mimo-v2-omni',
      'x-ai/grok-4.1-fast',
      'x-ai/grok-code-fast-1',
      'acedata/gpt-5.5',
      'virtuals/llama-3-3-70b',
    ].filter((id) => ids.has(id))).toEqual([]);

    expect(getHostedModelOption('x-ai/grok-4.5')).toMatchObject({
      provider: 'xAI',
      category: 'Premium',
      cost: 'High',
      context: '500K',
    });

    const virtualsFallback = [
      ['virtuals/anthropic-claude-fable-5', '1M'],
      ['virtuals/e2ee-deepseek-v4-flash', '1M'],
      ['virtuals/openai-gpt-56-luna', '1M'],
      ['virtuals/openai-gpt-56-luna-pro', '1M'],
      ['virtuals/openai-gpt-56-sol', '1M'],
      ['virtuals/openai-gpt-56-sol-pro', '1M'],
      ['virtuals/openai-gpt-56-terra', '1M'],
      ['virtuals/openai-gpt-56-terra-pro', '1M'],
      ['virtuals/x-ai-grok-4-5', '500K'],
    ] as const;

    for (const [id, context] of virtualsFallback) {
      expect(getHostedModelOption(id)).toMatchObject({
        id,
        provider: 'Virtuals',
        cost: 'Variable',
        context,
      });
    }

    expect([
      getHostedModelOption('virtuals/moonshotai-kimi-k2-5').context,
      getHostedModelOption('virtuals/moonshotai-kimi-k2-6').context,
      getHostedModelOption('virtuals/moonshotai-kimi-k2-7-code').context,
      getHostedModelOption('virtuals/google-gemini-3-flash-preview').context,
    ]).toEqual(['256K', '256K', '256K', '256K']);
    expect(getHostedModelOption('virtuals/deepseek-deepseek-v3-2').context).toBe('160K');
  });

  it('shows partner-primary routes and keeps Xiaomi on the Hatcher-hosted route', () => {
    expect(resolveActiveModelDisplay({
      provider: 'openrouter',
      model: 'openserv/serv-mini',
    })).toMatchObject({
      route: 'OpenServ primary / OpenRouter fallback',
      privacy: 'OpenServ-hosted',
    });

    expect(resolveActiveModelDisplay({
      provider: 'openrouter',
      model: 'acedata/gpt-5.4',
    })).toMatchObject({
      route: 'AceData primary / OpenRouter fallback',
      privacy: 'AceData-hosted',
    });

    const hatcherHostedXiaomi = filterHostedModels({
      provider: 'xiaomi',
      privacy: 'hatcher',
    });
    expect(hatcherHostedXiaomi.map((model) => model.id)).toEqual([
      'xiaomi/mimo-v2.5-pro',
      'xiaomi/mimo-v2.5',
    ]);
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
