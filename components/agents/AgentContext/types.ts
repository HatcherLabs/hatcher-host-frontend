import type { Agent, AgentFeature } from '@/lib/api';
import type { AgentFramework } from '@hatcher/shared';

// ─── Types ───────────────────────────────────────────────────

export type Tab = 'overview' | 'config' | 'integrations' | 'skills' | 'files' | 'logs' | 'terminal' | 'memory' | 'schedules' | 'workflows' | 'chat' | 'stats';

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
  frameworks?: AgentFramework[];
}

export interface AgentStats {
  messagesProcessed: number;
  uptimeSecs: number;
  lastActiveAt: string | null;
  containerId: string | null;
  status: string;
}

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
  logSearch: string;
  setLogSearch: (value: string) => void;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
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
  chatErrorType: 'timeout' | 'ratelimit' | 'network' | 'llm_down' | 'generic' | null;
  setChatErrorType: (type: 'timeout' | 'ratelimit' | 'network' | 'llm_down' | 'generic' | null) => void;
  msgCount: number;
  hasUnlimitedChat: boolean;
  isByok: boolean;
  msgLimit: number;
  remaining: number | null;
  isLimitReached: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  sendMessage: (overrideText?: string) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  sendCooldown: boolean;
  wsConnected: boolean;

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

  // Auth
  isAuthenticated: boolean;

  // Tier
  userTier: string;
}
