import { describe, expect, it } from 'vitest';
import {
  HOSTED_MODELS,
  HOSTED_MODEL_PROVIDERS,
  getHostedModelOption,
  normalizeHostedModelForUi,
  resolveActiveModelDisplay,
  filterHostedModels,
  hostedModelPrivacy,
} from '@/lib/hosted-model-catalog';

describe('hosted model catalog', () => {
  it('normalizes proxy-prefixed and retired hosted model ids', () => {
    const hostedProxyProviderKey = ['hatcher', 'llm', 'proxy'].join('-');

    expect(normalizeHostedModelForUi(`${hostedProxyProviderKey}/qwen/qwen3-32b`)).toBe(
      'qwen/qwen3.6-35b-a3b',
    );
    expect(normalizeHostedModelForUi('x-ai/grok-code-fast-1')).toBe('x-ai/grok-4.5');
    expect(normalizeHostedModelForUi('xiaomi/mimo-v2-omni')).toBe('xiaomi/mimo-v2.5');
    expect(normalizeHostedModelForUi('virtuals/llama-3-3-70b')).toBe('deepseek/deepseek-v4-flash');
    expect(normalizeHostedModelForUi('virtuals/anthropic-claude-fable-5')).toBe('deepseek/deepseek-v4-flash');
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

    expect(HOSTED_MODEL_PROVIDERS.some((provider) => provider.key === 'virtuals')).toBe(false);
    expect(HOSTED_MODELS.some((model) => model.id.startsWith('virtuals/'))).toBe(false);
  });

  it('exposes the latest verified common models on the Hatcher network', () => {
    const expected = new Map([
      ['openai/gpt-5.6-luna', '1.05M'],
      ['openai/gpt-5.6-terra', '1.05M'],
      ['openai/gpt-5.6-sol', '1.05M'],
      ['anthropic/claude-sonnet-5', '1M'],
      ['anthropic/claude-fable-5', '1M'],
      ['google/gemini-3.5-flash', '1.05M'],
      ['z-ai/glm-5.2', '1.05M'],
      ['qwen/qwen3.7-plus', '1M'],
    ]);

    for (const [id, context] of expected) {
      expect(getHostedModelOption(id)).toMatchObject({ id, context });
      expect(hostedModelPrivacy(getHostedModelOption(id))).toBe('hatcher');
    }
  });

  it('partitions provider filters into Hatcher model families and inference partners', () => {
    const routesByProvider = new Map(
      HOSTED_MODEL_PROVIDERS.map((provider) => [
        provider.key,
        new Set(
          HOSTED_MODELS
            .filter((model) => model.providerKey === provider.key)
            .map((model) => hostedModelPrivacy(model)),
        ),
      ]),
    );

    for (const provider of ['openserv', 'acedata']) {
      expect(routesByProvider.get(provider)).toEqual(new Set(['partner']));
    }
    for (const provider of ['openai', 'anthropic', 'google', 'qwen', 'z-ai']) {
      expect(routesByProvider.get(provider)).toEqual(new Set(['hatcher']));
    }
  });

  it('shows partner-primary routes and keeps Xiaomi on the Hatcher-hosted route', () => {
    expect(resolveActiveModelDisplay({
      provider: 'openrouter',
      model: 'openserv/deepseek-v4-pro',
    })).toMatchObject({
      route: 'OpenServ primary / OpenRouter fallback',
      privacy: 'OpenServ-hosted',
    });

    expect(filterHostedModels({ provider: 'openserv' }).map((model) => model.id)).toEqual([
      'openserv/deepseek-v4-flash',
      'openserv/deepseek-v4-pro',
    ]);

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
