'use client';

import { createContext, useContext } from 'react';
import type { Agent, AgentFeature } from '@/lib/api';
// FeaturePricing type removed — using tier-based model now

// ─── Types ───────────────────────────────────────────────────

export type Tab = 'overview' | 'config' | 'integrations' | 'skills' | 'files' | 'logs' | 'memory' | 'knowledge' | 'schedules' | 'workflows' | 'chat' | 'stats' | 'versions' | 'usage' | 'analytics';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  timestamp?: Date;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export type LogFilter = 'all' | 'info' | 'warn' | 'error';

export interface IntegrationField {
  key: string;
  label: string;
  type: 'password' | 'text' | 'select';
  placeholder?: string;
  helper?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface IntegrationDef {
  featureKey: string;
  /** Unique key for state management (defaults to featureKey if not set) */
  stateKey?: string;
  name: string;
  description: string;
  secretPrefix: string;
  fields: IntegrationField[];
  /** If true, channel settings (dmPolicy, groupPolicy, streaming) are shown */
  hasChannelSettings?: boolean;
  /** Link to docs page explaining how to obtain API keys */
  docsUrl?: string;
  /** If true, this integration requires QR/device pairing instead of credential fields */
  pairingRequired?: boolean;
  /** Channel name used for the pair-channel API call (e.g. 'whatsapp', 'signal') */
  pairingChannel?: string;
  /** Additional config fields shown when paired (e.g. allowFrom for WhatsApp) */
  pairingFields?: IntegrationField[];
  /** Which frameworks support this integration. If omitted, all frameworks. */
  frameworks?: Array<'openclaw' | 'hermes' | 'elizaos' | 'milady'>;
}

export interface AgentStats {
  messagesProcessed: number;
  uptimeSecs: number;
  lastActiveAt: string | null;
  containerId: string | null;
  status: string;
}

// ─── Helpers ─────────────────────────────────────────────────

export function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function integrationStateKey(i: IntegrationDef): string {
  return i.stateKey ?? i.featureKey;
}

// ─── Constants ───────────────────────────────────────────────

export const DEFAULT_PROMPTS = ['What can you do?', 'Tell me about yourself', 'Help me get started'];

export const COLORS = {
  bg: '#0D0B1A',
  card: 'rgba(26,23,48,0.6)',
  accent: '#06b6d4',
  textPrimary: '#FFFFFF',
  textSecondary: '#A5A1C2',
  textMuted: '#71717a',
} as const;

export const tabContentVariants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const pageEntranceVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export const FRAMEWORK_BADGE: Record<string, string> = {
  openclaw: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  hermes: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  elizaos: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  milady: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

/** Root filesystem path inside each framework's container */
export const FRAMEWORK_ROOT_PATH: Record<string, string> = {
  openclaw: '/home/node/.openclaw',
  hermes: '/home/hermes/.hermes',
  elizaos: '/data',
  milady: '/data/.milady',
};

/** Get integrations filtered by framework */
export function getIntegrationsForFramework(framework: string): IntegrationDef[] {
  return OPENCLAW_INTEGRATIONS.filter(
    (i) => !i.frameworks || i.frameworks.includes(framework as 'openclaw' | 'hermes' | 'elizaos' | 'milady'),
  );
}

/** Get extra integrations filtered by framework.
 *  Extra platforms use OpenClaw's npm channel extensions — available for openclaw, milady, and hermes (subset). */
export function getExtraIntegrationsForFramework(framework: string): IntegrationDef[] {
  if (framework === 'openclaw') return EXTRA_PLATFORM_INTEGRATIONS;
  if (framework === 'milady') {
    // Milady supports most extra channels too (built on elizaOS with 29 connectors)
    const miladySupported = ['extra.twitch', 'extra.mattermost', 'extra.line', 'extra.matrix', 'extra.nostr', 'extra.feishu', 'extra.bluebubbles'];
    return EXTRA_PLATFORM_INTEGRATIONS.filter(i => i.stateKey && miladySupported.includes(i.stateKey));
  }
  if (framework === 'hermes') {
    const hermesSupported = ['extra.mattermost', 'extra.matrix'];
    return EXTRA_PLATFORM_INTEGRATIONS.filter(i => i.stateKey && hermesSupported.includes(i.stateKey));
  }
  return [];
}

export const STATUS_STYLES: Record<string, { classes: string; label: string; pulse: boolean; dotColor: string }> = {
  active: { classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Active', pulse: true, dotColor: 'bg-emerald-400' },
  sleeping: { classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'Sleeping', pulse: false, dotColor: 'bg-blue-400' },
  paused: { classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Paused', pulse: false, dotColor: 'bg-amber-400' },
  error: { classes: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Error', pulse: false, dotColor: 'bg-red-400' },
  killed: { classes: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Killed', pulse: false, dotColor: 'bg-red-400' },
  restarting: { classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Restarting', pulse: true, dotColor: 'bg-amber-400' },
};

export const LOG_LEVEL_COLORS: Record<string, string> = {
  info: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

/** Channel settings options shared across platforms */
export const CHANNEL_SETTINGS_FIELDS: IntegrationField[] = [
  { key: '_CS_DM_POLICY', label: 'DM Policy', type: 'select', helper: 'Who can message the bot in DMs',
    options: [{ value: 'open', label: 'Open — anyone' }, { value: 'allowlist', label: 'Allowlist only' }, { value: 'disabled', label: 'Disabled' }] },
  { key: '_CS_GROUP_POLICY', label: 'Group Policy', type: 'select', helper: 'How the bot responds in group chats',
    options: [{ value: 'open', label: 'Open — all messages' }, { value: 'mention', label: 'Mention only' }, { value: 'disabled', label: 'Disabled' }] },
  { key: '_CS_STREAMING', label: 'Streaming', type: 'select', helper: 'How responses are delivered',
    options: [{ value: 'partial', label: 'Partial — edit as tokens arrive' }, { value: 'full', label: 'Full — send complete' }, { value: 'off', label: 'Off' }] },
];

export const OPENCLAW_INTEGRATIONS: IntegrationDef[] = [
  {
    featureKey: 'openclaw.platform.telegram',
    name: 'Telegram',
    description: 'Deploy your agent as a Telegram bot.',
    secretPrefix: 'TELEGRAM',
    docsUrl: 'https://docs.hatcher.host/integrations/telegram',
    hasChannelSettings: true,
    frameworks: ['openclaw', 'hermes', 'elizaos', 'milady'],
    fields: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: 'Bot token from @BotFather', helper: 'Message @BotFather on Telegram to create a bot and get the token', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.discord',
    name: 'Discord',
    description: 'Deploy your agent as a Discord bot.',
    secretPrefix: 'DISCORD',
    docsUrl: 'https://docs.hatcher.host/integrations/discord',
    hasChannelSettings: true,
    frameworks: ['openclaw', 'hermes', 'elizaos', 'milady'],
    fields: [
      { key: 'DISCORD_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: 'Discord bot token', helper: 'From Discord Developer Portal > Bot > Token', required: true },
      { key: 'DISCORD_APPLICATION_ID', label: 'Application ID', type: 'text', placeholder: 'e.g. 123456789012345678', helper: 'From Discord Developer Portal > General Information' },
    ],
  },
  {
    featureKey: 'openclaw.platform.whatsapp',
    name: 'WhatsApp',
    description: 'Connect your agent to WhatsApp via QR code pairing.',
    secretPrefix: 'WHATSAPP',
    docsUrl: 'https://docs.hatcher.host/integrations/whatsapp',
    hasChannelSettings: false,
    frameworks: ['openclaw', 'hermes', 'milady'],
    pairingRequired: true,
    pairingFields: [
      { key: 'WHATSAPP_ALLOW_FROM', label: 'Allowed Phone Numbers', type: 'text', placeholder: '+1234567890, +0987654321', helper: 'Comma-separated phone numbers (E.164 format). Only these numbers can chat with your agent. Leave empty for everyone.' },
    ],
    pairingChannel: 'whatsapp',
    fields: [],
  },
  {
    featureKey: 'openclaw.platform.signal',
    name: 'Signal',
    description: 'Signal integration — coming soon.',
    secretPrefix: 'SIGNAL',
    docsUrl: 'https://docs.hatcher.host/integrations/signal',
    hasChannelSettings: false,
    frameworks: ['openclaw', 'hermes', 'milady'],
    fields: [],
  },
  {
    featureKey: 'openclaw.platform.twitter',
    name: 'X (Twitter)',
    description: 'Post tweets, reply, search, read posts, manage followers, and more via xurl.',
    frameworks: ['openclaw'],
    secretPrefix: 'XURL',
    docsUrl: 'https://docs.hatcher.host/integrations/twitter',
    hasChannelSettings: false,
    fields: [
      { key: 'XURL_CLIENT_ID', label: 'OAuth2 Client ID', type: 'password', placeholder: 'Your X API OAuth2 Client ID', helper: 'From X Developer Portal > App > Keys and tokens > OAuth 2.0 Client ID', required: true },
      { key: 'XURL_CLIENT_SECRET', label: 'OAuth2 Client Secret', type: 'password', placeholder: 'Your X API OAuth2 Client Secret', helper: 'From X Developer Portal > App > Keys and tokens > OAuth 2.0 Client Secret', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.twitter',
    stateKey: 'elizaos.twitter',
    name: 'X (Twitter)',
    description: 'Post tweets, reply, and engage on X via the Twitter plugin.',
    frameworks: ['elizaos', 'milady'],
    secretPrefix: 'TWITTER',
    docsUrl: 'https://docs.hatcher.host/integrations/twitter',
    hasChannelSettings: false,
    fields: [
      { key: 'TWITTER_USERNAME', label: 'Username', type: 'text', placeholder: '@youragent', helper: 'Your X/Twitter account username (without @)', required: true },
      { key: 'TWITTER_PASSWORD', label: 'Password', type: 'password', placeholder: 'Account password', helper: 'Password for the Twitter account (cookie-based auth)', required: true },
      { key: 'TWITTER_EMAIL', label: 'Email', type: 'text', placeholder: 'email@example.com', helper: 'Email associated with the Twitter account (needed for login verification)' },
      { key: 'TWITTER_API_KEY', label: 'API Key (optional)', type: 'password', placeholder: 'API Key from X Developer Portal', helper: 'Alternative to cookie auth — use X API v1 keys instead of username/password' },
      { key: 'TWITTER_API_SECRET', label: 'API Secret (optional)', type: 'password', placeholder: 'API Secret', helper: 'API Secret Key from X Developer Portal' },
      { key: 'TWITTER_ACCESS_TOKEN', label: 'Access Token (optional)', type: 'password', placeholder: 'Access Token', helper: 'OAuth 1.0a Access Token from X Developer Portal' },
      { key: 'TWITTER_ACCESS_TOKEN_SECRET', label: 'Access Token Secret (optional)', type: 'password', placeholder: 'Access Token Secret', helper: 'OAuth 1.0a Access Token Secret' },
    ],
  },
  {
    featureKey: 'openclaw.platform.slack',
    name: 'Slack',
    description: 'Deploy your agent in Slack workspaces.',
    secretPrefix: 'SLACK',
    docsUrl: 'https://docs.hatcher.host/integrations/slack',
    hasChannelSettings: true,
    frameworks: ['openclaw', 'hermes', 'elizaos', 'milady'],
    fields: [
      { key: 'SLACK_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...', helper: 'Bot User OAuth Token from Slack API', required: true },
      { key: 'SLACK_APP_TOKEN', label: 'App Token', type: 'password', placeholder: 'xapp-...', helper: 'App-Level Token for Socket Mode (from Slack API > Basic Information)' },
    ],
  },
  {
    featureKey: 'openclaw.feature.webhooks',
    name: 'Webhooks',
    description: 'Trigger your agent via external webhook events.',
    frameworks: ['openclaw', 'hermes'],
    secretPrefix: 'WEBHOOK',
    fields: [
      { key: 'WEBHOOK_URL', label: 'Webhook URL', type: 'text', placeholder: 'https://your-service.com/webhook', helper: 'URL that will send events to your agent', required: true },
      { key: 'WEBHOOK_SECRET', label: 'Webhook Secret', type: 'password', placeholder: 'Shared secret for HMAC verification', helper: 'Used to verify incoming webhook payloads' },
    ],
  },
];

/** Extra platforms — all extra platforms included free (OpenClaw only — use npm channel extensions) */
export const EXTRA_PLATFORM_INTEGRATIONS: IntegrationDef[] = [
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.twitch',
    name: 'Twitch',
    description: 'Connect your agent to Twitch chat.',
    secretPrefix: 'TWITCH',
    hasChannelSettings: false,
    fields: [
      { key: 'TWITCH_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: 'oauth:abc123...', helper: 'Generate at twitchtokengenerator.com (Bot Token with chat:read + chat:write)', required: true },
      { key: 'TWITCH_CLIENT_ID', label: 'Client ID', type: 'text', placeholder: 'Your Twitch Client ID', helper: 'From Twitch Token Generator or Twitch Developer Console', required: true },
      { key: 'TWITCH_USERNAME', label: 'Bot Username', type: 'text', placeholder: 'openclaw', helper: 'The Twitch account name the bot logs in as', required: true },
      { key: 'TWITCH_CHANNEL', label: 'Channel', type: 'text', placeholder: 'your_channel_name', helper: 'Which Twitch channel chat to join (without #)', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.irc',
    name: 'IRC',
    description: 'Connect to any IRC server.',
    secretPrefix: 'IRC',
    fields: [
      { key: 'IRC_HOST', label: 'Server Host', type: 'text', placeholder: 'irc.libera.chat', required: true },
      { key: 'IRC_PORT', label: 'Port', type: 'text', placeholder: '6697' },
      { key: 'IRC_TLS', label: 'Use TLS', type: 'select', helper: 'Encrypt connection (recommended)',
        options: [{ value: 'true', label: 'Yes (TLS)' }, { value: 'false', label: 'No (plaintext)' }] },
      { key: 'IRC_NICK', label: 'Nickname', type: 'text', placeholder: 'my-agent', required: true },
      { key: 'IRC_CHANNELS', label: 'Channels', type: 'text', placeholder: '#channel1, #channel2', helper: 'Comma-separated IRC channels to join', required: true },
      { key: 'IRC_PASSWORD', label: 'Server Password', type: 'password', placeholder: 'Server password (if needed)' },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.googlechat',
    name: 'Google Chat',
    description: 'Deploy in Google Workspace via Google Chat. Requires a public webhook URL and service account setup.',
    secretPrefix: 'GOOGLECHAT',
    fields: [
      { key: 'GOOGLECHAT_SERVICE_ACCOUNT_KEY', label: 'Service Account Key (JSON)', type: 'password', placeholder: '{"type":"service_account",...}', helper: 'Download JSON key from Google Cloud Console > IAM > Service Accounts', required: true },
      { key: 'GOOGLECHAT_AUDIENCE_TYPE', label: 'Audience Type', type: 'select', helper: 'How to identify your Chat app',
        options: [{ value: 'project-number', label: 'Project Number' }, { value: 'app-url', label: 'App URL' }] },
      { key: 'GOOGLECHAT_AUDIENCE', label: 'Audience Value', type: 'text', placeholder: 'Project number or app URL', helper: 'Your Google Cloud project number or Chat app URL' },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.msteams',
    name: 'Microsoft Teams',
    description: 'Deploy your agent in MS Teams channels. Requires Azure Bot registration and a public endpoint.',
    secretPrefix: 'MSTEAMS',
    fields: [
      { key: 'MSTEAMS_APP_ID', label: 'App ID', type: 'text', placeholder: 'Azure Bot registration App ID', helper: 'From Azure Portal > Bot Channels Registration', required: true },
      { key: 'MSTEAMS_APP_PASSWORD', label: 'App Password', type: 'password', placeholder: 'Client secret', helper: 'From Azure Portal > Certificates & Secrets', required: true },
      { key: 'MSTEAMS_TENANT_ID', label: 'Tenant ID', type: 'text', placeholder: 'Azure AD Tenant ID', helper: 'From Azure Portal > Azure Active Directory > Overview', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.mattermost',
    name: 'Mattermost',
    description: 'Connect to a self-hosted Mattermost instance.',
    secretPrefix: 'MATTERMOST',
    fields: [
      { key: 'MATTERMOST_BASE_URL', label: 'Server URL', type: 'text', placeholder: 'https://mattermost.example.com', required: true },
      { key: 'MATTERMOST_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: 'Bot access token', helper: 'From Mattermost > Integrations > Bot Accounts', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.line',
    name: 'Line',
    description: 'Deploy your agent on LINE Messenger.',
    secretPrefix: 'LINE',
    fields: [
      { key: 'LINE_CHANNEL_ACCESS_TOKEN', label: 'Channel Access Token', type: 'password', placeholder: 'Long-lived token', helper: 'From LINE Developers Console > Messaging API', required: true },
      { key: 'LINE_CHANNEL_SECRET', label: 'Channel Secret', type: 'password', placeholder: 'Channel secret', helper: 'From LINE Developers Console > Basic Settings' },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.matrix',
    name: 'Matrix',
    description: 'Connect to Matrix/Element rooms.',
    secretPrefix: 'MATRIX',
    fields: [
      { key: 'MATRIX_HOMESERVER', label: 'Homeserver URL', type: 'text', placeholder: 'https://matrix.org', required: true },
      { key: 'MATRIX_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: 'Bot user access token', helper: 'Create a bot user and get an access token from Element settings' },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.nostr',
    name: 'Nostr',
    description: 'Connect your agent to the Nostr protocol.',
    secretPrefix: 'NOSTR',
    fields: [
      { key: 'NOSTR_PRIVATE_KEY', label: 'Private Key (nsec)', type: 'password', placeholder: 'nsec1...', helper: 'Your Nostr private key — will be encrypted at rest', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.feishu',
    name: 'Feishu / Lark',
    description: 'Deploy in Feishu (Lark) workspaces.',
    secretPrefix: 'FEISHU',
    fields: [
      { key: 'FEISHU_APP_ID', label: 'App ID', type: 'text', placeholder: 'cli_xxxxx', helper: 'From Feishu Open Platform > App Credentials', required: true },
      { key: 'FEISHU_APP_SECRET', label: 'App Secret', type: 'password', placeholder: 'App secret', helper: 'From Feishu Open Platform > App Credentials', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.zalo',
    name: 'Zalo',
    description: 'Connect your agent to Zalo (popular in Vietnam).',
    secretPrefix: 'ZALO',
    fields: [
      { key: 'ZALO_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: 'Zalo Bot Token', helper: 'From Zalo Developer Portal', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.nextcloud',
    name: 'Nextcloud Talk',
    description: 'Connect to Nextcloud Talk rooms. Requires creating a bot on your Nextcloud server first.',
    secretPrefix: 'NEXTCLOUD_TALK',
    fields: [
      { key: 'NEXTCLOUD_TALK_BASE_URL', label: 'Server URL', type: 'text', placeholder: 'https://cloud.example.com', helper: 'Your Nextcloud server base URL', required: true },
      { key: 'NEXTCLOUD_TALK_BOT_SECRET', label: 'Bot Secret', type: 'password', placeholder: 'Shared secret from occ talk:bot:install', helper: 'The shared secret used when creating the bot via occ talk:bot:install', required: true },
    ],
  },
  {
    featureKey: 'openclaw.platform.extra',
    stateKey: 'extra.bluebubbles',
    name: 'BlueBubbles',
    description: 'iMessage bridge via BlueBubbles (requires macOS server running BlueBubbles app).',
    secretPrefix: 'BLUEBUBBLES',
    fields: [
      { key: 'BLUEBUBBLES_SERVER_URL', label: 'Server URL', type: 'text', placeholder: 'http://192.168.1.100:1234', helper: 'BlueBubbles macOS server address', required: true },
      { key: 'BLUEBUBBLES_PASSWORD', label: 'Server Password', type: 'password', placeholder: 'BlueBubbles server password', helper: 'Set in BlueBubbles app web API settings', required: true },
    ],
  },
];

// ─── Shared UI components ────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-[#71717a]/20 ${className}`} />
  );
}

export function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card glass-noise p-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── Context ─────────────────────────────────────────────────

export interface AgentContextValue {
  // Core
  agent: Agent;
  id: string;
  stats: AgentStats | null;
  isActive: boolean;
  isNotActive: boolean;
  statusInfo: { classes: string; label: string; pulse: boolean; dotColor: string };
  frameworkMeta: import('@hatcher/shared').FrameworkMeta | undefined;

  // Tab
  tab: Tab;
  setTab: (tab: Tab) => void;

  // Logs
  logs: LogEntry[];
  logsLoading: boolean;
  logFilter: LogFilter;
  setLogFilter: (filter: LogFilter) => void;
  filteredLogs: LogEntry[];
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  loadLogs: () => Promise<void>;

  // Chat
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  chatError: string | null;
  setChatError: (error: string | null) => void;
  chatErrorType: 'timeout' | 'ratelimit' | 'network' | 'generic' | null;
  setChatErrorType: (type: 'timeout' | 'ratelimit' | 'network' | 'generic' | null) => void;
  msgCount: number;
  hasUnlimitedChat: boolean;
  msgLimit: number;
  remaining: number | null;
  isLimitReached: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  sendMessage: (overrideText?: string) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent) => void;

  // Config
  configName: string;
  setConfigName: (value: string) => void;
  configDesc: string;
  setConfigDesc: (value: string) => void;
  configBio: string;
  setConfigBio: (value: string) => void;
  configLore: string;
  setConfigLore: (value: string) => void;
  configTopics: string;
  setConfigTopics: (value: string) => void;
  configStyle: string;
  setConfigStyle: (value: string) => void;
  configAdjectives: string;
  setConfigAdjectives: (value: string) => void;
  configSystemPrompt: string;
  setConfigSystemPrompt: (value: string) => void;
  configSkills: string;
  setConfigSkills: (value: string) => void;
  configModel: string;
  setConfigModel: (value: string) => void;
  configProvider: string;
  setConfigProvider: (value: string) => void;
  customModelInput: string;
  setCustomModelInput: (value: string) => void;
  useCustomModel: boolean;
  setUseCustomModel: (value: boolean) => void;
  byokKeyInput: string;
  setByokKeyInput: (value: string) => void;
  showByokKey: boolean;
  setShowByokKey: (value: boolean) => void;
  saving: boolean;
  saveMsg: string | null;
  setSaveMsg: (msg: string | null) => void;
  saveConfig: (commitMessage?: string) => Promise<void>;

  // LLM helpers
  llmProvider: string;
  currentProviderMeta: ReturnType<typeof import('@hatcher/shared').getBYOKProvider>;
  providerModels: { id: string; name: string; context?: string }[];
  hasApiKey: boolean;
  displayUptime: number;
  isLiveUptime: boolean;

  // Features / Integrations
  activeFeatures: AgentFeature[];
  activeFeatureKeys: Set<string>;
  featuresLoading: boolean;
  unlocking: string | null;
  handleUnlockFeature: (featureKey: string, usdPrice: number) => Promise<void>;
  // Integration config
  integrationSecrets: Record<string, Record<string, string>>;
  expandedIntegrations: Set<string>;
  visibleFields: Set<string>;
  savingIntegration: string | null;
  integrationSaveMsg: Record<string, string>;
  toggleIntegrationExpanded: (featureKey: string) => void;
  toggleFieldVisibility: (fieldKey: string) => void;
  setIntegrationField: (featureKey: string, fieldKey: string, value: string) => void;
  saveIntegrationSecrets: (integration: IntegrationDef) => Promise<void>;
  hasExistingSecret: (secretKey: string) => boolean;

  // Actions
  actionLoading: string | null;
  actionError: string | null;
  actionSuccess: string | null;
  setActionError: (error: string | null) => void;
  handleAction: (action: 'start' | 'stop' | 'restart') => Promise<void>;
  handleDelete: () => Promise<void>;
  deleteConfirm: boolean;
  setDeleteConfirm: (value: boolean) => void;
  deleting: boolean;
  deleteError: string | null;
  setDeleteError: (error: string | null) => void;

  // Loading
  loadAgent: () => Promise<void>;
  loadFeatures: () => Promise<void>;

  // Wallet/auth
  isAuthenticated: boolean;
  wallet: ReturnType<typeof import('@solana/wallet-adapter-react').useWallet>;
  connection: ReturnType<typeof import('@solana/wallet-adapter-react').useConnection>['connection'];
}

export const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgentContext must be used within AgentContext.Provider');
  return ctx;
}
