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
  protocol: 'x402';
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
      requiresExplicitUserIntent: boolean;
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
  };
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
