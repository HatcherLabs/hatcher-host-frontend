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
 * Agent as returned by the API (serialized dates, optional joined relations,
 * public-facing fields like isPublic/ownerUsername/ownerAddress).
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
  isPublic?: boolean;
  messageCount?: number;
  ownerId?: string;
  ownerUsername?: string;
  ownerAddress?: string;
  owner?: { username?: string; walletAddress?: string | null };
  config?: Record<string, unknown>;
  features?: Array<{ featureKey: string }>;
  createdAt: string;
  updatedAt?: string;
}

/**
 * TicketMessage as returned by the API.
 * Differs from shared TicketMessage which has no id/ticketId and uses 'system' role.
 */
export interface TicketMessage {
  id: string;
  ticketId: string;
  role: 'user' | 'support';
  content: string;
  createdAt: string;
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
