export interface ChatToolEventPayload {
  callId: string;
  name: string;
  phase: 'start' | 'done';
  argsPreview?: string;
  resultPreview?: string;
  agentId?: string;
}

export interface ChatThinkingEventPayload {
  phase: 'start' | 'delta' | 'done';
  label?: string;
  content?: string;
  agentId?: string;
}

export type ParsedAgentChatStreamEvent =
  | { kind: 'token'; token: string; model?: string }
  | { kind: 'tool'; event: ChatToolEventPayload }
  | { kind: 'thinking'; event: ChatThinkingEventPayload }
  | { kind: 'error'; error: string }
  | { kind: 'done' }
  | { kind: 'skip'; model?: string };

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseAgentChatStreamEvent(
  eventName: string | undefined,
  data: string,
): ParsedAgentChatStreamEvent {
  if (data === '[DONE]') return { kind: 'done' };

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(data) as Record<string, unknown>;
  } catch {
    return { kind: 'skip' };
  }

  if (typeof json.error === 'string') return { kind: 'error', error: json.error };

  if (eventName === 'tool') {
    const callId = stringValue(json.callId);
    const name = stringValue(json.name);
    const phase = json.phase === 'start' || json.phase === 'done' ? json.phase : undefined;
    if (!callId || !name || !phase) return { kind: 'skip' };
    return {
      kind: 'tool',
      event: {
        callId,
        name,
        phase,
        ...(typeof json.argsPreview === 'string' ? { argsPreview: json.argsPreview } : {}),
        ...(typeof json.resultPreview === 'string' ? { resultPreview: json.resultPreview } : {}),
        ...(typeof json.agentId === 'string' ? { agentId: json.agentId } : {}),
      },
    };
  }

  if (eventName === 'thinking') {
    const phase =
      json.phase === 'start' || json.phase === 'delta' || json.phase === 'done'
        ? json.phase
        : undefined;
    if (!phase) return { kind: 'skip' };
    return {
      kind: 'thinking',
      event: {
        phase,
        ...(typeof json.label === 'string' ? { label: json.label } : {}),
        ...(typeof json.content === 'string' ? { content: json.content } : {}),
        ...(typeof json.agentId === 'string' ? { agentId: json.agentId } : {}),
      },
    };
  }

  const token = stringValue(json.token);
  const model = stringValue(json.model);
  if (token) return { kind: 'token', token, ...(model ? { model } : {}) };
  return { kind: 'skip', ...(model ? { model } : {}) };
}
