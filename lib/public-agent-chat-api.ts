import { req } from '@/lib/api/core';

export type PublicAgentChatAgent = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  framework: string;
  status: string;
};

export type PublicAgentChatUsage = {
  dailyAiCreditsAvailable?: boolean;
  dailyAiCreditCap?: number | null;
  dailyAiCreditsSpent?: number | null;
  dailyAiCreditsRemaining?: number | null;
};

type PublicAgentChatAvailability = PublicAgentChatUsage & {
  enabled: boolean;
  agent: PublicAgentChatAgent | null;
};

type PublicAgentChatReply = PublicAgentChatUsage & {
  content: string;
  model: string;
  starting?: boolean;
};

export function getPublicAgentChat(agentId: string) {
  return req<PublicAgentChatAvailability>(`/agents/${encodeURIComponent(agentId)}/public-chat`);
}

export function createPublicAgentChatSession(agentId: string, username: string) {
  return req<{
    sessionId: string;
    username: string;
    agent: PublicAgentChatAgent;
  }>(`/agents/${encodeURIComponent(agentId)}/public-chat/session`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export function sendPublicAgentChatMessage(
  agentId: string,
  data: {
    sessionId: string;
    username: string;
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
) {
  return req<PublicAgentChatReply>(`/agents/${encodeURIComponent(agentId)}/public-chat`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
