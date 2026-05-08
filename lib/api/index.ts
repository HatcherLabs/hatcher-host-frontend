// ============================================================
// API Client — barrel export
// ============================================================

export { getToken, setToken, clearToken, isAuthenticated, req } from './core';
export type {
  Payment,
  AgentFeature,
  Agent,
  AdminPayment,
  AgentMailboxInfo,
  AgentMailDirection,
  AgentMailMessage,
  AgentMailRuntime,
  AgentMailSettings,
  AgentPassport,
  AgentPassportChainType,
  AgentPassportNetwork,
  AgentPassportNetworkId,
  AgentPassportPaymentRail,
  AgentPassportStatus,
  ChatMessage,
  ChatSessionSummary,
  GetAgentMailboxResponse,
  GetAgentMailMessagesResponse,
  SendAgentMailBody,
  SendAgentMailResponse,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  TicketMessage,
  Ticket,
  UpdateAgentMailSettingsBody,
  UpdateAgentMailSettingsResponse,
  FunnelResponse,
  ChurnRadarResponse,
  ReferralLeaderboardResponse,
  SignupHeatmapResponse,
  ErrorRateResponse,
  WsCountResponse,
  LlmStatsResponse,
} from './types';
export { api } from './methods';
