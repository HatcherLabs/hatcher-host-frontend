import type { ChatSessionSummary } from '@/lib/api';

export function getNextChatSessionIdAfterDelete(
  sessions: ChatSessionSummary[],
  deletedSessionId: string,
  activeSessionId: string | null,
): string | null {
  const deletedSession = sessions.find((session) => session.id === deletedSessionId);
  const remaining = sessions.filter((session) => session.id !== deletedSessionId);
  if (remaining.length === 0) return null;

  const activeStillExists = activeSessionId
    ? remaining.some((session) => session.id === activeSessionId)
    : false;
  if (activeStillExists) return activeSessionId;

  const deletedWasActive = activeSessionId === deletedSessionId || (!activeSessionId && deletedSession?.current);
  if (!deletedWasActive) {
    return remaining.find((session) => session.current)?.id ?? remaining[0]?.id ?? null;
  }

  const previousCurrent = remaining.find((session) => session.current);
  if (previousCurrent) return previousCurrent.id;

  const deletedIndex = sessions.findIndex((session) => session.id === deletedSessionId);
  return remaining[deletedIndex]?.id ?? remaining[Math.max(0, deletedIndex - 1)]?.id ?? remaining[0]?.id ?? null;
}
