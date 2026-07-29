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

/** AI credit cost of one assistant turn, emitted as a named `usage`
 *  SSE event just before the `[DONE]` terminator. Only present when
 *  the turn actually consumed hosted credits. */
export interface ChatUsagePayload {
  credits: number;
  inputTokens: number;
  outputTokens: number;
  /** Model id that produced the turn (max 128 chars); absent when unknown. */
  model?: string;
}

export type ParsedAgentChatStreamEvent =
  | { kind: 'token'; token: string; model?: string }
  | { kind: 'tool'; event: ChatToolEventPayload }
  | { kind: 'thinking'; event: ChatThinkingEventPayload }
  | { kind: 'usage'; usage: ChatUsagePayload }
  | { kind: 'error'; error: string }
  | { kind: 'done' }
  | { kind: 'skip'; model?: string };

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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

  if (eventName === 'usage') {
    const credits = numberValue(json.credits);
    const inputTokens = numberValue(json.inputTokens);
    const outputTokens = numberValue(json.outputTokens);
    if (credits === undefined || inputTokens === undefined || outputTokens === undefined) {
      return { kind: 'skip' };
    }
    // Optional model id: a malformed value omits just the field, the
    // usage event itself stays valid.
    const usageModel = stringValue(json.model)?.trim().slice(0, 128);
    return {
      kind: 'usage',
      usage: { credits, inputTokens, outputTokens, ...(usageModel ? { model: usageModel } : {}) },
    };
  }

  const token = stringValue(json.token);
  const model = stringValue(json.model);
  if (token) return { kind: 'token', token, ...(model ? { model } : {}) };
  return { kind: 'skip', ...(model ? { model } : {}) };
}
