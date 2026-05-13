'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { getBYOKProvider } from '@hatcher/shared';

export const HOSTED_PROVIDER = 'openrouter';
const HOSTED_PROXY_PROVIDER_PREFIX = 'hatcher-llm-proxy/';
const HOSTED_MODEL_ALIASES = new Map<string, string>([
  ['meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3.6-35b-a3b'],
  ['qwen/qwen3-32b', 'qwen/qwen3.6-35b-a3b'],
  ['qwen/qwen3-235b-a22b-2507', 'qwen/qwen3.6-35b-a3b'],
]);

type CustomModelState = {
  useCustomModel: boolean;
  customModelInput: string;
};

type LoadedModelConfig = {
  provider: string;
  model: string;
};

export function normalizeConfigProvider(provider: string | null | undefined): string {
  return (provider || HOSTED_PROVIDER).toLowerCase();
}

export function resolveLoadedModelConfig(config: Record<string, unknown>): LoadedModelConfig {
  const settings = config.settings as Record<string, unknown> | null | undefined;
  const topLevelModel = typeof config.model === 'string' ? config.model : '';
  const settingsModel = typeof settings?.model === 'string' ? settings.model : '';
  const topLevelProvider = typeof config.provider === 'string' ? config.provider : '';
  const settingsProvider = typeof settings?.modelProvider === 'string' ? settings.modelProvider : '';

  return {
    provider: normalizeConfigProvider(topLevelProvider || settingsProvider || HOSTED_PROVIDER),
    model: topLevelModel || settingsModel,
  };
}

export function resolveInitialCustomModelState(
  loadedProvider: string | null | undefined,
  loadedModel: string,
): CustomModelState {
  const normalizedProvider = normalizeConfigProvider(loadedProvider);
  if (!loadedModel || normalizedProvider === HOSTED_PROVIDER) {
    return { useCustomModel: false, customModelInput: '' };
  }

  const providerMeta = getBYOKProvider(normalizedProvider);
  const isKnownProviderModel = providerMeta?.models.some((m) => m.id === loadedModel) ?? false;
  if (providerMeta && !isKnownProviderModel) {
    return { useCustomModel: true, customModelInput: loadedModel };
  }

  return { useCustomModel: false, customModelInput: '' };
}

export function resolveSavedModel(options: {
  configProvider: string;
  configModel: string;
  useCustomModel: boolean;
  customModelInput: string;
}): string | undefined {
  const selectedModel = normalizeConfigProvider(options.configProvider) === HOSTED_PROVIDER
    ? options.configModel
    : options.useCustomModel
      ? options.customModelInput
      : options.configModel;
  let trimmedModel = selectedModel.trim();
  if (normalizeConfigProvider(options.configProvider) === HOSTED_PROVIDER) {
    if (trimmedModel.startsWith(HOSTED_PROXY_PROVIDER_PREFIX)) {
      trimmedModel = trimmedModel.slice(HOSTED_PROXY_PROVIDER_PREFIX.length);
    }
    trimmedModel = HOSTED_MODEL_ALIASES.get(trimmedModel) ?? trimmedModel;
  }
  return trimmedModel || undefined;
}

export function useAgentConfig(
  agent: Agent | null,
  id: string,
  setAgent: (agent: Agent) => void,
) {
  const [configName, setConfigName] = useState('');
  const [configDesc, setConfigDesc] = useState('');
  const [configBio, setConfigBio] = useState('');
  const [configLore, setConfigLore] = useState('');
  const [configTopics, setConfigTopics] = useState('');
  const [configStyle, setConfigStyle] = useState('');
  const [configAdjectives, setConfigAdjectives] = useState('');
  const [configSystemPrompt, setConfigSystemPrompt] = useState('');
  const [configSkills, setConfigSkills] = useState('');
  const [configModel, setConfigModel] = useState('');
  const [configProvider, setConfigProvider] = useState(HOSTED_PROVIDER);
  const [customModelInput, setCustomModelInput] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [byokKeyInput, setByokKeyInput] = useState('');
  const [showByokKey, setShowByokKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Initialize config state from agent data
  useEffect(() => {
    if (!agent) return;
    setConfigName(agent.name);
    setConfigDesc(agent.description ?? '');
    const char = agent.config ?? {};
    setConfigBio((char as Record<string, unknown>).bio as string ?? '');
    setConfigLore(Array.isArray((char as Record<string, unknown>).lore) ? ((char as Record<string, unknown>).lore as string[]).join('\n') : '');
    setConfigTopics(Array.isArray((char as Record<string, unknown>).topics) ? ((char as Record<string, unknown>).topics as string[]).join(', ') : '');
    setConfigAdjectives(Array.isArray((char as Record<string, unknown>).adjectives) ? ((char as Record<string, unknown>).adjectives as string[]).join(', ') : '');
    const styleObj = (char as Record<string, unknown>).style as Record<string, string[]> | undefined;
    setConfigStyle(
      styleObj?.all?.length ? styleObj.all.join('\n')
        : styleObj?.chat?.length ? styleObj.chat.join('\n')
        : ''
    );
    setConfigSystemPrompt((char as Record<string, unknown>).systemPrompt as string ?? '');
    setConfigSkills(Array.isArray((char as Record<string, unknown>).skills) ? ((char as Record<string, unknown>).skills as string[]).join(', ') : '');
    const { provider: normalizedProvider, model: loadedModel } = resolveLoadedModelConfig(char as Record<string, unknown>);
    setConfigModel(loadedModel);
    setConfigProvider(normalizedProvider);
    const customState = resolveInitialCustomModelState(normalizedProvider, loadedModel);
    setUseCustomModel(customState.useCustomModel);
    setCustomModelInput(customState.customModelInput);
  }, [agent]);

  const hasApiKey = (() => {
    const char = agent?.config ?? {};
    const byok = (char as Record<string, unknown>).byok as Record<string, unknown> | undefined;
    if (typeof byok?.apiKey === 'string' && byok.apiKey.length > 0) return true;
    const secrets = (char as Record<string, unknown>).secrets as Record<string, unknown> | undefined;
    return !!(secrets && Object.keys(secrets).length > 0);
  })();

  const saveConfig = useCallback(async (commitMessage?: string) => {
    if (!agent) return;
    const trimmedName = configName.trim() || agent.name;
    if (trimmedName.length < 3 || trimmedName.length > 50) {
      setSaveMsg('Error: Agent name must be 3-50 characters');
      return;
    }
    if (!/^[a-zA-Z0-9 \-]+$/.test(trimmedName)) {
      setSaveMsg('Error: Name can only contain letters, numbers, spaces, and hyphens');
      return;
    }
    const normalizedProvider = normalizeConfigProvider(configProvider);
    const isHostedProvider = normalizedProvider === HOSTED_PROVIDER;
    if (!isHostedProvider) {
      const hasExistingKey = hasApiKey;
      const hasNewKey = byokKeyInput.trim().length > 0;
      if (!hasExistingKey && !hasNewKey) {
        const providerName = getBYOKProvider(configProvider)?.name ?? configProvider;
        setSaveMsg(`Error: API key is required for ${providerName}. Enter your key or switch back to hosted OpenRouter.`);
        return;
      }
    }
    setSaving(true);
    setSaveMsg(null);
    const updateData: Record<string, unknown> = {
      name: trimmedName,
      description: configDesc.trim() || undefined,
      ...(commitMessage?.trim() ? { commitMessage: commitMessage.trim() } : {}),
    };
    const savedModel = resolveSavedModel({
      configProvider: normalizedProvider,
      configModel,
      useCustomModel,
      customModelInput,
    });
    updateData.config = {
      systemPrompt: configSystemPrompt,
      skills: configSkills.split(',').map((s) => s.trim()).filter(Boolean),
      settings: null,
      model: savedModel,
      provider: normalizedProvider || undefined,
      ...(isHostedProvider ? { byok: null } : {}),
      ...(!isHostedProvider && byokKeyInput.trim() ? {
        byok: {
          provider: normalizedProvider as 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'openrouter',
          apiKey: byokKeyInput.trim(),
          model: savedModel,
        },
      } : {}),
    };
    const res = await api.updateAgent(id, updateData as Parameters<typeof api.updateAgent>[1]);
    setSaving(false);
    if (res.success) {
      setAgent(res.data);
      setByokKeyInput('');
      const restartNote = (res.data as unknown as Record<string, unknown>)?.restarted
        ? ' — container restarting with new config'
        : '';
      setSaveMsg(`Configuration saved successfully${restartNote}`);
      setTimeout(() => setSaveMsg(null), 5000);
    } else {
      setSaveMsg('Error: ' + res.error);
    }
  }, [agent, id, setAgent, configName, configDesc, configSystemPrompt, configSkills, configModel, configProvider,
    configBio, configLore, configTopics, configAdjectives, configStyle,
    useCustomModel, customModelInput, byokKeyInput, hasApiKey]);

  return {
    configName, setConfigName,
    configDesc, setConfigDesc,
    configBio, setConfigBio,
    configLore, setConfigLore,
    configTopics, setConfigTopics,
    configStyle, setConfigStyle,
    configAdjectives, setConfigAdjectives,
    configSystemPrompt, setConfigSystemPrompt,
    configSkills, setConfigSkills,
    configModel, setConfigModel,
    configProvider, setConfigProvider,
    customModelInput, setCustomModelInput,
    useCustomModel, setUseCustomModel,
    byokKeyInput, setByokKeyInput,
    showByokKey, setShowByokKey,
    saving,
    saveMsg, setSaveMsg,
    saveConfig,
    hasApiKey,
  };
}
