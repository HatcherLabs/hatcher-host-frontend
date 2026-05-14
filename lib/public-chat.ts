export interface PublicChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface PublicChatSession {
  sessionId: string;
  username: string;
}

export const PUBLIC_CHAT_HISTORY_LIMIT = 20;

export function buildPublicChatStorageKeys(agentId: string, sessionId?: string | null): {
  session: string;
  history: string;
} {
  return {
    session: `hatcher:public-chat:${agentId}:session`,
    history: `hatcher:public-chat:${agentId}:${sessionId ?? 'new'}:history`,
  };
}

export function publicChatHistoryForRequest(messages: PublicChatMessage[]): Array<{
  role: 'user' | 'assistant';
  content: string;
}> {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-PUBLIC_CHAT_HISTORY_LIMIT)
    .map((message) => ({ role: message.role, content: message.content }));
}

export function createPublicChatMessage(
  role: PublicChatMessage['role'],
  content: string,
): PublicChatMessage {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, role, content, createdAt: Date.now() };
}
