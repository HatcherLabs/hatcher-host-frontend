// ============================================================
// API Types — shared type definitions for the API client
// ============================================================

export interface Payment {
  id: string;
  agentId: string | null;
  featureKey: string;
  usdAmount: number;
  hatchAmount: number;
  txSignature: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  agent?: { name: string };
}

export interface AgentFeature {
  id: string;
  featureKey: string;
  type: 'one_time' | 'subscription';
  expiresAt: string | null;
  userId: string;
  txSignature: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  slug?: string | null;
  description: string | null;
  avatarUrl: string | null;
  status: string;
  framework: 'openclaw' | 'hermes' | 'elizaos' | 'milady';
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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'general' | 'billing' | 'technical' | 'feature_request' | 'bug_report';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  ticketId: string;
  role: 'user' | 'support';
  content: string;
  createdAt: string;
}

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
