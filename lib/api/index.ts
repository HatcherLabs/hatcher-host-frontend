// ============================================================
// API Client — barrel export
// ============================================================

export { getToken, setToken, clearToken, isAuthenticated, req } from './core';
export type {
  Payment,
  AgentFeature,
  Agent,
  ChatMessage,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  TicketMessage,
  Ticket,
} from './types';
export { api } from './methods';
