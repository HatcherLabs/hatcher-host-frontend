import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PUBLIC_CHAT_DAILY_AI_CREDIT_CAP,
  buildPublicChatUpdatePatch,
  resolveLoadedPublicChatConfig,
  resolveInitialCustomModelState,
  resolveLoadedModelConfig,
  resolveSavedModel,
} from '@/hooks/useAgentConfig';

describe('agent config model selection', () => {
  it('saves the selected hosted platform model instead of stale custom model state', () => {
    expect(resolveSavedModel({
      configProvider: 'openrouter',
      configModel: 'qwen/qwen3-coder-flash',
      useCustomModel: true,
      customModelInput: 'anthropic/claude-opus-4.7',
    })).toBe('qwen/qwen3-coder-flash');
  });

  it('does not treat hosted platform model ids as BYOK custom models on load', () => {
    expect(resolveInitialCustomModelState('openrouter', 'qwen/qwen3-coder-flash')).toEqual({
      useCustomModel: false,
      customModelInput: '',
    });
  });

  it('strips runtime proxy prefixes before saving hosted models', () => {
    const hostedProxyProviderKey = ['hatcher', 'llm', 'proxy'].join('-');

    expect(resolveSavedModel({
      configProvider: 'openrouter',
      configModel: `${hostedProxyProviderKey}/qwen/qwen3-235b-a22b-2507`,
      useCustomModel: false,
      customModelInput: '',
    })).toBe('qwen/qwen3.6-35b-a3b');
  });

  it('aliases legacy Groq-hosted model ids before saving hosted models', () => {
    expect(resolveSavedModel({
      configProvider: 'openrouter',
      configModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
      useCustomModel: false,
      customModelInput: '',
    })).toBe('qwen/qwen3.6-35b-a3b');
  });

  it('keeps custom BYOK model ids for non-hosted providers', () => {
    expect(resolveInitialCustomModelState('anthropic', 'my-claude-alias')).toEqual({
      useCustomModel: true,
      customModelInput: 'my-claude-alias',
    });
  });

  it('loads top-level provider and model before stale nested settings', () => {
    expect(resolveLoadedModelConfig({
      provider: 'openrouter',
      model: 'qwen/qwen3.6-35b-a3b',
      settings: {
        modelProvider: 'anthropic',
        model: 'claude-opus-4-7',
      },
    })).toEqual({
      provider: 'openrouter',
      model: 'qwen/qwen3.6-35b-a3b',
    });
  });

  it('falls back to nested settings for legacy configs', () => {
    expect(resolveLoadedModelConfig({
      settings: {
        modelProvider: 'anthropic',
        model: 'claude-opus-4-7',
      },
    })).toEqual({
      provider: 'anthropic',
      model: 'claude-opus-4-7',
    });
  });

  it('loads public chat config with the default daily cap for older enabled agents', () => {
    expect(resolveLoadedPublicChatConfig({
      isPublic: true,
      config: { publicChat: { enabled: true } },
    })).toEqual({
      isPublic: true,
      publicChatEnabled: true,
      publicChatDailyAiCreditCap: DEFAULT_PUBLIC_CHAT_DAILY_AI_CREDIT_CAP,
    });
  });

  it('builds a public chat patch that makes chat-enabled agents public', () => {
    expect(buildPublicChatUpdatePatch({
      isPublic: false,
      publicChatEnabled: true,
      publicChatDailyAiCreditCap: 750,
    })).toEqual({
      isPublic: true,
      publicChat: {
        enabled: true,
        dailyAiCreditCap: 750,
      },
    });
  });

  it('disables public chat when the public profile is disabled', () => {
    expect(buildPublicChatUpdatePatch({
      isPublic: false,
      publicChatEnabled: false,
      publicChatDailyAiCreditCap: 750,
    })).toEqual({
      isPublic: false,
      publicChat: {
        enabled: false,
        dailyAiCreditCap: 750,
      },
    });
  });
});
