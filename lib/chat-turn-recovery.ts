import type { Message } from '@/components/agents/AgentContext';
import type { ChatTurnSnapshot } from '@/hooks/useWebSocketChat';
import { normalizeChatMessageMetadata } from '@/components/agents/tabs/ChatTab/chatHistoryMetadata';

/** Absolute snapshots replace previews; they are never appended as tokens. */
export function mergeRecoveredChatTurn(messages: Message[], snapshot: ChatTurnSnapshot): Message[] {
  const previewId = `recovery-${snapshot.id}`;
  const savedId = snapshot.messageId ? `saved-${snapshot.messageId}` : previewId;
  const active = snapshot.status === 'active';
  const existingSaved = messages.findIndex((message) => message.id === savedId);
  let index = messages.findIndex((message) => message.id === previewId);
  if (index < 0) index = existingSaved;
  if (index < 0) index = messages.findLastIndex((message) => message.role === 'assistant' && message.streaming);
  if (index < 0 && !active) {
    const last = messages.at(-1);
    if (last?.role === 'assistant' && last.content === snapshot.content) index = messages.length - 1;
  }
  if (!active && !snapshot.content) {
    return messages.filter((message) => message.id !== previewId);
  }
  // A history request can finish between two resume frames. Prefer its
  // canonical saved row and remove any earlier preview of the same turn.
  if (existingSaved >= 0 && savedId !== previewId) {
    return messages.filter((message) => message.id !== previewId);
  }
  const metadata = normalizeChatMessageMetadata(snapshot.metadata);
  const thinking = metadata?.thinking
    ? { ...metadata.thinking, streaming: active && snapshot.thinkingActive }
    : active && !snapshot.content
      ? { content: '', label: 'Working', streaming: true, startedAt: snapshot.startedAt }
      : undefined;
  const recovered: Message = {
    id: savedId,
    role: 'assistant',
    content: snapshot.content,
    timestamp: new Date(snapshot.startedAt),
    streaming: active,
    ...(thinking ? { thinking } : {}),
    ...(metadata?.toolEvents ? { toolEvents: metadata.toolEvents } : {}),
    ...(metadata?.usage ? { usage: metadata.usage } : {}),
  };
  if (index < 0) return [...messages, recovered];
  return messages.map((message, i) => i === index ? recovered : message);
}
