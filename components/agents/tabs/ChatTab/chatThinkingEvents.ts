export interface ChatMessageThinkingState {
  content: string;
  streaming: boolean;
  label?: string;
  startedAt?: number;
  endedAt?: number;
}

export interface ChatMessageThinkingEvent {
  phase: 'start' | 'delta' | 'done';
  label?: string;
  content?: string;
  now?: number;
}

export function applyChatThinkingEvent(
  current: ChatMessageThinkingState | undefined,
  event: ChatMessageThinkingEvent,
): ChatMessageThinkingState | undefined {
  if (event.phase === 'start') {
    return {
      content: current?.content ?? '',
      streaming: true,
      startedAt: current?.startedAt ?? event.now ?? Date.now(),
      ...(current?.endedAt ? { endedAt: current.endedAt } : {}),
      ...(event.label ?? current?.label ? { label: event.label ?? current?.label } : {}),
    };
  }

  if (event.phase === 'delta') {
    return {
      content: `${current?.content ?? ''}${event.content ?? ''}`,
      streaming: true,
      startedAt: current?.startedAt ?? event.now ?? Date.now(),
      ...(event.label ?? current?.label ? { label: event.label ?? current?.label } : {}),
    };
  }

  if (!current) return undefined;
  return {
    ...current,
    streaming: false,
    endedAt: current.endedAt ?? event.now ?? Date.now(),
  };
}

export function shouldRenderThinkingTrace(state: ChatMessageThinkingState): boolean {
  return state.streaming || state.content.trim().length > 0 || state.startedAt !== undefined;
}

export function formatThinkingTraceLabel(state: ChatMessageThinkingState): string {
  if (state.streaming) return `${state.label ?? 'Thinking'}...`;
  if (state.startedAt !== undefined) return `Thought for ${formatDuration(state.startedAt, state.endedAt)}`;
  return state.label ?? 'Thoughts';
}

function formatDuration(startedAt: number, endedAt: number | undefined): string {
  const durationMs = Math.max(0, (endedAt ?? Date.now()) - startedAt);
  if (durationMs < 1_000) return '<1s';
  const seconds = durationMs / 1_000;
  if (seconds < 10) return `${seconds.toFixed(1).replace(/\.0$/, '')}s`;
  return `${Math.round(seconds)}s`;
}
