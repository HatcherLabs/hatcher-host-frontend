// ============================================================
// API Types — shared type definitions for the API client
//
// Types here represent the *serialized API response* shape
// (string dates, optional joined relations, subset of fields).
// Domain/DB types live in @hatcher/shared.
// ============================================================

import type {
  AgentFramework,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  WsChatMessage,
} from '@hatcher/shared';

// Re-export shared types that are used identically in the frontend
export type { TicketStatus, TicketCategory, TicketPriority };

/** Re-export WsChatMessage as ChatMessage for frontend use */
export type ChatMessage = WsChatMessage;

export interface ChatSessionSummary {
  id: string;
  title: string;
  preview: string | null;
  messageCount: number;
  startedAt: number;
  updatedAt: number;
  current: boolean;
}

/**
 * Payment as returned by the API (serialized dates, optional agent join).
 * Differs from shared Payment which has userId and Date fields.
 */
export interface Payment {
  id: string;
  agentId: string | null;
  featureKey: string;
  usdAmount: number;
  hatchAmount: number;
  txSignature: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  createdAt: string;
  agent?: { name: string };
}

/**
 * AgentFeature as returned by the API (serialized dates, simpler type field).
 * Differs from shared AgentFeature which uses FeatureKey/FeatureType enums and Date fields.
 */
export interface AgentFeature {
  id: string;
  featureKey: string;
  type: 'one_time' | 'subscription';
  expiresAt: string | null;
  userId: string;
  txSignature: string;
  createdAt: string;
}

/**
 * Agent as returned by the API (serialized dates, optional joined relations).
 * Differs from shared Agent which is the full DB model with Date fields and AgentConfig.
 */
export interface Agent {
  id: string;
  name: string;
  slug?: string | null;
  description: string | null;
  avatarUrl: string | null;
  status: string;
  framework: AgentFramework;
  messageCount?: number;
  ownerId?: string;
  ownerUsername?: string;
  ownerAddress?: string;
  owner?: { username?: string; walletAddress?: string | null };
  config?: Record<string, unknown>;
  features?: Array<{ featureKey: string }>;
  isPublic?: boolean;
  inactiveSince?: string | null;
  archivedAt?: string | null;
  archiveDeleteAfter?: string | null;
  // SKALE Phase 1+ — public wallet address for the agent (always non-null
  // for agents created after the schema migration). erc8004 fields appear
  // once Phase 2 registration ships. The encrypted private key is server-
  // only and never reaches this type.
  skaleWalletAddress?: string | null;
  skaleAgentId?: string | null;
  skaleRegisteredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AgentMailboxInfo {
  id: string;
  address: string;
  status: string;
}

export interface AgentMailSettings {
  autoSendEnabled: boolean;
}

export interface AgentMailRuntime {
  address: string;
  sendUrl: string;
  messagesUrl: string;
  mailboxUrl: string;
}

export type AgentMailDirection = 'inbound' | 'outbound';

export interface AgentMailMessage {
  id: string;
  agentId?: string;
  mailboxId?: string;
  direction?: AgentMailDirection | string;
  provider?: string;
  status?: string;
  providerMessageId?: string | null;
  fromAddress?: string;
  toAddresses?: string[] | unknown;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  headers?: Record<string, unknown> | unknown;
  errorMessage?: string | null;
  receivedAt?: string | null;
  sentAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetAgentMailboxResponse {
  mailbox: AgentMailboxInfo;
  settings: AgentMailSettings;
  runtime: AgentMailRuntime;
  instructions: string;
}

export interface GetAgentMailMessagesResponse {
  messages: AgentMailMessage[];
}

export interface SendAgentMailBody {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface SendAgentMailResponse {
  messageId: string;
  providerMessageId: string | null;
  status: string;
  mode: 'mock' | 'resend';
  from: string;
  to: string[];
}

export interface UpdateAgentMailSettingsBody {
  autoSendEnabled: boolean;
}

export interface UpdateAgentMailSettingsResponse {
  settings: AgentMailSettings;
}

export type SpawnDna = Record<string, unknown>;

export interface SpawnAgent {
  id: string;
  name: string;
  owner_wallet: string;
  agent_wallet?: string | null;
  status: string;
  generation?: number;
  parent_id?: string | null;
  born_at?: string | null;
  died_at?: string | null;
  death_reason?: string | null;
  total_pnl_sol?: number;
  total_trades?: number;
  initial_capital_sol?: number;
  total_withdrawn_sol?: number;
  total_deposited_sol?: number;
  paused?: boolean;
  signing_mode?: string;
  agent_type?: string;
  avatar?: string | null;
  bio?: string | null;
  dna?: SpawnDna;
}

export interface SpawnAgentsResponse {
  agents: SpawnAgent[];
}

export interface SpawnPaymentInstructions {
  payment_id: string;
  agent_id: string;
  agent_name: string;
  amount: number;
  reference: string;
  recipient: string;
  owner_wallet: string;
  dna?: SpawnDna;
}

export interface SpawnCreateAgentBody {
  name: string;
  solAmount: number;
  dna: SpawnDna;
  meta?: {
    avatar?: string;
    bio?: string;
  };
}

export interface SpawnAvatarUploadBody {
  dataUrl: string;
}

export interface SpawnAvatarUploadResponse {
  avatar: string;
}

export interface SpawnDepositBody {
  recipient: string;
  amount: number;
  reference: string;
  paymentId?: string;
}

export interface SpawnStatusResponse {
  status: 'pending' | 'confirmed' | 'funding_failed' | 'expired' | string;
  tx_signature: string | null;
  buyer_wallet?: string | null;
  agent_id?: string | null;
  amount?: number;
  agent_wallet?: string | null;
}

export interface SpawnTrade {
  id: string | number;
  agent_id: string;
  token_address: string;
  action: string;
  amount_sol?: number | null;
  token_amount?: number | null;
  pnl_sol?: number | null;
  tx_signature?: string | null;
  timestamp?: string | number | null;
}

export interface SpawnTradesResponse {
  trades: SpawnTrade[];
  limit?: number;
  offset?: number;
}

export interface SpawnPositionsResponse {
  memecoin?: Array<Record<string, unknown>>;
  prediction?: Array<Record<string, unknown>>;
}

export interface SpawnPortfolioToken {
  mint: string;
  symbol?: string | null;
  amount?: number | null;
  price_usd?: number | null;
  value_usd?: number | null;
  cost_basis_sol?: number | null;
  cost_basis_usd?: number | null;
  pnl_usd?: number | null;
  pnl_pct?: number | null;
}

export interface SpawnPortfolioResponse {
  wallet?: string;
  sol_balance?: number | null;
  native_sol?: number | null;
  wsol_balance?: number | null;
  sol_price?: number | null;
  sol_value_usd?: number | null;
  tokens?: SpawnPortfolioToken[];
  pm_open_value_usd?: number | null;
  pm_positions?: Array<Record<string, unknown>>;
  total_value_usd?: number | null;
  total_pnl_usd?: number | null;
}

export interface SpawnEvent {
  id: string | number;
  type: string;
  agent_id?: string;
  data?: Record<string, unknown> | string;
  timestamp?: number;
  created_at?: string;
}

export interface SpawnEventsResponse {
  events: SpawnEvent[];
  cursor: number;
  has_more: boolean;
}

export interface SpawnDepositResponse {
  transfer: {
    provider: 'solana';
    action: 'transfer';
    signature: string;
    solscanUrl: string;
    walletAddress: string;
    recipient: string;
    lamports: number;
    amountSol: number;
    reference: string | null;
    memo: string | null;
  };
}

export interface KausalayerConfigStatus {
  enabled: boolean;
  configured: boolean;
  baseUrl: string;
  keySource?: 'platform' | 'agent' | 'none';
}

export interface KausalayerConfigBody {
  enabled?: boolean;
  apiKey?: string;
}

export interface KausalayerTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface KausalayerToolsResponse {
  tools: KausalayerTool[];
}

export interface KausalayerHealthResponse {
  status?: string;
  service?: string;
  version?: string;
  [key: string]: unknown;
}

export interface KausalayerCallBody {
  tool: string;
  arguments: Record<string, unknown>;
}

export type KausalayerCallResponse = unknown;

export interface KausalayerResourceResult {
  tool: string;
  data: unknown | null;
  error: string | null;
}

export interface KausalayerResourcesResponse {
  config: KausalayerConfigStatus;
  privateResourcesAvailable: boolean;
  pockets: KausalayerResourceResult;
  savedWallets: KausalayerResourceResult;
  contacts: KausalayerResourceResult;
}

export type AgentPassportNetworkId = 'skale' | 'base' | 'solana';
export type AgentPassportChainType = 'evm' | 'solana';
export type AgentPassportSignerMode = 'receive-only' | 'runtime-signing' | 'planned';
export type AgentPassportTradingStatus = 'enabled' | 'disabled';
export type AgentPassportStatus =
  | 'registered'
  | 'wallet-ready'
  | 'planned'
  | 'unavailable'
  | 'server-unconfigured';

export interface AgentPassportNetwork {
  id: AgentPassportNetworkId;
  label: string;
  chainType: AgentPassportChainType;
  status: AgentPassportStatus;
  caip2: string;
  chainId?: number;
  walletAddress: string | null;
  agentId: string | null;
  registry: string | null;
  registryStatus: AgentPassportStatus;
  registeredAt: string | null;
  explorerUrl: string | null;
  contracts?: Record<string, string | null>;
  sharedWalletWith?: AgentPassportNetworkId;
  notes?: string[];
}

export interface AgentPassportPaymentRail {
  id: string;
  protocol: string;
  network: AgentPassportNetworkId;
  status: AgentPassportStatus;
  caip2: string;
  asset: string | null;
  receivingAddress: string | null;
  facilitatorUrl: string | null;
}

export interface AgentPassport {
  schemaVersion: 1;
  generatedAt: string;
  agent: {
    id: string;
    slug: string | null;
    name: string;
    description: string | null;
    framework: string;
    status: string;
    profileUrl: string;
    roomUrl: string;
    createdAt: string;
    updatedAt: string;
  };
  avatar: {
    kind: 'hatcher-room-v2';
    stationId: 'agentAvatar';
    imageUrl: string | null;
    roomUrl: string;
  };
  identity: {
    handle: string;
    primaryNetwork: AgentPassportNetworkId;
    networks: AgentPassportNetwork[];
  };
  wallets: Array<{
    id: string;
    chainType: AgentPassportChainType;
    status: AgentPassportStatus;
    address: string | null;
    networks: AgentPassportNetworkId[];
    signerMode: AgentPassportSignerMode;
  }>;
  runtime: {
    signerMode: AgentPassportSignerMode;
    trading: {
      status: AgentPassportTradingStatus;
      networks: AgentPassportNetworkId[];
      quoteProviders: Array<{
        id: 'jupiter';
        network: 'solana';
        status: AgentPassportTradingStatus;
        baseUrl: string;
      }>;
      notes: string[];
    };
  };
  payments: AgentPassportPaymentRail[];
  mcp: {
    status: AgentPassportStatus;
    manifestUrl: string;
    notes: string[];
  };
  links: {
    profile: string;
    room: string;
    passport: string;
    skaleMetadata: string;
    solanaMetadata: string;
  };
}

export interface AgentWalletTokenBalance {
  symbol: string;
  assetAddress: string | null;
  raw: string;
  formatted: string;
  decimals: number;
}

export interface AgentWalletNativeBalance {
  symbol: string;
  raw: string;
  formatted: string;
  decimals: number;
}

export interface AgentWalletNetworkBalance {
  id: AgentPassportNetworkId;
  label: string;
  chainType: AgentPassportChainType;
  status: AgentPassportStatus | string;
  caip2: string;
  chainId: string | null;
  address: string | null;
  explorerUrl: string | null;
  sharedWalletWith?: AgentPassportNetworkId;
  walletEnvVar: string;
  privateKeyEnvVar: string;
  canSign: boolean;
  nativeBalance: AgentWalletNativeBalance | null;
  tokenBalances: AgentWalletTokenBalance[];
  balanceError: string | null;
  identity: {
    agentId: string | null;
    registry: string | null;
    registrationTxHash: string | null;
    registeredAt: string | null;
    reputation?: {
      attestationCount: number;
      lastTxHash: string | null;
      lastTxAt: string | null;
      contract: string | null;
    };
  } | null;
}

export interface AgentWalletsResponse {
  networks: AgentWalletNetworkBalance[];
  runtime: {
    signerMode: AgentPassportSignerMode;
    transactionNetworks: AgentPassportNetworkId[];
    notes: string[];
  };
}

export interface AgentWalletPrivateKeyResponse {
  network: AgentPassportNetworkId;
  chainType: AgentPassportChainType;
  address: string;
  privateKey: string;
  format: 'evm-hex' | 'solana-base58-secret-key';
  sharedWalletWith?: AgentPassportNetworkId;
}

/**
 * Payment row as returned by the admin /payments endpoint.
 * Richer than the user-facing Payment shape — includes user + agent joins,
 * paymentToken, tokenAmount, and failureReason.
 */
export interface AdminPayment {
  id: string;
  userId: string;
  userEmail: string | null;
  userUsername: string | null;
  agentId: string | null;
  agentName: string | null;
  agentFramework: string | null;
  featureKey: string;
  usdAmount: number;
  hatchAmount: number;
  paymentToken: string | null;
  tokenAmount: number | null;
  txSignature: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  failureReason: string | null;
  createdAt: string;
}

/**
 * TicketMessage as returned by the API.
 * Differs from shared TicketMessage which has no id/ticketId and uses 'system' role.
 */
export interface TicketMessage {
  id?: string;
  ticketId?: string;
  role: 'user' | 'support' | 'admin';
  content: string;
  /** API emits `timestamp`; older code paths may use `createdAt`. */
  timestamp?: string;
  createdAt?: string;
}

/**
 * Ticket as returned by the API (serialized dates, optional agent join).
 * Differs from shared SupportTicket which uses Date fields.
 */
export interface Ticket {
  id: string;
  userId: string;
  agentId: string | null;
  agent?: { name: string } | null;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

// ── Analytics response types ─────────────────────────────────

export interface FunnelResponse {
  stages: Array<{ key: string; label: string; count: number; percent: number }>;
  windowDays: number;
  generatedAt: string;
}

export interface ChurnRadarResponse {
  atRisk: Array<{ userId: string; email: string; tier: string; lastAgentActivity: string | null; createdAt: string }>;
  thresholdDays: number;
  generatedAt: string;
}

export interface ReferralLeaderboardResponse {
  leaderboard: Array<{ userId: string; email: string; username: string | null; referralCode: string | null; referralCount: number }>;
  generatedAt: string;
}

export interface SignupHeatmapResponse {
  cells: Array<{ dow: number; hour: number; count: number }>;
  max: number;
  generatedAt: string;
}

export interface ErrorRateResponse {
  current24h: number;
  previous24h: number;
  deltaPct: number;
  generatedAt: string;
}

export interface WsCountResponse {
  chat: number;
  logs: number;
  terminal: number;
  total: number;
  generatedAt: string;
}

export interface LlmStatsResponse {
  perDay: Array<{ date: string; messages: number }>;
  topUsers: Array<{ userId: string; email: string; username: string | null; tier: string; messagesLast7d: number }>;
  rateLimitHitsToday: number;
  rateLimitHitsYesterday: number;
  generatedAt: string;
}

export interface AdminEgressEventsResponse {
  events: Array<{
    id: string;
    timestamp: string;
    agentId: string;
    host: string;
    port: number;
    allowed: boolean;
    reason?: string;
    tier?: string;
    address?: string;
    family?: 4 | 6;
    rateLimit?: { limit: number; remaining: number; resetMs?: number };
  }>;
  summary: {
    allowed: number;
    blocked: number;
    hosts: Array<{ host: string; allowed: number; blocked: number; lastSeenAt: string }>;
  };
  limit: number;
  agentId: string | null;
  generatedAt: string;
}

export type AgentEgressEventsResponse = Omit<AdminEgressEventsResponse, 'agentId'> & {
  agentId: string;
};

export interface AdminIdleOverviewResponse {
  generatedAt: string;
  config: {
    computeEnabled: boolean;
    providerEnabled: boolean;
    consumerBillingMode: 'partner_free' | 'ai_credits';
    providerCallbackConfigured: boolean;
    payoutWalletConfigured: boolean;
    providerDefaultPriceUsd: number;
    partnerApiConfigured?: boolean;
    partnerBaseUrl?: string | null;
  };
  partnerApi: {
    agentsStatus: number | null;
    usageStatus: number | null;
    earningsStatus: number | null;
    errors: string[];
  };
  consumer: {
    totalRequests: number;
    totalSpentUsd: number;
    byType: Array<{ type: string; requests: number; spentUsd: number | null }>;
    windows: Record<string, unknown> | null;
    pricing: Record<string, unknown> | null;
  };
  producer: {
    totalEarnedUsd: number;
    totalPaidUsd: number;
    totalPendingUsd: number;
    totalJobs: number;
    payoutSchedule: string | null;
    wallets: unknown[];
  };
  directNode?: {
    configured: boolean;
    wallet: string | null;
    status: number | null;
    errors: string[];
    container: {
      name: string;
      running: boolean;
      status: string;
      restartCount: number;
      startedAt: string | null;
      cpuLimitCores: number | null;
      memoryLimitMb: number | null;
      cpuPercent: number | null;
      memoryUsageMb: number | null;
    } | null;
    session: {
      processedJobs: number | null;
      lastJob: { type: string; earnedUsd: number; line: string } | null;
      logLines: string[];
    };
    earnings: {
      completedJobs: number;
      failedJobs: number;
      totalEarnedUsd: number;
      totalPaidUsd: number;
      pendingUsd: number;
      byType: Array<{ type: string; jobs: number }>;
    };
  };
  providers: {
    requiredCapabilities: string[];
    coverage: {
      activeRuntimeAgents: number;
      activeRunningAgents: number;
      activeRunningIdleEnvReady: number;
      idleEligibleNow: number;
      registeredHatcherProviders: number;
      registeredWithCurrentCapabilities: number;
    };
    missingRegistration: Array<{
      id: string;
      name: string;
      slug: string | null;
      framework: string;
      reason: string;
    }>;
    staleRegistrations: Array<{
      agentId: string;
      registryId: string | null;
      name: string | null;
      status: string | null;
      totalRequests: number;
    }>;
    duplicateRegistrations: Array<{ agentId: string; count: number }>;
    registrations: Array<{
      registryId: string | null;
      agentId: string | null;
      name: string | null;
      status: string | null;
      capabilities: string[];
      matchingCurrentCapabilities: boolean;
      pricePerRequest: number | null;
      totalRequests: number;
      totalEarnedUsd: number;
      stale: boolean;
    }>;
  };
}
