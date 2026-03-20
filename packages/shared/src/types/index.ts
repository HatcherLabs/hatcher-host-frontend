// ============================================================
// Shared TypeScript Types for Hatcher
// ============================================================

// --- API Response Wrapper ---

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ApiOk<T> = ApiResponse<T> & { success: true; data: T };
export type ApiErr = ApiResponse<never> & { success: false; error: string };

export function ok<T>(data: T): ApiOk<T> {
  return { success: true, data };
}

export function err(error: string): ApiErr {
  return { success: false, error };
}

// --- User ---

export type UserTier = 'free' | 'paid';

export interface User {
  id: string;
  walletAddress: string;
  apiKey: string;
  referralCode: string | null;
  hatchCredits: number;
  createdAt: Date;
}

export interface UserPublic {
  id: string;
  walletAddress: string;
  referralCode: string | null;
  createdAt: Date;
}

// --- Agent ---

export type AgentStatus = 'active' | 'sleeping' | 'paused' | 'killed' | 'error' | 'restarting';
export type AgentFramework = 'openclaw';
export type Framework = AgentFramework;

// ── OpenClaw Native Config Types (matches real openclaw.json) ──

export interface OpenClawGatewayAuth {
  mode?: string;
  token?: string;
}

export interface OpenClawGateway {
  port?: number;
  bind?: string;
  auth?: OpenClawGatewayAuth;
  controlUi?: {
    enabled?: boolean;
    allowedOrigins?: string[];
    dangerouslyAllowHostHeaderOriginFallback?: boolean;
  };
  http?: {
    endpoints?: {
      chatCompletions?: { enabled?: boolean };
      responses?: { enabled?: boolean };
    };
  };
}

export interface OpenClawModelRef {
  primary: string;
  fallback?: string[];
}

export interface OpenClawModelProvider {
  apiKey?: string;
  baseUrl?: string;
  api?: string;
  models?: Array<{ id: string; name: string }>;
}

export interface OpenClawModels {
  mode?: string;
  providers?: Record<string, OpenClawModelProvider>;
}

export interface OpenClawAgentDef {
  id?: string;
  name?: string;
  default?: boolean;
  workspace?: string;
  model?: OpenClawModelRef;
  maxConcurrent?: number;
  compaction?: { mode?: string };
  subagents?: { maxConcurrent?: number };
}

export interface OpenClawAgents {
  defaults?: Partial<OpenClawAgentDef>;
  list?: OpenClawAgentDef[];
}

export interface OpenClawChannelAccount {
  botToken?: string;
  token?: string;
  appToken?: string;
  enabled?: boolean;
  dmPolicy?: string;
  allowFrom?: string[];
  streaming?: string;
  [key: string]: unknown;
}

export interface OpenClawChannel {
  enabled: boolean;
  accounts?: Record<string, OpenClawChannelAccount>;
  groupPolicy?: string;
  [key: string]: unknown;
}

export type OpenClawChannelName =
  | 'telegram' | 'discord' | 'whatsapp' | 'slack'
  | 'signal' | 'imessage' | 'irc' | 'google-chat'
  | 'teams' | 'mattermost' | 'line' | 'matrix'
  | 'nostr' | 'twitch' | 'webchat';

export interface OpenClawBinding {
  agentId: string;
  match: {
    channel: string;
    [key: string]: unknown;
  };
}

export interface OpenClawCron {
  webhookToken?: string;
}

export interface OpenClawHooks {
  path?: string;
  allowedAgentIds?: string[];
}

export interface OpenClawTTS {
  provider?: string;
  voice?: string;
  providers?: Record<string, { apiKey?: string }>;
}

export interface OpenClawMessages {
  tts?: OpenClawTTS;
}

export interface OpenClawSession {
  dmScope?: string;
}

export interface OpenClawSkillsConfig {
  load?: { watch?: boolean };
}

/** The real openclaw.json structure */
export interface OpenClawNativeConfig {
  gateway: OpenClawGateway;
  models: OpenClawModels;
  agents: OpenClawAgents;
  channels: Partial<Record<OpenClawChannelName, OpenClawChannel>>;
  bindings: OpenClawBinding[];
  cron?: OpenClawCron;
  hooks?: OpenClawHooks;
  messages?: OpenClawMessages;
  session?: OpenClawSession;
  skills?: OpenClawSkillsConfig;
  tools?: Record<string, unknown>;
  talk?: Record<string, unknown>;
  meta?: {
    lastTouchedVersion?: string;
    lastTouchedAt?: string;
  };
}

/**
 * OpenClaw agent configuration — Hatcher's internal representation.
 * Used to store user intent in config_json. The adapter converts this
 * into a full OpenClawNativeConfig at container start time.
 */
export interface OpenClawConfig {
  name: string;
  model?: string;
  provider?: string;
  skills?: string[];
  systemPrompt?: string;
  triggers?: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  workflows?: Array<{
    name: string;
    steps: Array<{ skill: string; config?: Record<string, unknown> }>;
  }>;
}

// Agent config — OpenClaw only
export type AgentConfig = {
  framework: 'openclaw';
  config: OpenClawConfig;
};

export interface Agent {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  framework: AgentFramework;
  status: AgentStatus;
  containerId: string | null;
  config: AgentConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPublic extends Omit<Agent, 'config' | 'containerId' | 'ownerId'> {
  ownerAddress: string;
  features: AgentFeaturePublic[];
}

// --- Feature Keys (Project Bible pricing model) ---

// OpenClaw platform features (one-time)
export type OpenClawPlatformFeature =
  | 'openclaw.platform.telegram'
  | 'openclaw.platform.discord'
  | 'openclaw.platform.whatsapp'
  | 'openclaw.platform.signal'
  | 'openclaw.platform.slack'
  | 'openclaw.platform.imessage'
  | 'openclaw.platform.extra';

// OpenClaw skills features (one-time)
export type OpenClawSkillsFeature =
  | 'openclaw.skills.pack3'
  | 'openclaw.skills.pack10'
  | 'openclaw.skills.unlimited';

// OpenClaw subscription features (monthly)
export type OpenClawSubscriptionFeature =
  | 'openclaw.feature.cron'
  | 'openclaw.feature.webhooks'
  | 'openclaw.feature.persistent_memory'
  | 'openclaw.feature.multiagent'
  | 'openclaw.feature.voice'
  | 'openclaw.feature.unlimited_chat'
  | 'openclaw.feature.file_manager';

// OpenClaw resource features (monthly)
export type OpenClawResourceFeature =
  | 'openclaw.resources.dedicated'
  | 'openclaw.resources.logs_full';

// Account-level features (monthly subscriptions)
export type AccountFeature =
  | 'account.agents.5'
  | 'account.agents.20'
  | 'account.agents.unlimited'
  | 'account.support.priority'
  | 'account.analytics';

// Union of all feature keys
export type FeatureKey =
  | OpenClawPlatformFeature
  | OpenClawSkillsFeature
  | OpenClawSubscriptionFeature
  | OpenClawResourceFeature
  | AccountFeature;

export type FeatureType = 'one_time' | 'subscription';

export interface AgentFeature {
  id: string;
  agentId: string | null; // null for account-level features
  userId: string;
  featureKey: FeatureKey;
  type: FeatureType;
  expiresAt: Date | null;
  txSignature: string;
  usdPrice: number;
  hatchAmount: number;
  createdAt: Date;
}

export interface AgentFeaturePublic {
  featureKey: FeatureKey;
  type: FeatureType;
  expiresAt: Date | null;
}

// --- Payments ---

export type PaymentStatus = 'pending' | 'confirmed' | 'failed';

export interface Payment {
  id: string;
  userId: string;
  agentId: string | null;
  featureKey: string;
  usdAmount: number;
  hatchAmount: number;
  txSignature: string;
  status: PaymentStatus;
  createdAt: Date;
}

// --- BYOK (Bring Your Own Key) ---

export type BYOKProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'openrouter' | 'ollama';

/** Maps each BYOK provider to the env var name expected by frameworks */
export const BYOK_PROVIDER_ENV_VARS: Record<BYOKProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  groq: 'GROQ_API_KEY',
  xai: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
};

export interface BYOKConfig {
  provider: BYOKProvider;
  apiKey?: string; // encrypted at rest, absent for ollama
  model?: string;
  baseUrl?: string; // for ollama or custom endpoints
}

// --- LLM ---

export type LLMProvider = BYOKProvider | 'hatcher_proxy';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// --- LLM Usage Tracking ---

export interface LlmUsage {
  id: string;
  userId: string;
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  usdCost: number;
  createdAt: Date;
}

// --- Hosted Credits ---

export interface CreditPack {
  key: string;
  label: string;
  hatchUsd: number; // price in USD worth of $HATCH
  creditsUsd: number; // credits received in USD
}

// --- WebSocket / Chat ---

export type WSMessageType =
  | 'chat_message'
  | 'chat_response'
  | 'chat_error'
  | 'agent_status'
  | 'rate_limit';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
}

export interface ChatMessage {
  id: string;
  agentId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// --- Auth ---

export interface AuthChallenge {
  nonce: string;
  message: string;
  expiresAt: Date;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
  user: UserPublic;
}

// --- Agent File Manager ---

export interface AgentFile {
  id: string;
  agentId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- Admin Stats ---

export interface AdminStats {
  totalUsers: number;
  totalAgents: number;
  activeAgents: number;
  totalFeaturesUnlocked: number;
  totalPayments: number;
}

// --- WebSocket Chat ---

export interface WsChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WsChatPayload {
  message: string;
  history?: WsChatMessage[];
}
