'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { getBYOKProvider } from '@hatcher/shared';

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
  const [configProvider, setConfigProvider] = useState('groq');
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
    const loadedModel =
      ((char as Record<string, unknown>).settings as Record<string, unknown>)?.model as string ??
      (char as Record<string, unknown>).model as string ?? '';
    setConfigModel(loadedModel);
    const loadedProvider =
      ((char as Record<string, unknown>).settings as Record<string, unknown>)?.modelProvider as string ??
      (char as Record<string, unknown>).provider as string ?? 'groq';
    setConfigProvider(loadedProvider.toLowerCase());
    const providerMeta = getBYOKProvider(loadedProvider.toLowerCase());
    if (loadedModel && providerMeta && !providerMeta.models.some(m => m.id === loadedModel)) {
      setUseCustomModel(true);
      setCustomModelInput(loadedModel);
    }
  }, [agent]);

  const hasApiKey = (() => {
    const char = agent?.config ?? {};
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
    if (configProvider !== 'groq') {
      const hasExistingKey = hasApiKey;
      const hasNewKey = byokKeyInput.trim().length > 0;
      if (!hasExistingKey && !hasNewKey) {
        const providerName = getBYOKProvider(configProvider)?.name ?? configProvider;
        setSaveMsg(`Error: API key is required for ${providerName}. Enter your key or revert to the free Groq tier.`);
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
    updateData.config = {
      systemPrompt: configSystemPrompt,
      skills: configSkills.split(',').map((s) => s.trim()).filter(Boolean),
      model: (useCustomModel ? customModelInput.trim() : configModel) || undefined,
      provider: configProvider || undefined,
      ...(agent.framework === 'elizaos' ? {
        bio: configBio.trim() || undefined,
        lore: configLore.trim() || undefined,
        topics: configTopics.split(',').map(s => s.trim()).filter(Boolean),
        adjectives: configAdjectives.split(',').map(s => s.trim()).filter(Boolean),
        style: configStyle.trim() ? {
          all: configStyle.split('\n').map(s => s.trim()).filter(Boolean),
        } : undefined,
      } : {}),
      ...(byokKeyInput.trim() ? {
        byok: {
          provider: configProvider as 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'openrouter',
          apiKey: byokKeyInput.trim(),
          model: (useCustomModel ? customModelInput.trim() : configModel) || undefined,
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
