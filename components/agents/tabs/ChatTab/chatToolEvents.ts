export interface ChatMessageToolEvent {
  callId: string;
  name: string;
  phase: 'start' | 'done';
  argsPreview?: string;
  resultPreview?: string;
}

export function streamToolEventToChatToolEvent(event: ChatMessageToolEvent & { agentId?: string }): ChatMessageToolEvent {
  return {
    callId: event.callId,
    name: event.name,
    phase: event.phase,
    ...(event.argsPreview !== undefined ? { argsPreview: event.argsPreview } : {}),
    ...(event.resultPreview !== undefined ? { resultPreview: event.resultPreview } : {}),
  };
}

export function applyChatToolEvent(
  current: ChatMessageToolEvent[],
  event: ChatMessageToolEvent,
  maxEvents = 12,
): ChatMessageToolEvent[] {
  if (event.phase === 'done' && event.callId === 'all' && event.name === '*') {
    return current.map((tool) => ({ ...tool, phase: 'done' as const })).slice(-maxEvents);
  }

  const existingIndex = current.findIndex((tool) => tool.callId === event.callId);
  if (existingIndex === -1) {
    return [...current, event].slice(-maxEvents);
  }

  const next = [...current];
  const existing = next[existingIndex];
  if (!existing) return current;

  next[existingIndex] = {
    ...existing,
    name: event.name || existing.name,
    phase: event.phase,
    ...(event.argsPreview !== undefined ? { argsPreview: event.argsPreview } : {}),
    ...(event.resultPreview !== undefined ? { resultPreview: event.resultPreview } : {}),
  };
  return next.slice(-maxEvents);
}
