import type { ChatMsg } from './types';
import type { ChatMessageThinkingState } from './chatThinkingEvents';
import type { ChatMessageToolEvent } from './chatToolEvents';

export interface ChatMessageMetadata {
  thinking?: ChatMessageThinkingState;
  toolEvents?: ChatMessageToolEvent[];
}

const MAX_TOOL_EVENTS = 12;
const MAX_STRING_LENGTH = 4_000;
const MAX_PREVIEW_LENGTH = 600;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanString(value: unknown, maxLength = MAX_STRING_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.slice(0, maxLength);
}

function cleanNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeToolEvent(value: unknown): ChatMessageToolEvent | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const callId = cleanString(record.callId, 160)?.trim();
  const name = cleanString(record.name, 160)?.trim();
  const phase = record.phase;
  if (!callId || !name || (phase !== 'start' && phase !== 'done')) return undefined;

  return {
    callId,
    name,
    phase,
    ...(typeof record.argsPreview === 'string'
      ? { argsPreview: record.argsPreview.slice(0, MAX_PREVIEW_LENGTH) }
      : {}),
    ...(typeof record.resultPreview === 'string'
      ? { resultPreview: record.resultPreview.slice(0, MAX_STRING_LENGTH) }
      : {}),
  };
}

function normalizeThinking(value: unknown, now: () => number): ChatMessageThinkingState | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const startedAt = cleanNumber(record.startedAt);
  if (startedAt === undefined) return undefined;

  const endedAt = cleanNumber(record.endedAt) ?? now();
  return {
    content: cleanString(record.content) ?? '',
    streaming: false,
    ...(typeof record.label === 'string' && record.label.trim()
      ? { label: record.label.slice(0, 80) }
      : {}),
    startedAt,
    endedAt,
  };
}

export function normalizeChatMessageMetadata(
  value: unknown,
  now: () => number = Date.now,
): ChatMessageMetadata | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const thinking = normalizeThinking(record.thinking, now);
  const toolEvents = Array.isArray(record.toolEvents)
    ? record.toolEvents
      .map(normalizeToolEvent)
      .filter((event): event is ChatMessageToolEvent => Boolean(event))
      .slice(-MAX_TOOL_EVENTS)
    : [];

  if (!thinking && toolEvents.length === 0) return undefined;

  return {
    ...(thinking ? { thinking } : {}),
    ...(toolEvents.length > 0 ? { toolEvents } : {}),
  };
}

export function serializeChatMessageMetadata(
  message: Pick<ChatMsg, 'thinking' | 'toolEvents'>,
  now: () => number = Date.now,
): ChatMessageMetadata | undefined {
  const metadata = normalizeChatMessageMetadata({
    ...(message.thinking
      ? {
        thinking: {
          ...message.thinking,
          streaming: false,
          endedAt: message.thinking.endedAt ?? now(),
        },
      }
      : {}),
    ...(message.toolEvents && message.toolEvents.length > 0
      ? { toolEvents: message.toolEvents }
      : {}),
  }, now);

  return metadata;
}

export function chatMessageMetadataSignature(message: Pick<ChatMsg, 'thinking' | 'toolEvents'>): string {
  return JSON.stringify(serializeChatMessageMetadata(message, () => 0) ?? null);
}
