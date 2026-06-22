'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { api, req } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getLegacyHostedProxyProviderPrefix } from '@/lib/legacy-hosted-model';
import styles from './ChatToHatch.module.css';

type Framework = 'openclaw' | 'hermes';

type InstallPlanItem = {
  type: 'skill' | 'plugin' | 'integration';
  name: string;
  reason: string;
};

type AvatarTraits = {
  seed?: string;
  palette?: string;
  accentColor?: string;
  secondaryColor?: string;
  emblem?: string;
  accessory?: string;
  mood?: string;
};

type ModelCost = 'Low' | 'Medium' | 'High' | 'Premium' | 'Variable';

type HostedModelProvider = {
  key: string;
  name: string;
};

type HostedModel = {
  id: string;
  name: string;
  providerKey: string;
  provider: string;
  category: string;
  cost: ModelCost;
  context: string;
  fixedPrice?: string;
};

interface ParsedConfig {
  framework: Framework;
  frameworkReason: string;
  name: string;
  description: string;
  personality: string;
  systemPrompt: string;
  suggestedSkills: string[];
  suggestedPlugins: string[];
  selectedSkills: string[];
  selectedPlugins: string[];
  installPlan: InstallPlanItem[];
  model: string;
  greeting: string;
  avatarHint: string;
  avatarVariant: string;
  avatarTraits: AvatarTraits;
}

interface ParseResponse {
  reply: string;
  config: ParsedConfig;
}

interface Msg {
  id: string;
  who: 'user' | 'assistant' | 'system';
  text: string;
  isError?: boolean;
}

const FW_VISUAL: Record<
  Framework,
  { color: string; mark: string; label: string }
> = {
  openclaw: { color: 'var(--tech-accent)', mark: 'OC', label: 'OpenClaw' },
  hermes: { color: 'var(--color-info)', mark: 'HE', label: 'Hermes' },
};

const AgentRoomAvatarPreview = dynamic(
  () =>
    import('@/components/agents/tabs/ChatTab/AgentRoomAvatarPreview').then(
      (m) => m.AgentRoomAvatarPreview,
    ),
  {
    ssr: false,
    loading: () => <div className={styles.avatarFallback} aria-hidden />,
  },
);

const AVATAR_OPTIONS = [
  { id: '', name: 'Auto' },
  { id: 'animated-robot', name: 'Service Robot' },
  { id: 'freepixel-robot', name: 'Alpha Robot' },
  { id: 'service-robot', name: 'Stealth Service Bot' },
  { id: 'rusty-mecha', name: 'Rusty Mecha' },
  { id: 'abandoned-mecha', name: 'Abandoned Mecha' },
  { id: 'scout-drone', name: 'Scout Drone' },
  { id: 'cyber-drone', name: 'Cyber Drone' },
  { id: 'buzz-droid', name: 'Buzz Droid' },
  { id: 'xbot-agent', name: 'Blocky Cyborg' },
  { id: 'cybernetic-warrior', name: 'Cybernetic Warrior' },
  { id: 'alien-analyst', name: 'Alien Intelligence' },
  { id: 'space-analyst', name: 'Space Analyst' },
  { id: 'stealth-operator', name: 'Stealth Operator' },
  { id: 'rogue-operator', name: 'Rogue Operator' },
  { id: 'space-operator', name: 'Astronaut Operator' },
  { id: 'ready-player', name: 'Studio Human' },
  { id: 'street-scout', name: 'Street Scout Agent' },
  { id: 'field-operator', name: 'Field Operator' },
  { id: 'studio-operator', name: 'Lab Analyst' },
  { id: 'shadow-operator', name: 'Shadow Operator' },
];

function avatarOptionName(id: string): string {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === id)?.name ?? id;
}

const AVATAR_OPTION_IDS = new Set(AVATAR_OPTIONS.map((avatar) => avatar.id));
const AVATAR_LEGACY_ALIASES: Record<string, string> = {
  'openclaw-mech': 'animated-robot',
  'openclaw-scout': 'xbot-agent',
  'openclaw-heavy': 'abandoned-mecha',
  'openclaw-drone': 'scout-drone',
  'hermes-oracle': 'freepixel-robot',
  'hermes-scribe': 'studio-operator',
  'fox-companion': 'street-scout',
  blob: 'buzz-droid',
  cat: 'street-scout',
  crab: 'scout-drone',
  humanoid: 'ready-player',
  robot: 'animated-robot',
};

function sanitizeAvatarVariant(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  if (AVATAR_OPTION_IDS.has(trimmed)) return trimmed;
  return AVATAR_LEGACY_ALIASES[trimmed] ?? '';
}

const MODEL_PROVIDERS: HostedModelProvider[] = [
  { key: 'deepseek', name: 'DeepSeek' },
  { key: 'openai', name: 'OpenAI' },
  { key: 'anthropic', name: 'Anthropic' },
  { key: 'idle', name: 'IDLE' },
  { key: 'openserv', name: 'OpenServ' },
  { key: 'xiaomi', name: 'Xiaomi MiMo' },
  { key: 'acedata', name: 'AceData' },
  { key: 'minimax', name: 'MiniMax' },
  { key: 'google', name: 'Google' },
  { key: 'qwen', name: 'Qwen' },
  { key: 'x-ai', name: 'xAI' },
  { key: 'mistralai', name: 'Mistral' },
  { key: 'moonshotai', name: 'Moonshot AI' },
  { key: 'z-ai', name: 'Z.ai' },
  { key: 'nvidia', name: 'NVIDIA' },
  { key: 'openrouter', name: 'OpenRouter' },
];

const HOSTED_MODELS: HostedModel[] = [
  [
    'deepseek/deepseek-v4-flash',
    'DeepSeek V4 Flash',
    'deepseek',
    'DeepSeek',
    'Default',
    'Low',
    '1M',
  ],
  [
    'deepseek/deepseek-v4-pro',
    'DeepSeek V4 Pro',
    'deepseek',
    'DeepSeek',
    'Balanced',
    'Medium',
    '1M',
  ],
  [
    'deepseek/deepseek-v3.2',
    'DeepSeek V3.2',
    'deepseek',
    'DeepSeek',
    'Fast',
    'Low',
    '128K',
  ],
  [
    'openai/gpt-5-nano',
    'GPT-5 Nano',
    'openai',
    'OpenAI',
    'Fast',
    'Low',
    '400K',
  ],
  [
    'openai/gpt-5-mini',
    'GPT-5 Mini',
    'openai',
    'OpenAI',
    'Balanced',
    'Medium',
    '400K',
  ],
  [
    'openai/gpt-5.1-codex-mini',
    'GPT-5.1 Codex Mini',
    'openai',
    'OpenAI',
    'Coding',
    'Medium',
    '400K',
  ],
  [
    'openai/gpt-5.3-codex',
    'GPT-5.3 Codex',
    'openai',
    'OpenAI',
    'Coding',
    'High',
    '400K',
  ],
  [
    'openai/gpt-5.4-nano',
    'GPT-5.4 Nano',
    'openai',
    'OpenAI',
    'Fast',
    'Low',
    '400K',
  ],
  [
    'openai/gpt-5.4-mini',
    'GPT-5.4 Mini',
    'openai',
    'OpenAI',
    'Balanced',
    'Medium',
    '400K',
  ],
  ['openai/gpt-5.4', 'GPT-5.4', 'openai', 'OpenAI', 'Premium', 'High', '1.05M'],
  [
    'openai/gpt-5.5',
    'GPT-5.5',
    'openai',
    'OpenAI',
    'Premium',
    'Premium',
    '1.05M',
  ],
  [
    'openai/gpt-5.5-pro',
    'GPT-5.5 Pro',
    'openai',
    'OpenAI',
    'Premium',
    'Premium',
    '1.05M',
  ],
  [
    'anthropic/claude-haiku-4.5',
    'Claude Haiku 4.5',
    'anthropic',
    'Anthropic',
    'Balanced',
    'Medium',
    '200K',
  ],
  [
    'idle/claude-haiku-4-5',
    'Claude Haiku 4.5 (IDLE)',
    'idle',
    'IDLE',
    'Partner',
    'Low',
    '200K',
    '1 AI Credit/request',
  ],
  [
    'idle/claude-sonnet-4-6',
    'Claude Sonnet 4.6 (IDLE)',
    'idle',
    'IDLE',
    'Partner',
    'Medium',
    '1M',
    '3 AI Credits/request',
  ],
  [
    'openserv/serv-nano',
    'SERV Nano',
    'openserv',
    'OpenServ',
    'Fast',
    'Low',
    '128K',
  ],
  [
    'openserv/serv-mini',
    'SERV Mini',
    'openserv',
    'OpenServ',
    'Balanced',
    'Medium',
    '1M',
  ],
  [
    'openserv/serv-swift',
    'SERV Swift',
    'openserv',
    'OpenServ',
    'Fast',
    'Medium',
    '200K',
  ],
  [
    'openserv/serv-standard',
    'SERV Standard',
    'openserv',
    'OpenServ',
    'Balanced',
    'High',
    '200K',
  ],
  [
    'openserv/serv-pro',
    'SERV Pro',
    'openserv',
    'OpenServ',
    'Advanced',
    'High',
    '1M',
  ],
  [
    'openserv/serv-ultra',
    'SERV Ultra',
    'openserv',
    'OpenServ',
    'Premium',
    'Premium',
    '200K',
  ],
  [
    'minimax/minimax-m3',
    'MiniMax M3',
    'minimax',
    'MiniMax',
    'Coding',
    'Medium',
    '1M',
  ],
  [
    'minimax/minimax-m2.7',
    'MiniMax M2.7',
    'minimax',
    'MiniMax',
    'Balanced',
    'Medium',
    '200K',
  ],
  [
    'xiaomi/mimo-v2.5-pro',
    'MiMo V2.5 Pro',
    'xiaomi',
    'Xiaomi MiMo',
    'Partner',
    'Low',
    '1M',
    'AI Credits',
  ],
  [
    'xiaomi/mimo-v2.5',
    'MiMo V2.5',
    'xiaomi',
    'Xiaomi MiMo',
    'Balanced',
    'Low',
    '1M',
    'AI Credits',
  ],
  [
    'xiaomi/mimo-v2-pro',
    'MiMo V2 Pro',
    'xiaomi',
    'Xiaomi MiMo',
    'Partner',
    'Low',
    '1M',
    'AI Credits',
  ],
  [
    'xiaomi/mimo-v2-omni',
    'MiMo V2 Omni',
    'xiaomi',
    'Xiaomi MiMo',
    'Multimodal',
    'Low',
    '256K',
    'AI Credits',
  ],
  [
    'acedata/claude-opus-4-8',
    'Claude Opus 4.8 (AceData)',
    'acedata',
    'AceData',
    'Partner',
    'Premium',
    '1M',
  ],
  [
    'acedata/claude-opus-4-7',
    'Claude Opus 4.7 (AceData)',
    'acedata',
    'AceData',
    'Partner',
    'Premium',
    '1M',
  ],
  [
    'acedata/claude-sonnet-4-6',
    'Claude Sonnet 4.6 (AceData)',
    'acedata',
    'AceData',
    'Balanced',
    'High',
    '1M',
  ],
  [
    'acedata/claude-haiku-4-5-20251001',
    'Claude Haiku 4.5 (AceData)',
    'acedata',
    'AceData',
    'Fast',
    'Low',
    '200K',
  ],
  [
    'acedata/gpt-5.5',
    'GPT-5.5 (AceData)',
    'acedata',
    'AceData',
    'Partner',
    'High',
    '1.05M',
  ],
  [
    'acedata/gpt-5.4-pro',
    'GPT-5.4 Pro (AceData)',
    'acedata',
    'AceData',
    'Premium',
    'High',
    '1.05M',
  ],
  [
    'acedata/gpt-5.4',
    'GPT-5.4 (AceData)',
    'acedata',
    'AceData',
    'Balanced',
    'High',
    '1.05M',
  ],
  [
    'acedata/gpt-5.2',
    'GPT-5.2 (AceData)',
    'acedata',
    'AceData',
    'Balanced',
    'High',
    '1.05M',
  ],
  [
    'acedata/gpt-5.1',
    'GPT-5.1 (AceData)',
    'acedata',
    'AceData',
    'Balanced',
    'Medium',
    '400K',
  ],
  [
    'acedata/gpt-5-mini',
    'GPT-5 Mini (AceData)',
    'acedata',
    'AceData',
    'Fast',
    'Low',
    '400K',
  ],
  [
    'acedata/gemini-3.1-pro',
    'Gemini 3.1 Pro (AceData)',
    'acedata',
    'AceData',
    'Premium',
    'High',
    '1M',
  ],
  [
    'acedata/gemini-2.5-pro',
    'Gemini 2.5 Pro (AceData)',
    'acedata',
    'AceData',
    'Balanced',
    'Medium',
    '1M',
  ],
  [
    'acedata/gemini-2.5-flash',
    'Gemini 2.5 Flash (AceData)',
    'acedata',
    'AceData',
    'Fast',
    'Low',
    '1M',
  ],
  [
    'acedata/deepseek-v3.2-exp',
    'DeepSeek V3.2 Exp (AceData)',
    'acedata',
    'AceData',
    'Fast',
    'Low',
    '128K',
  ],
  [
    'acedata/deepseek-r1',
    'DeepSeek R1 (AceData)',
    'acedata',
    'AceData',
    'Reasoning',
    'Medium',
    '128K',
  ],
  [
    'anthropic/claude-sonnet-4.5',
    'Claude Sonnet 4.5',
    'anthropic',
    'Anthropic',
    'Premium',
    'High',
    '1M',
  ],
  [
    'anthropic/claude-sonnet-4.6',
    'Claude Sonnet 4.6',
    'anthropic',
    'Anthropic',
    'Premium',
    'High',
    '1M',
  ],
  [
    'anthropic/claude-opus-4.7',
    'Claude Opus 4.7',
    'anthropic',
    'Anthropic',
    'Premium',
    'Premium',
    '1M',
  ],
  [
    'google/gemini-3.1-flash-lite',
    'Gemini 3.1 Flash Lite',
    'google',
    'Google',
    'Fast',
    'Low',
    '1M',
  ],
  [
    'google/gemini-2.5-flash',
    'Gemini 2.5 Flash',
    'google',
    'Google',
    'Balanced',
    'Medium',
    '1M',
  ],
  [
    'google/gemini-3-flash-preview',
    'Gemini 3 Flash Preview',
    'google',
    'Google',
    'Balanced',
    'Medium',
    '1M',
  ],
  [
    'google/gemini-3.1-pro-preview',
    'Gemini 3.1 Pro Preview',
    'google',
    'Google',
    'Premium',
    'High',
    '1M',
  ],
  [
    'qwen/qwen3.5-flash-02-23',
    'Qwen3.5 Flash',
    'qwen',
    'Qwen',
    'Fast',
    'Low',
    '1M',
  ],
  [
    'qwen/qwen3-coder-flash',
    'Qwen3 Coder Flash',
    'qwen',
    'Qwen',
    'Coding',
    'Low',
    '1M',
  ],
  [
    'qwen/qwen3.6-flash',
    'Qwen3.6 Flash',
    'qwen',
    'Qwen',
    'Fast',
    'Medium',
    '1M',
  ],
  [
    'qwen/qwen3.6-35b-a3b',
    'Qwen3.6 35B A3B',
    'qwen',
    'Qwen',
    'Balanced',
    'Medium',
    '256K',
  ],
  [
    'qwen/qwen3.5-35b-a3b',
    'Qwen3.5 35B A3B',
    'qwen',
    'Qwen',
    'Balanced',
    'Medium',
    '256K',
  ],
  [
    'qwen/qwen3-coder',
    'Qwen3 Coder',
    'qwen',
    'Qwen',
    'Coding',
    'Medium',
    '256K',
  ],
  [
    'qwen/qwen3-coder-next',
    'Qwen3 Coder Next',
    'qwen',
    'Qwen',
    'Coding',
    'Medium',
    '1M',
  ],
  [
    'qwen/qwen3-coder-plus',
    'Qwen3 Coder Plus',
    'qwen',
    'Qwen',
    'Coding',
    'High',
    '1M',
  ],
  [
    'qwen/qwen3.6-plus',
    'Qwen3.6 Plus',
    'qwen',
    'Qwen',
    'Premium',
    'High',
    '1M',
  ],
  ['qwen/qwen3-max', 'Qwen3 Max', 'qwen', 'Qwen', 'Premium', 'High', '1M'],
  [
    'qwen/qwen3-max-thinking',
    'Qwen3 Max Thinking',
    'qwen',
    'Qwen',
    'Reasoning',
    'Premium',
    '1M',
  ],
  ['x-ai/grok-4.1-fast', 'Grok 4.1 Fast', 'x-ai', 'xAI', 'Fast', 'Low', '2M'],
  [
    'x-ai/grok-code-fast-1',
    'Grok Code Fast 1',
    'x-ai',
    'xAI',
    'Coding',
    'Medium',
    '256K',
  ],
  ['x-ai/grok-4.3', 'Grok 4.3', 'x-ai', 'xAI', 'Premium', 'High', '1M'],
  [
    'mistralai/mistral-small-2603',
    'Mistral Small 4',
    'mistralai',
    'Mistral',
    'Fast',
    'Low',
    '256K',
  ],
  [
    'mistralai/codestral-2508',
    'Codestral 2508',
    'mistralai',
    'Mistral',
    'Coding',
    'Medium',
    '256K',
  ],
  [
    'mistralai/mistral-large-2512',
    'Mistral Large 3',
    'mistralai',
    'Mistral',
    'Premium',
    'Medium',
    '256K',
  ],
  [
    'moonshotai/kimi-k2-thinking',
    'Kimi K2 Thinking',
    'moonshotai',
    'Moonshot AI',
    'Reasoning',
    'Medium',
    '256K',
  ],
  [
    'moonshotai/kimi-k2.6',
    'Kimi K2.6',
    'moonshotai',
    'Moonshot AI',
    'Balanced',
    'High',
    '256K',
  ],
  [
    'z-ai/glm-4.7-flash',
    'GLM 4.7 Flash',
    'z-ai',
    'Z.ai',
    'Fast',
    'Low',
    '200K',
  ],
  ['z-ai/glm-5.1', 'GLM 5.1', 'z-ai', 'Z.ai', 'Balanced', 'High', '200K'],
  [
    'nvidia/nemotron-3-nano-30b-a3b',
    'Nemotron 3 Nano',
    'nvidia',
    'NVIDIA',
    'Fast',
    'Low',
    '256K',
  ],
  [
    'openrouter/auto',
    'OpenRouter Auto',
    'openrouter',
    'OpenRouter',
    'Advanced',
    'Variable',
    '2M',
  ],
].map(
  ([id, name, providerKey, provider, category, cost, context, fixedPrice]) => ({
    id,
    name,
    providerKey,
    provider,
    category,
    cost: cost as ModelCost,
    context,
    fixedPrice,
  }),
);

const DEFAULT_HOSTED_MODEL = 'deepseek/deepseek-v4-flash';
const HOSTED_PROXY_PROVIDER_PREFIX = getLegacyHostedProxyProviderPrefix();
const HOSTED_MODEL_ALIASES = new Map<string, string>([
  ['meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3.6-35b-a3b'],
  ['qwen/qwen3-32b', 'qwen/qwen3.6-35b-a3b'],
  ['qwen/qwen3-235b-a22b-2507', 'qwen/qwen3.6-35b-a3b'],
  ['minmax m3', 'minimax/minimax-m3'],
  ['minimax m3', 'minimax/minimax-m3'],
  ['minimax-m3', 'minimax/minimax-m3'],
  ['minmax m2.7', 'minimax/minimax-m2.7'],
  ['minimax m2.7', 'minimax/minimax-m2.7'],
  ['minimax-m2.7', 'minimax/minimax-m2.7'],
]);

const NAME_REGEX = /^[a-zA-Z0-9 \-:'.()&]+$/;
const MAX_PARSE_INPUT = 16000;
const MAX_SYSTEM_PROMPT = 8000;
const MAX_HISTORY_TURNS = 10;
const OPENCLAW_PLUGIN_IDS = new Set([
  '@openclaw/openviking',
  '@sonicbotman/lobster-press',
  '@memwyre/openclaw-plugin',
  'openclaw-engram',
  '@echomem/echo-memory-cloud-openclaw-plugin',
  '@waiaas/openclaw-plugin',
  '@agentrux/agentrux-openclaw-plugin',
  '@artflo-ai/artflo-openclaw-plugin',
]);
const HERMES_PLUGIN_IDS = new Set(['42-evey/hermes-plugins']);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function uniq(values: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function filterPluginsForFramework(
  values: string[],
  framework: Framework,
): string[] {
  return values.filter((plugin) => {
    if (framework === 'hermes') return !OPENCLAW_PLUGIN_IDS.has(plugin);
    return !HERMES_PLUGIN_IDS.has(plugin);
  });
}

function syncInstallPlan(
  selectedSkills: string[],
  selectedPlugins: string[],
  installPlan: InstallPlanItem[],
): InstallPlanItem[] {
  const selectedSkillSet = new Set(selectedSkills);
  const selectedPluginSet = new Set(selectedPlugins);
  const seen = new Set<string>();
  const out: InstallPlanItem[] = [];

  for (const item of installPlan) {
    const key = `${item.type}:${item.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    if (item.type === 'skill' && !selectedSkillSet.has(item.name)) continue;
    if (item.type === 'plugin' && !selectedPluginSet.has(item.name)) continue;
    seen.add(key);
    out.push(item);
  }

  for (const skill of selectedSkills) {
    const key = `skill:${skill.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: 'skill', name: skill, reason: 'Install on first start.' });
  }
  for (const plugin of selectedPlugins) {
    const key = `plugin:${plugin.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      type: 'plugin',
      name: plugin,
      reason: 'Install on first start.',
    });
  }

  return out.slice(0, 12);
}

function normalizeHostedModelForUi(model: string | undefined): string {
  let trimmed = model?.trim();
  if (!trimmed) return DEFAULT_HOSTED_MODEL;
  if (trimmed.startsWith(HOSTED_PROXY_PROVIDER_PREFIX)) {
    trimmed = trimmed.slice(HOSTED_PROXY_PROVIDER_PREFIX.length);
  }
  return HOSTED_MODEL_ALIASES.get(trimmed) ?? HOSTED_MODEL_ALIASES.get(trimmed.toLowerCase()) ?? trimmed;
}

function providerKeyFromModel(modelId: string): string {
  const [providerKey] = modelId.split('/');
  return providerKey?.trim() || 'openrouter';
}

function providerNameFromKey(providerKey: string): string {
  return (
    MODEL_PROVIDERS.find((provider) => provider.key === providerKey)?.name ??
    providerKey
      .split('-')
      .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
      .join(' ')
  );
}

function createSavedHostedModelOption(modelId: string): HostedModel {
  const providerKey = providerKeyFromModel(modelId);
  const provider = providerNameFromKey(providerKey);
  return {
    id: modelId,
    name: modelId,
    providerKey,
    provider,
    category: 'Saved',
    cost: 'Variable',
    context: 'Provider-defined',
  };
}

function sanitizeAvatarTraits(
  value: AvatarTraits | undefined,
  fallbackSeed: string,
): AvatarTraits {
  const trim = (raw: string | undefined, max = 48) =>
    raw?.trim().replace(/\s+/g, ' ').slice(0, max) || undefined;
  const hex = (raw: string | undefined) => {
    const value = raw?.trim();
    return value && /^#[0-9a-f]{6}$/i.test(value)
      ? value.toUpperCase()
      : undefined;
  };
  return {
    seed: trim(value?.seed, 80) ?? fallbackSeed,
    palette: trim(value?.palette) ?? 'adaptive accent',
    accentColor: hex(value?.accentColor),
    secondaryColor: hex(value?.secondaryColor),
    emblem: trim(value?.emblem) ?? 'agent mark',
    accessory: trim(value?.accessory) ?? 'identity halo',
    mood: trim(value?.mood) ?? 'focused',
  };
}

function normalizeConfig(config: ParsedConfig): ParsedConfig {
  const selectedSkills = uniq(
    config.selectedSkills?.length
      ? config.selectedSkills
      : (config.suggestedSkills ?? []),
    10,
  );
  const selectedPlugins = filterPluginsForFramework(
    uniq(
      config.selectedPlugins?.length
        ? config.selectedPlugins
        : (config.suggestedPlugins ?? []),
      10,
    ),
    config.framework,
  );
  const installPlan = syncInstallPlan(
    selectedSkills,
    selectedPlugins,
    config.installPlan ?? [],
  );
  return {
    ...config,
    model: normalizeHostedModelForUi(config.model),
    frameworkReason: config.frameworkReason ?? '',
    suggestedSkills: uniq(
      config.suggestedSkills?.length ? config.suggestedSkills : selectedSkills,
      10,
    ),
    suggestedPlugins: selectedPlugins,
    selectedSkills,
    selectedPlugins,
    installPlan,
    avatarVariant: sanitizeAvatarVariant(config.avatarVariant),
    avatarTraits: sanitizeAvatarTraits(
      config.avatarTraits,
      `${config.framework}:${config.name}:${config.avatarHint || config.description}`,
    ),
  };
}

export function ChatToHatch() {
  const router = useRouter();
  const t = useTranslations('chatToHatch');
  const { isAuthenticated, isLoading } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [hatching, setHatching] = useState(false);
  /** What the LLM most recently returned. Acts as the "reset to suggested"
   *  baseline — we never mutate this; user edits live on `draft`. */
  const [original, setOriginal] = useState<ParsedConfig | null>(null);
  /** The user's working copy, edited inline; becomes the POST body on Hatch. */
  const [draft, setDraft] = useState<ParsedConfig | null>(null);
  /** User-controlled open/closed state for the collapsible blocks. We
   *  *initialize* it from "did the LLM populate this field" but after
   *  that the user is the source of truth — otherwise typing into the
   *  textarea would force the section permanently open. */
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showPersonality, setShowPersonality] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [pluginInput, setPluginInput] = useState('');
  /** Monotonic request counter — every send bumps it; only the latest
   *  in-flight response wins setOriginal/setDraft. Prevents stale parse
   *  responses from clobbering newer ones. */
  const reqIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Auth gate — push to /login with a return URL so the user lands
  // back here after sign-in.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?return=/chat-to-hatch');
    }
  }, [isLoading, isAuthenticated, router]);

  // Auto-scroll the chat log on every new message.
  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, thinking]);

  async function handleSend() {
    const description = input.trim();
    if (description.length < 8 || thinking) return;

    const myReqId = ++reqIdRef.current;
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      who: 'user',
      text: description,
    };
    const history = messages
      .filter(
        (m): m is Msg & { who: 'user' | 'assistant' } =>
          (m.who === 'user' || m.who === 'assistant') && !m.isError,
      )
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.who, content: m.text }));
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const res = await req<ParseResponse>('/agents/parse-intent', {
        method: 'POST',
        body: JSON.stringify({
          description,
          ...(draft ? { currentConfig: draft } : {}),
          ...(history.length ? { history } : {}),
        }),
      });
      // Drop the response if a newer request fired in the meantime —
      // protects against out-of-order arrivals on rapid sends.
      if (myReqId !== reqIdRef.current) return;
      if (!res.success) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            who: 'assistant',
            text: res.error || t('errAssistant'),
            isError: true,
          },
        ]);
      } else {
        const normalized = normalizeConfig(res.data.config);
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), who: 'assistant', text: res.data.reply },
        ]);
        setOriginal(normalized);
        setDraft(normalized);
        // Keep long generated files collapsed by default so the preview
        // does not push the chat controls out of the first viewport.
        setShowPersonality(false);
        setShowSystemPrompt(false);
      }
    } catch {
      if (myReqId !== reqIdRef.current) return;
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          who: 'assistant',
          text: t('errNetwork'),
          isError: true,
        },
      ]);
    } finally {
      if (myReqId === reqIdRef.current) setThinking(false);
    }
  }

  /** Validate the draft has everything POST /agents needs. Returns the
   *  first blocking issue or null if it's ready to ship. */
  const draftError = useMemo<string | null>(() => {
    if (!draft) return null;
    if (draft.name.trim().length < 3) return t('errName_min');
    if (draft.name.trim().length > 50) return t('errName_max');
    if (!NAME_REGEX.test(draft.name.trim())) return t('errName_regex');
    if (draft.description.length > 140) return t('errDesc_max');
    return null;
  }, [draft, t]);

  async function handleHatch() {
    if (!draft || hatching || draftError) return;
    setHatching(true);
    try {
      // Build the config payload the API expects. The backend normalizes
      // suggestedSkills/Plugins into installable pending skills and writes
      // persona files during first container init.
      const configBody: Record<string, unknown> = {};
      if (draft.personality.trim())
        configBody.personality = draft.personality.trim();
      if (draft.systemPrompt.trim())
        configBody.systemPrompt = draft.systemPrompt.trim();
      if (draft.selectedSkills.length) {
        configBody.selectedSkills = draft.selectedSkills;
        configBody.suggestedSkills = draft.selectedSkills;
      }
      if (draft.selectedPlugins.length) {
        configBody.selectedPlugins = draft.selectedPlugins;
        configBody.suggestedPlugins = draft.selectedPlugins;
      }
      if (draft.frameworkReason.trim())
        configBody.frameworkReason = draft.frameworkReason.trim();
      if (draft.installPlan.length) configBody.installPlan = draft.installPlan;
      if (draft.model) configBody.model = draft.model;
      if (draft.greeting.trim()) configBody.greeting = draft.greeting.trim();
      if (draft.avatarHint.trim())
        configBody.avatarHint = draft.avatarHint.trim();
      if (draft.avatarVariant.trim()) {
        configBody.avatarVariant = draft.avatarVariant.trim();
        configBody.roomAvatarVariant = draft.avatarVariant.trim();
      }
      if (Object.values(draft.avatarTraits).some(Boolean)) {
        configBody.avatarTraits = draft.avatarTraits;
        configBody.roomAvatarTraits = draft.avatarTraits;
      }

      const created = await req<{ id: string; slug?: string | null }>(
        '/agents',
        {
          method: 'POST',
          body: JSON.stringify({
            name: draft.name.trim(),
            description: draft.description.trim() || undefined,
            framework: draft.framework,
            template: 'custom',
            config: Object.keys(configBody).length ? configBody : undefined,
          }),
        },
      );
      if (created.success) {
        const started = await api.startAgent(created.data.id);
        if (!started.success) {
          setMessages((m) => [
            ...m,
            {
              id: crypto.randomUUID(),
              who: 'assistant',
              text:
                started.error ||
                'Agent created, but automatic start failed. Open the agent and start it manually.',
              isError: true,
            },
          ]);
          setHatching(false);
          return;
        }
        router.push(`/dashboard/agent/${created.data.id}?from=hatch`);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          who: 'assistant',
          text: created.error || t('errCreate'),
          isError: true,
        },
      ]);
      setHatching(false);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          who: 'assistant',
          text: t('errCreateNetwork'),
          isError: true,
        },
      ]);
      setHatching(false);
    }
  }

  function patchDraft(patch: Partial<ParsedConfig>) {
    setDraft((d) => (d ? normalizeConfig({ ...d, ...patch }) : d));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || !draft) return;
    if (draft.selectedSkills.includes(s)) return;
    if (draft.selectedSkills.length >= 10) return;
    const next = [...draft.selectedSkills, s];
    patchDraft({ selectedSkills: next, suggestedSkills: next });
    setSkillInput('');
  }

  function removeSkill(s: string) {
    if (!draft) return;
    const next = draft.selectedSkills.filter((x) => x !== s);
    patchDraft({ selectedSkills: next, suggestedSkills: next });
  }

  function addPlugin() {
    const s = pluginInput.trim();
    if (!s || !draft) return;
    if (draft.selectedPlugins.includes(s)) return;
    if (draft.selectedPlugins.length >= 10) return;
    const next = [...draft.selectedPlugins, s];
    patchDraft({ selectedPlugins: next, suggestedPlugins: next });
    setPluginInput('');
  }

  function removePlugin(s: string) {
    if (!draft) return;
    const next = draft.selectedPlugins.filter((x) => x !== s);
    patchDraft({ selectedPlugins: next, suggestedPlugins: next });
  }

  function applySuggested() {
    if (!original) return;
    setDraft(original);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline (chat conventions).
    // Ignore while a parse is in flight so rapid Enter presses don't
    // queue duplicate (or out-of-order) requests.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (thinking || hatching) return;
      handleSend();
    }
  }

  // Auth-loading splash so the page doesn't flash empty before the
  // redirect kicks in.
  if (isLoading || !isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <p className={styles.thinking}>{t('authChecking')}</p>
        </div>
      </div>
    );
  }

  const fwVisual = draft ? FW_VISUAL[draft.framework] : null;
  const slug = draft ? slugify(draft.name) : '';
  const selectedModelId = draft
    ? normalizeHostedModelForUi(draft.model)
    : DEFAULT_HOSTED_MODEL;
  const selectedModel =
    HOSTED_MODELS.find((model) => model.id === selectedModelId) ??
    createSavedHostedModelOption(selectedModelId);
  const selectedProvider = MODEL_PROVIDERS.find(
    (provider) => provider.key === selectedModel.providerKey,
  ) ?? { key: selectedModel.providerKey, name: selectedModel.provider };
  const modelProviders = MODEL_PROVIDERS.some(
    (provider) => provider.key === selectedProvider.key,
  )
    ? MODEL_PROVIDERS
    : [...MODEL_PROVIDERS, selectedProvider];
  const modelsForProvider = HOSTED_MODELS.filter(
    (model) => model.providerKey === selectedProvider.key,
  );
  const hostedModelsForProvider = modelsForProvider.some(
    (model) => model.id === selectedModel.id,
  )
    ? modelsForProvider
    : [selectedModel, ...modelsForProvider];

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.brand}>
            <BrandGlyph /> HATCHER
          </Link>
          <Link href="/dashboard" className={styles.backLink}>
            {t('backLink')}
          </Link>
        </div>

        <div className={styles.head}>
          <span className={styles.eyebrow}>
            <span className={styles.dot} />
            {t('eyebrow')}
          </span>
          <h1 className={styles.h1}>
            {t('h1Prefix')} <span className={styles.ac}>{t('h1Accent')}</span>
          </h1>
        </div>

        <div className={styles.grid}>
          {/* ─── Chat ─── */}
          <div className={`${styles.col} ${styles.chatCol}`}>
            <div className={styles.chatHead}>
              <div>
                <h2 className={styles.chatTitle}>{t('assistantTitle')}</h2>
                <p className={styles.chatSub}>{t('assistantSub')}</p>
              </div>
              <span className={styles.liveTag}>
                <span className={styles.pulse} />
                {t('live')}
              </span>
            </div>

            <div className={styles.log} ref={logRef} aria-live="polite">
              {messages.length === 0 && (
                <div className={styles.msgAssistant}>
                  <span className={styles.msgWho}>{t('assistantWho')}</span>
                  <div className={styles.msgBody}>{t('intro')}</div>
                </div>
              )}
              {messages.map((m) =>
                m.who === 'user' ? (
                  <div key={m.id} className={`${styles.msg} ${styles.msgUser}`}>
                    {m.text}
                  </div>
                ) : (
                  <div key={m.id} className={styles.msgAssistant}>
                    <span className={styles.msgWho}>{t('assistantWho')}</span>
                    <div
                      className={`${styles.msgBody} ${m.isError ? styles.msgError : ''}`}
                    >
                      {m.text}
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className={styles.msgAssistant}>
                  <span className={styles.msgWho}>{t('assistantWho')}</span>
                  <div className={styles.msgBody}>
                    <span className={styles.thinking}>{t('thinking')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.inputWrap}>
              <textarea
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholder')}
                maxLength={MAX_PARSE_INPUT}
                rows={4}
                disabled={thinking || hatching}
              />
              <div className={styles.inputActions}>
                <span className={styles.inputCount}>
                  {input.length}/{MAX_PARSE_INPUT}
                </span>
                <button
                  type="button"
                  className={styles.send}
                  onClick={handleSend}
                  disabled={input.trim().length < 8 || thinking || hatching}
                >
                  {draft ? t('sendRefine') : t('send')}
                </button>
              </div>
            </div>
          </div>

          {/* ─── Preview (editable) ─── */}
          <div className={`${styles.col} ${styles.previewCol}`}>
            <div className={styles.previewHead}>
              <h2 className={styles.previewTitle}>{t('previewTitle')}</h2>
              <span className={styles.previewTag}>
                {draft
                  ? draftError
                    ? t('previewNeedsFix')
                    : t('previewReady')
                  : t('previewEmpty')}
              </span>
            </div>

            {!draft && <div className={styles.empty}>{t('emptyHint')}</div>}

            {draft && fwVisual && (
              <div className={styles.previewBody}>
                <div className={styles.previewHero}>
                  <div className={styles.avatarStage}>
                    <AgentRoomAvatarPreview
                      agentId={slug || draft.name || 'draft-agent'}
                      framework={draft.framework}
                      status="running"
                      avatarVariant={draft.avatarVariant}
                      avatarTraits={draft.avatarTraits}
                      activeEmote={thinking ? 'think' : 'wave'}
                      emoteNonce={messages.length + (thinking ? 1 : 0)}
                      isStreaming={thinking}
                    />
                    <span className={styles.avatarBadge}>
                      {draft.avatarVariant
                        ? avatarOptionName(draft.avatarVariant)
                        : 'auto avatar'}
                    </span>
                  </div>

                  <div className={styles.previewHeroMeta}>
                    <div className={styles.previewTopRow}>
                      <span
                        className={styles.fwBadge}
                        style={
                          { '--fw': fwVisual.color } as React.CSSProperties
                        }
                      >
                        <span className={styles.fwGlyph} aria-hidden>
                          {fwVisual.mark}
                        </span>
                        {fwVisual.label}
                      </span>
                      {original && (
                        <button
                          type="button"
                          className={styles.resetBtn}
                          onClick={applySuggested}
                          aria-label={t('resetTooltip')}
                          title={t('resetTooltip')}
                        >
                          {t('reset')}
                        </button>
                      )}
                    </div>

                    <div
                      className={styles.frameworkChooser}
                      aria-label={t('labelFramework')}
                    >
                      {(['openclaw', 'hermes'] as const).map((framework) => {
                        const visual = FW_VISUAL[framework];
                        const active = draft.framework === framework;
                        return (
                          <button
                            key={framework}
                            type="button"
                            className={`${styles.frameworkOption} ${active ? styles.frameworkOptionActive : ''}`}
                            style={
                              { '--fw': visual.color } as React.CSSProperties
                            }
                            onClick={() => patchDraft({ framework })}
                          >
                            <span className={styles.frameworkOptionMark}>
                              {visual.mark}
                            </span>
                            <span>
                              <span className={styles.frameworkOptionName}>
                                {visual.label}
                              </span>
                              <span className={styles.frameworkOptionDesc}>
                                {framework === 'openclaw'
                                  ? t('frameworkOpenClaw')
                                  : t('frameworkHermes')}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className={styles.modelChooser}>
                      <label className={styles.selectLabel}>
                        <span>{t('labelModelProvider')}</span>
                        <span className={styles.selectHelp}>
                          Hatcher-managed hosted route. BYOK can be adjusted later in agent config.
                        </span>
                        <select
                          className={styles.selectInput}
                          value={selectedProvider.key}
                          onChange={(e) => {
                            const firstModel = HOSTED_MODELS.find(
                              (model) => model.providerKey === e.target.value,
                            );
                            if (firstModel)
                              patchDraft({ model: firstModel.id });
                          }}
                        >
                          {modelProviders.map((provider) => (
                            <option key={provider.key} value={provider.key}>
                              {provider.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={styles.selectLabel}>
                        <span>{t('labelModel')}</span>
                        <span className={styles.selectHelp}>
                          The runtime engine used for hosted calls and AI Credits metering.
                        </span>
                        <select
                          className={styles.selectInput}
                          value={selectedModel.id}
                          onChange={(e) =>
                            patchDraft({ model: e.target.value })
                          }
                        >
                          {hostedModelsForProvider.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name} · {model.category} ·{' '}
                              {model.fixedPrice ?? model.cost}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className={styles.modelSummary}>
                      <span>Route: {selectedModel.provider}</span>
                      <span>Context: {selectedModel.context}</span>
                      <span>Cost: {selectedModel.fixedPrice ?? selectedModel.cost}</span>
                    </div>

                    <label className={styles.selectLabel}>
                      {t('labelAvatarVariant')}
                      <select
                        className={styles.selectInput}
                        value={draft.avatarVariant}
                        onChange={(e) =>
                          patchDraft({ avatarVariant: e.target.value })
                        }
                      >
                        {AVATAR_OPTIONS.map((avatar) => (
                          <option key={avatar.id || 'auto'} value={avatar.id}>
                            {avatar.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className={styles.traitGrid}>
                      <label className={styles.selectLabel}>
                        {t('labelAvatarPalette')}
                        <input
                          className={styles.traitInput}
                          value={draft.avatarTraits.palette ?? ''}
                          onChange={(e) =>
                            patchDraft({
                              avatarTraits: {
                                ...draft.avatarTraits,
                                palette: e.target.value,
                              },
                            })
                          }
                          maxLength={48}
                        />
                      </label>
                      <label className={styles.selectLabel}>
                        {t('labelAvatarEmblem')}
                        <input
                          className={styles.traitInput}
                          value={draft.avatarTraits.emblem ?? ''}
                          onChange={(e) =>
                            patchDraft({
                              avatarTraits: {
                                ...draft.avatarTraits,
                                emblem: e.target.value,
                              },
                            })
                          }
                          maxLength={48}
                        />
                      </label>
                      <label className={styles.selectLabel}>
                        {t('labelAvatarAccessory')}
                        <input
                          className={styles.traitInput}
                          value={draft.avatarTraits.accessory ?? ''}
                          onChange={(e) =>
                            patchDraft({
                              avatarTraits: {
                                ...draft.avatarTraits,
                                accessory: e.target.value,
                              },
                            })
                          }
                          maxLength={48}
                        />
                      </label>
                      <label className={styles.selectLabel}>
                        {t('labelAvatarMood')}
                        <input
                          className={styles.traitInput}
                          value={draft.avatarTraits.mood ?? ''}
                          onChange={(e) =>
                            patchDraft({
                              avatarTraits: {
                                ...draft.avatarTraits,
                                mood: e.target.value,
                              },
                            })
                          }
                          maxLength={48}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {draft.frameworkReason && (
                  <div className={styles.reasonBox}>
                    <span className={styles.reasonLabel}>
                      {t('labelFrameworkReason')}
                    </span>
                    <p>{draft.frameworkReason}</p>
                  </div>
                )}

                {/* Name */}
                <label className={styles.fieldLabel}>
                  {t('labelName')}
                  <input
                    type="text"
                    className={styles.fieldInput}
                    value={draft.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                    maxLength={50}
                    placeholder={t('placeholderName')}
                  />
                </label>
                {slug && (
                  <p className={styles.slugHint}>
                    {t('slugUrl')}: <code>/agent/{slug}/room</code>
                  </p>
                )}

                {/* Description */}
                <label className={styles.fieldLabel}>
                  {t('labelDescription')}{' '}
                  <span className={styles.fieldHint}>
                    {draft.description.length}/140
                  </span>
                  <textarea
                    className={styles.fieldTextarea}
                    value={draft.description}
                    onChange={(e) =>
                      patchDraft({ description: e.target.value })
                    }
                    maxLength={140}
                    rows={2}
                    placeholder={t('placeholderDescription')}
                  />
                </label>

                {/* Personality (collapsible — user-controlled) */}
                <details
                  className={styles.collapsible}
                  open={showPersonality}
                  onToggle={(e) =>
                    setShowPersonality((e.target as HTMLDetailsElement).open)
                  }
                >
                  <summary className={styles.collapsibleHead}>
                    {t('labelPersonality')}
                    <span className={styles.fieldHint}>
                      {draft.personality.length}/2000
                    </span>
                  </summary>
                  <textarea
                    className={styles.fieldTextarea}
                    value={draft.personality}
                    onChange={(e) =>
                      patchDraft({ personality: e.target.value })
                    }
                    maxLength={2000}
                    rows={3}
                    placeholder={t('placeholderPersonality')}
                  />
                </details>

                {/* SOUL.md / system prompt (collapsible — user-controlled) */}
                <details
                  className={styles.collapsible}
                  open={showSystemPrompt}
                  onToggle={(e) =>
                    setShowSystemPrompt((e.target as HTMLDetailsElement).open)
                  }
                >
                  <summary className={styles.collapsibleHead}>
                    {t('labelSystemPrompt')}
                    <span className={styles.fieldHint}>
                      {draft.systemPrompt.length}/{MAX_SYSTEM_PROMPT}
                    </span>
                  </summary>
                  <textarea
                    className={`${styles.fieldTextarea} ${styles.fieldMono}`}
                    value={draft.systemPrompt}
                    onChange={(e) =>
                      patchDraft({ systemPrompt: e.target.value })
                    }
                    maxLength={MAX_SYSTEM_PROMPT}
                    rows={10}
                    placeholder={t('placeholderSystemPrompt')}
                  />
                </details>

                {/* Skills */}
                <div className={styles.chipsBlock}>
                  <div className={styles.chipsHead}>
                    {t('labelSkills')}
                    <span className={styles.fieldHint}>
                      {draft.selectedSkills.length}/10
                    </span>
                  </div>
                  <div className={styles.skillsList}>
                    {draft.selectedSkills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`${styles.skill} ${styles.skillRemovable}`}
                        onClick={() => removeSkill(s)}
                        aria-label={t('removeChip', { name: s })}
                      >
                        {s}{' '}
                        <span className={styles.chipX} aria-hidden>
                          ×
                        </span>
                      </button>
                    ))}
                    {draft.selectedSkills.length < 10 && (
                      <span className={styles.chipInputWrap}>
                        <input
                          type="text"
                          className={styles.chipInput}
                          placeholder={t('addSkill')}
                          value={skillInput}
                          maxLength={80}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSkill();
                            }
                          }}
                        />
                        {skillInput && (
                          <button
                            type="button"
                            className={styles.chipAddBtn}
                            onClick={addSkill}
                          >
                            +
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.chipsBlock}>
                  <div className={styles.chipsHead}>
                    {t('labelPlugins')}
                    <span className={styles.fieldHint}>
                      {draft.selectedPlugins.length}/10
                    </span>
                  </div>
                  <div className={styles.skillsList}>
                    {draft.selectedPlugins.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`${styles.skill} ${styles.skillRemovable}`}
                        onClick={() => removePlugin(p)}
                        aria-label={t('removeChip', { name: p })}
                      >
                        {p}{' '}
                        <span className={styles.chipX} aria-hidden>
                          ×
                        </span>
                      </button>
                    ))}
                    {draft.selectedPlugins.length < 10 && (
                      <span className={styles.chipInputWrap}>
                        <input
                          type="text"
                          className={styles.chipInput}
                          placeholder={t('addPlugin')}
                          value={pluginInput}
                          maxLength={80}
                          onChange={(e) => setPluginInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addPlugin();
                            }
                          }}
                        />
                        {pluginInput && (
                          <button
                            type="button"
                            className={styles.chipAddBtn}
                            onClick={addPlugin}
                          >
                            +
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {draft.installPlan.length > 0 && (
                  <div className={styles.installPlan}>
                    <div className={styles.installPlanHead}>
                      {t('labelInstallPlan')}
                    </div>
                    <div className={styles.installPlanList}>
                      {draft.installPlan.slice(0, 8).map((item) => (
                        <div
                          key={`${item.type}:${item.name}`}
                          className={styles.installPlanItem}
                        >
                          <span className={styles.installPlanType}>
                            {item.type}
                          </span>
                          <span className={styles.installPlanName}>
                            {item.name}
                          </span>
                          <span className={styles.installPlanReason}>
                            {item.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Greeting (read-only display) */}
                {draft.greeting && (
                  <div className={styles.greetingBox}>
                    <span className={styles.greetingLabel}>
                      {t('labelGreeting')}
                    </span>
                    <p className={styles.greetingText}>“{draft.greeting}”</p>
                  </div>
                )}

                {draft.avatarHint && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>
                        {t('labelAvatar')}
                      </span>
                      <span className={styles.metaValue}>
                        {draft.avatarHint}
                      </span>
                    </span>
                  </div>
                )}

                {draftError && <p className={styles.errorLine}>{draftError}</p>}

                <div className={styles.foot}>
                  <button
                    type="button"
                    className={styles.hatchBtn}
                    onClick={handleHatch}
                    disabled={hatching || !!draftError}
                  >
                    {hatching ? t('hatchBtnLoading') : t('hatchBtn')}
                  </button>
                  <p className={styles.footHint}>{t('footHint')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden>
      <rect width="26" height="26" rx="7" fill="var(--ink)" />
      <path d="M13 4.5c-4 0-7.2 3.9-7.2 8.7 0 5 3.1 8.9 7.2 8.9s7.2-3.9 7.2-8.9c0-4.8-3.2-8.7-7.2-8.7Z" fill="var(--bg-card)" stroke="var(--tech-accent)" strokeWidth="1.1" />
      <path d="M8.6 13.6c1.4-2.3 2.9-3.3 4.4-3.3s3 1 4.4 3.3c-1.4 2.3-2.9 3.3-4.4 3.3s-3-1-4.4-3.3Z" fill="var(--ink)" />
      <circle cx="13" cy="13.6" r="1.7" fill="var(--tech-accent)" />
    </svg>
  );
}
