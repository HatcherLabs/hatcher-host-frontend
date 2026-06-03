import { getLegacyHostedProxyProviderPrefix } from '@/lib/legacy-hosted-model';

export type HostedModelCost = 'Low' | 'Medium' | 'High' | 'Premium' | 'Variable';
export type HostedModelPrivacy = 'hatcher' | 'partner';
export type HostedModelTag =
  | 'balanced'
  | 'coding'
  | 'fast'
  | 'fixed price'
  | 'low cost'
  | 'long context'
  | 'privacy'
  | 'reasoning';

export type HostedModelProvider = {
  key: string;
  name: string;
  description: string;
};

export type HostedModelOption = {
  id: string;
  name: string;
  providerKey: string;
  provider: string;
  category: string;
  cost: HostedModelCost;
  context: string;
  description: string;
  fixedPrice?: string;
  warning?: string;
};

export type ActiveModelDisplay = {
  id: string;
  name: string;
  provider: string;
  route: string;
  privacy: string;
  context?: string;
  cost?: string;
  tags: HostedModelTag[];
};

export type HostedModelFilter = {
  provider?: string;
  tag?: HostedModelTag | 'all';
  privacy?: HostedModelPrivacy | 'all';
  maxCostRank?: number;
  search?: string;
};

export const HOSTED_MODEL_PROVIDERS: HostedModelProvider[] = [
  { key: 'deepseek', name: 'DeepSeek', description: 'Fast, cost-efficient long-context models.' },
  { key: 'openai', name: 'OpenAI', description: 'General, coding, and frontier models.' },
  { key: 'anthropic', name: 'Anthropic', description: 'Claude models for reasoning and writing.' },
  { key: 'idle', name: 'IDLE', description: 'Partner-hosted Claude models with fixed request pricing.' },
  { key: 'xiaomi', name: 'Xiaomi MiMo', description: 'Partner-hosted MiMo models with long context and launch-promo usage.' },
  { key: 'acedata', name: 'AceData', description: 'Partner-hosted frontier models plus data and media intelligence APIs.' },
  { key: 'google', name: 'Google', description: 'Gemini models with large context windows.' },
  { key: 'qwen', name: 'Qwen', description: 'Efficient coding and agentic tool-use models.' },
  { key: 'x-ai', name: 'xAI', description: 'Grok models for fast reasoning and code.' },
  { key: 'mistralai', name: 'Mistral', description: 'European general and coding models.' },
  { key: 'moonshotai', name: 'Moonshot AI', description: 'Kimi models for analysis-heavy workflows.' },
  { key: 'z-ai', name: 'Z.ai', description: 'GLM models with strong price-performance.' },
  { key: 'nvidia', name: 'NVIDIA', description: 'Nemotron models for low-cost tool loops.' },
  { key: 'openrouter', name: 'OpenRouter', description: 'Router-managed fallback selection through Hatcher.' },
];

export const HOSTED_MODELS: HostedModelOption[] = [
  {
    id: 'deepseek/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    providerKey: 'deepseek',
    provider: 'DeepSeek',
    category: 'Default',
    cost: 'Low',
    context: '1M',
    description: 'Default hosted model. Fast, low-cost, and routed through the best available Hatcher provider.',
  },
  {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    providerKey: 'deepseek',
    provider: 'DeepSeek',
    category: 'Balanced',
    cost: 'Medium',
    context: '1M',
    description: 'Higher quality DeepSeek option for broader analysis and longer tasks.',
  },
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    providerKey: 'deepseek',
    provider: 'DeepSeek',
    category: 'Fast',
    cost: 'Low',
    context: '128K',
    description: 'Efficient fallback for quick general-purpose agent replies.',
  },
  {
    id: 'openai/gpt-5-nano',
    name: 'GPT-5 Nano',
    providerKey: 'openai',
    provider: 'OpenAI',
    category: 'Fast',
    cost: 'Low',
    context: '400K',
    description: 'Very low-cost OpenAI option for lightweight chat and extraction.',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    providerKey: 'openai',
    provider: 'OpenAI',
    category: 'Balanced',
    cost: 'Medium',
    context: '400K',
    description: 'Balanced OpenAI model for most hosted agent work.',
  },
  {
    id: 'openai/gpt-5.1-codex-mini',
    name: 'GPT-5.1 Codex Mini',
    providerKey: 'openai',
    provider: 'OpenAI',
    category: 'Coding',
    cost: 'Medium',
    context: '400K',
    description: 'Lower-cost OpenAI coding model for repo edits and tool use.',
  },
  {
    id: 'openai/gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    providerKey: 'openai',
    provider: 'OpenAI',
    category: 'Coding',
    cost: 'High',
    context: '400K',
    description: 'Premium coding model for complex implementation and debugging work.',
  },
  {
    id: 'openai/gpt-5.4-nano',
    name: 'GPT-5.4 Nano',
    providerKey: 'openai',
    provider: 'OpenAI',
    category: 'Fast',
    cost: 'Low',
    context: '400K',
    description: 'Newer low-cost OpenAI option for short tasks and quick responses.',
  },
  {
    id: 'openai/gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    providerKey: 'openai',
    provider: 'OpenAI',
    category: 'Balanced',
    cost: 'Medium',
    context: '400K',
    description: 'Stronger balanced OpenAI model for daily agent workloads.',
  },
  {
    id: 'openai/gpt-5.4',
    name: 'GPT-5.4',
    providerKey: 'openai',
    provider: 'OpenAI',
    category: 'Premium',
    cost: 'High',
    context: '1.05M',
    description: 'High-quality OpenAI model for complex general tasks.',
  },
  {
    id: 'openai/gpt-5.5',
    name: 'GPT-5.5',
    providerKey: 'openai',
    provider: 'OpenAI',
    category: 'Premium',
    cost: 'Premium',
    context: '1.05M',
    description: 'Frontier OpenAI model for high-value workflows.',
    warning: 'Consumes AI Credits quickly.',
  },
  {
    id: 'openai/gpt-5.5-pro',
    name: 'GPT-5.5 Pro',
    providerKey: 'openai',
    provider: 'OpenAI',
    category: 'Premium',
    cost: 'Premium',
    context: '1.05M',
    description: 'Highest-cost OpenAI option for rare, high-stakes tasks.',
    warning: 'Consumes AI Credits very quickly.',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    providerKey: 'anthropic',
    provider: 'Anthropic',
    category: 'Balanced',
    cost: 'Medium',
    context: '200K',
    description: 'Quick Claude option for structured assistant tasks.',
  },
  {
    id: 'idle/claude-haiku-4-5',
    name: 'Claude Haiku 4.5 (IDLE)',
    providerKey: 'idle',
    provider: 'IDLE',
    category: 'Partner',
    cost: 'Low',
    context: '200K',
    description: 'Partner-hosted Claude Haiku through IDLE. Fixed price per request.',
    fixedPrice: '1 AI Credit per request',
  },
  {
    id: 'idle/claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6 (IDLE)',
    providerKey: 'idle',
    provider: 'IDLE',
    category: 'Partner',
    cost: 'Medium',
    context: '1M',
    description: 'Partner-hosted Claude Sonnet through IDLE. Fixed price per request.',
    fixedPrice: '3 AI Credits per request',
  },
  {
    id: 'xiaomi/mimo-v2.5-pro',
    name: 'MiMo V2.5 Pro',
    providerKey: 'xiaomi',
    provider: 'Xiaomi MiMo',
    category: 'Partner',
    cost: 'Low',
    context: '1M',
    description: 'Partner-hosted Xiaomi MiMo model for long-context reasoning, coding, and agent workflows.',
    fixedPrice: 'Free launch promo',
  },
  {
    id: 'xiaomi/mimo-v2.5',
    name: 'MiMo V2.5',
    providerKey: 'xiaomi',
    provider: 'Xiaomi MiMo',
    category: 'Balanced',
    cost: 'Low',
    context: '1M',
    description: 'Balanced Xiaomi MiMo model for multi-step reasoning, writing, and longer conversations.',
    fixedPrice: 'Free launch promo',
  },
  {
    id: 'xiaomi/mimo-v2-pro',
    name: 'MiMo V2 Pro',
    providerKey: 'xiaomi',
    provider: 'Xiaomi MiMo',
    category: 'Partner',
    cost: 'Low',
    context: '1M',
    description: 'Previous-generation MiMo Pro model for long-context coding and agent tasks.',
    fixedPrice: 'Free launch promo',
  },
  {
    id: 'xiaomi/mimo-v2-omni',
    name: 'MiMo V2 Omni',
    providerKey: 'xiaomi',
    provider: 'Xiaomi MiMo',
    category: 'Multimodal',
    cost: 'Low',
    context: '256K',
    description: 'Multimodal MiMo model for image-aware analysis, OCR, charts, and visual context.',
    fixedPrice: 'Free launch promo',
  },
  {
    id: 'acedata/claude-opus-4-8',
    name: 'Claude Opus 4.8 (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Partner',
    cost: 'Premium',
    context: '1M',
    description: 'Partner-hosted Claude Opus through AceData for deeper reasoning and agent workflows.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/claude-opus-4-7',
    name: 'Claude Opus 4.7 (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Premium',
    cost: 'Premium',
    context: '1M',
    description: 'Partner-hosted Claude Opus option through AceData for high-value reasoning tasks.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6 (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Balanced',
    cost: 'High',
    context: '1M',
    description: 'Partner-hosted Claude Sonnet through AceData for reliable agent planning, writing, and research.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5 (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Fast',
    cost: 'Low',
    context: '200K',
    description: 'Fast Claude option through AceData for extraction, classification, and lightweight chat.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/gpt-5.5',
    name: 'GPT-5.5 (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Partner',
    cost: 'High',
    context: '1.05M',
    description: 'Partner-hosted OpenAI-compatible GPT-5.5 through AceData, with OpenRouter fallback when needed.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/gpt-5.4-pro',
    name: 'GPT-5.4 Pro (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Premium',
    cost: 'High',
    context: '1.05M',
    description: 'AceData-hosted OpenAI-compatible premium model for complex multi-step workflows.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/gpt-5.4',
    name: 'GPT-5.4 (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Balanced',
    cost: 'High',
    context: '1.05M',
    description: 'AceData-hosted OpenAI-compatible GPT model for advanced agent and research tasks.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/gpt-5.2',
    name: 'GPT-5.2 (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Balanced',
    cost: 'High',
    context: '1.05M',
    description: 'AceData-hosted OpenAI-compatible model for long-context analysis and general automation.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/gpt-5.1',
    name: 'GPT-5.1 (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Balanced',
    cost: 'Medium',
    context: '400K',
    description: 'AceData-hosted GPT option for daily agent conversations and structured tool use.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/gpt-5-mini',
    name: 'GPT-5 Mini (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Fast',
    cost: 'Low',
    context: '400K',
    description: 'Lower-cost AceData-hosted GPT model for quick replies, extraction, and routine tasks.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/gemini-3.1-pro',
    name: 'Gemini 3.1 Pro (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Premium',
    cost: 'High',
    context: '1M',
    description: 'AceData-hosted Gemini Pro option for broad research and long-context analysis.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Balanced',
    cost: 'Medium',
    context: '1M',
    description: 'AceData-hosted Gemini Pro model for research, summarization, and multimodal-adjacent workflows.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Fast',
    cost: 'Low',
    context: '1M',
    description: 'Fast AceData-hosted Gemini option for high-throughput agent research and summaries.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/deepseek-v3.2-exp',
    name: 'DeepSeek V3.2 Exp (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Fast',
    cost: 'Low',
    context: '128K',
    description: 'AceData-hosted DeepSeek model for low-cost technical analysis and tool loops.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'acedata/deepseek-r1',
    name: 'DeepSeek R1 (AceData)',
    providerKey: 'acedata',
    provider: 'AceData',
    category: 'Reasoning',
    cost: 'Medium',
    context: '128K',
    description: 'AceData-hosted reasoning model for analysis-heavy prompts.',
    warning: 'Uses estimated AI Credits because AceData exposes costs in their usage console, not in chat responses.',
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    providerKey: 'anthropic',
    provider: 'Anthropic',
    category: 'Premium',
    cost: 'High',
    context: '1M',
    description: 'Strong premium reasoning and coding model.',
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    providerKey: 'anthropic',
    provider: 'Anthropic',
    category: 'Premium',
    cost: 'High',
    context: '1M',
    description: 'Newer Sonnet model for complex reasoning and agent workflows.',
  },
  {
    id: 'anthropic/claude-opus-4.7',
    name: 'Claude Opus 4.7',
    providerKey: 'anthropic',
    provider: 'Anthropic',
    category: 'Premium',
    cost: 'Premium',
    context: '1M',
    description: 'Most expensive Claude option for difficult reasoning.',
    warning: 'Consumes AI Credits quickly.',
  },
  {
    id: 'google/gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    providerKey: 'google',
    provider: 'Google',
    category: 'Fast',
    cost: 'Low',
    context: '1M',
    description: 'Low-latency model for simple assistant and extraction workflows.',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    providerKey: 'google',
    provider: 'Google',
    category: 'Balanced',
    cost: 'Medium',
    context: '1M',
    description: 'Stable Gemini option with tool support and broad context.',
  },
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    providerKey: 'google',
    provider: 'Google',
    category: 'Balanced',
    cost: 'Medium',
    context: '1M',
    description: 'Large-context Google model for broader research and summaries.',
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    providerKey: 'google',
    provider: 'Google',
    category: 'Premium',
    cost: 'High',
    context: '1M',
    description: 'Higher quality Gemini option for complex reasoning.',
  },
  {
    id: 'qwen/qwen3.5-flash-02-23',
    name: 'Qwen3.5 Flash',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Fast',
    cost: 'Low',
    context: '1M',
    description: 'Very efficient Qwen model for high-volume agent loops.',
  },
  {
    id: 'qwen/qwen3-coder-flash',
    name: 'Qwen3 Coder Flash',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Coding',
    cost: 'Low',
    context: '1M',
    description: 'Fast code-oriented model for tool use and routine development tasks.',
  },
  {
    id: 'qwen/qwen3.6-flash',
    name: 'Qwen3.6 Flash',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Fast',
    cost: 'Medium',
    context: '1M',
    description: 'Newer Qwen flash model with strong price-performance.',
  },
  {
    id: 'qwen/qwen3.6-35b-a3b',
    name: 'Qwen3.6 35B A3B',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Balanced',
    cost: 'Medium',
    context: '256K',
    description: 'Current Qwen hosted option that replaces the retired Qwen3 32B ID.',
  },
  {
    id: 'qwen/qwen3.5-35b-a3b',
    name: 'Qwen3.5 35B A3B',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Balanced',
    cost: 'Medium',
    context: '256K',
    description: 'Balanced Qwen model for general chat, research, and tool-use loops.',
  },
  {
    id: 'qwen/qwen3-coder',
    name: 'Qwen3 Coder',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Coding',
    cost: 'Medium',
    context: '256K',
    description: 'Higher quality coding model for edits, repo analysis, and agentic coding.',
  },
  {
    id: 'qwen/qwen3-coder-next',
    name: 'Qwen3 Coder Next',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Coding',
    cost: 'Medium',
    context: '1M',
    description: 'Newer Qwen coding model for repo edits and structured tool calls.',
  },
  {
    id: 'qwen/qwen3-coder-plus',
    name: 'Qwen3 Coder Plus',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Coding',
    cost: 'High',
    context: '1M',
    description: 'Larger Qwen coding option for difficult implementation tasks.',
  },
  {
    id: 'qwen/qwen3.6-plus',
    name: 'Qwen3.6 Plus',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Premium',
    cost: 'High',
    context: '1M',
    description: 'Higher quality Qwen option for more complex reasoning tasks.',
  },
  {
    id: 'qwen/qwen3-max',
    name: 'Qwen3 Max',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Premium',
    cost: 'High',
    context: '1M',
    description: 'Large Qwen model for demanding agent work.',
  },
  {
    id: 'qwen/qwen3-max-thinking',
    name: 'Qwen3 Max Thinking',
    providerKey: 'qwen',
    provider: 'Qwen',
    category: 'Reasoning',
    cost: 'Premium',
    context: '1M',
    description: 'Reasoning-focused Qwen model for selective high-value tasks.',
    warning: 'Consumes AI Credits quickly.',
  },
  {
    id: 'x-ai/grok-4.1-fast',
    name: 'Grok 4.1 Fast',
    providerKey: 'x-ai',
    provider: 'xAI',
    category: 'Fast',
    cost: 'Low',
    context: '2M',
    description: 'Fast Grok model with very large context.',
  },
  {
    id: 'x-ai/grok-code-fast-1',
    name: 'Grok Code Fast 1',
    providerKey: 'x-ai',
    provider: 'xAI',
    category: 'Coding',
    cost: 'Medium',
    context: '256K',
    description: 'xAI coding model tuned for fast code generation.',
  },
  {
    id: 'x-ai/grok-4.3',
    name: 'Grok 4.3',
    providerKey: 'x-ai',
    provider: 'xAI',
    category: 'Premium',
    cost: 'High',
    context: '1M',
    description: 'Higher quality Grok model for reasoning-heavy tasks.',
  },
  {
    id: 'mistralai/mistral-small-2603',
    name: 'Mistral Small 4',
    providerKey: 'mistralai',
    provider: 'Mistral',
    category: 'Fast',
    cost: 'Low',
    context: '256K',
    description: 'Efficient general model from Mistral.',
  },
  {
    id: 'mistralai/codestral-2508',
    name: 'Codestral 2508',
    providerKey: 'mistralai',
    provider: 'Mistral',
    category: 'Coding',
    cost: 'Medium',
    context: '256K',
    description: 'Mistral coding model for code edits and tool use.',
  },
  {
    id: 'mistralai/mistral-large-2512',
    name: 'Mistral Large 3',
    providerKey: 'mistralai',
    provider: 'Mistral',
    category: 'Premium',
    cost: 'Medium',
    context: '256K',
    description: 'Stronger Mistral model for complex general tasks.',
  },
  {
    id: 'moonshotai/kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    providerKey: 'moonshotai',
    provider: 'Moonshot AI',
    category: 'Reasoning',
    cost: 'Medium',
    context: '256K',
    description: 'Reasoning-focused option for analysis-heavy tasks.',
  },
  {
    id: 'moonshotai/kimi-k2.6',
    name: 'Kimi K2.6',
    providerKey: 'moonshotai',
    provider: 'Moonshot AI',
    category: 'Balanced',
    cost: 'High',
    context: '256K',
    description: 'Newer Kimi model for long-form analysis and synthesis.',
  },
  {
    id: 'z-ai/glm-4.7-flash',
    name: 'GLM 4.7 Flash',
    providerKey: 'z-ai',
    provider: 'Z.ai',
    category: 'Fast',
    cost: 'Low',
    context: '200K',
    description: 'Low-cost GLM model for quick agent loops.',
  },
  {
    id: 'z-ai/glm-5.1',
    name: 'GLM 5.1',
    providerKey: 'z-ai',
    provider: 'Z.ai',
    category: 'Balanced',
    cost: 'High',
    context: '200K',
    description: 'Higher quality GLM model for reasoning and planning.',
  },
  {
    id: 'nvidia/nemotron-3-nano-30b-a3b',
    name: 'Nemotron 3 Nano',
    providerKey: 'nvidia',
    provider: 'NVIDIA',
    category: 'Fast',
    cost: 'Low',
    context: '256K',
    description: 'Low-cost NVIDIA model for lightweight workflows.',
  },
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto',
    providerKey: 'openrouter',
    provider: 'OpenRouter',
    category: 'Advanced',
    cost: 'Variable',
    context: '2M',
    description: 'Lets the fallback router select an available model. Useful as a fallback, not a default.',
  },
];

export const DEFAULT_HOSTED_MODEL = 'deepseek/deepseek-v4-flash';
const HOSTED_PROXY_PROVIDER_PREFIX = getLegacyHostedProxyProviderPrefix();
const HOSTED_MODEL_ALIASES = new Map<string, string>([
  ['meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3.6-35b-a3b'],
  ['qwen/qwen3-32b', 'qwen/qwen3.6-35b-a3b'],
  ['qwen/qwen3-235b-a22b-2507', 'qwen/qwen3.6-35b-a3b'],
]);

const BYOK_PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  groq: 'Groq',
  xai: 'xAI',
  openrouter: 'OpenRouter',
  venice: 'Venice AI',
};

export function normalizeHostedModelForUi(model: string | undefined): string {
  let trimmed = model?.trim();
  if (!trimmed) return DEFAULT_HOSTED_MODEL;
  if (trimmed.startsWith(HOSTED_PROXY_PROVIDER_PREFIX)) {
    trimmed = trimmed.slice(HOSTED_PROXY_PROVIDER_PREFIX.length);
  }
  return HOSTED_MODEL_ALIASES.get(trimmed) ?? trimmed;
}

export function providerKeyFromHostedModelId(modelId: string): string {
  const [providerKey] = modelId.split('/');
  return providerKey?.trim() || 'openrouter';
}

export function providerNameFromKey(providerKey: string): string {
  return HOSTED_MODEL_PROVIDERS.find((provider) => provider.key === providerKey)?.name
    ?? BYOK_PROVIDER_LABELS[providerKey]
    ?? providerKey
      .split('-')
      .map((part) => part ? part[0]!.toUpperCase() + part.slice(1) : part)
      .join(' ');
}

export function createSavedHostedModelOption(modelId: string): HostedModelOption {
  const providerKey = providerKeyFromHostedModelId(modelId);
  const provider = providerNameFromKey(providerKey);
  return {
    id: modelId,
    name: modelId,
    providerKey,
    provider,
    category: 'Saved',
    cost: 'Variable',
    context: 'Provider-defined',
    description: 'Saved hosted model from this agent configuration.',
  };
}

export function getHostedModelOption(model: string | undefined): HostedModelOption {
  const normalized = normalizeHostedModelForUi(model);
  return HOSTED_MODELS.find((m) => m.id === normalized)
    ?? createSavedHostedModelOption(normalized);
}

export function hostedModelRoute(model: HostedModelOption): string {
  if (model.providerKey === 'idle') return 'IDLE partner';
  if (model.providerKey === 'xiaomi') return 'Xiaomi MiMo direct';
  if (model.providerKey === 'acedata') return 'AceData primary / OpenRouter fallback';
  return 'UsePod primary / OpenRouter fallback';
}

export function hostedModelPrivacy(model: HostedModelOption): HostedModelPrivacy {
  return model.providerKey === 'idle' || model.providerKey === 'xiaomi' || model.providerKey === 'acedata'
    ? 'partner'
    : 'hatcher';
}

export function hostedPrivacyLabel(model: HostedModelOption): string {
  if (model.providerKey === 'idle') return 'Partner-hosted';
  if (model.providerKey === 'xiaomi') return 'Xiaomi-hosted';
  if (model.providerKey === 'acedata') return 'AceData-hosted';
  return 'Hatcher-hosted';
}

export function hostedCostRank(cost: HostedModelCost): number {
  switch (cost) {
    case 'Low':
      return 1;
    case 'Medium':
      return 2;
    case 'High':
      return 3;
    case 'Premium':
      return 4;
    case 'Variable':
      return 5;
  }
}

export function hostedCostEstimate(cost: HostedModelCost): string {
  switch (cost) {
    case 'Low':
      return 'about 1-5 AI Credits per short reply';
    case 'Medium':
      return 'about 5-25 AI Credits per short reply';
    case 'High':
      return 'about 25-100 AI Credits per short reply';
    case 'Premium':
      return '100+ AI Credits for many replies';
    case 'Variable':
      return 'variable, depends on provider routing';
  }
}

export function hostedModelTags(model: HostedModelOption): HostedModelTag[] {
  const tags = new Set<HostedModelTag>();
  const haystack = `${model.name} ${model.category} ${model.description}`.toLowerCase();
  if (model.cost === 'Low') tags.add('low cost');
  if (model.fixedPrice) tags.add('fixed price');
  if (haystack.includes('fast') || haystack.includes('flash') || haystack.includes('nano')) tags.add('fast');
  if (haystack.includes('cod') || haystack.includes('repo')) tags.add('coding');
  if (haystack.includes('reason') || haystack.includes('thinking')) tags.add('reasoning');
  if (haystack.includes('balanced') || model.category === 'Default') tags.add('balanced');
  if (model.context.includes('1M') || model.context.includes('2M')) tags.add('long context');
  if (hostedModelPrivacy(model) === 'partner') tags.add('privacy');
  return Array.from(tags);
}

export function filterHostedModels(filter: HostedModelFilter): HostedModelOption[] {
  const needle = filter.search?.trim().toLowerCase();
  return HOSTED_MODELS.filter((model) => {
    if (filter.provider && filter.provider !== 'all' && model.providerKey !== filter.provider) {
      return false;
    }
    if (filter.privacy && filter.privacy !== 'all' && hostedModelPrivacy(model) !== filter.privacy) {
      return false;
    }
    if (filter.maxCostRank && hostedCostRank(model.cost) > filter.maxCostRank) {
      return false;
    }
    if (filter.tag && filter.tag !== 'all' && !hostedModelTags(model).includes(filter.tag)) {
      return false;
    }
    if (needle) {
      const searchable = [
        model.id,
        model.name,
        model.provider,
        model.category,
        model.cost,
        model.context,
        model.description,
        ...hostedModelTags(model),
      ].join(' ').toLowerCase();
      if (!searchable.includes(needle)) return false;
    }
    return true;
  });
}

export function resolveActiveModelDisplay(input: {
  provider?: string;
  model?: string;
}): ActiveModelDisplay {
  const provider = input.provider?.trim() || 'openrouter';
  if (provider === 'openrouter') {
    const model = getHostedModelOption(input.model);
    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      route: hostedModelRoute(model),
      privacy: hostedPrivacyLabel(model),
      context: model.context,
      cost: model.fixedPrice ?? hostedCostEstimate(model.cost),
      tags: hostedModelTags(model),
    };
  }

  return {
    id: input.model?.trim() || 'provider default',
    name: input.model?.trim() || 'Provider default',
    provider: providerNameFromKey(provider),
    route: 'BYOK direct',
    privacy: 'BYOK direct',
    tags: ['privacy'],
  };
}
