import { describe, expect, it } from 'vitest';
import {
  applyChatThinkingEvent,
  formatThinkingTraceLabel,
  shouldRenderThinkingTrace,
} from './chatThinkingEvents';

describe('applyChatThinkingEvent', () => {
  it('opens, appends, and closes a thinking trace', () => {
    const started = applyChatThinkingEvent(undefined, {
      phase: 'start',
      label: 'Reasoning',
      now: 1_000,
    });

    expect(started).toEqual({
      content: '',
      streaming: true,
      label: 'Reasoning',
      startedAt: 1_000,
    });

    const withDelta = applyChatThinkingEvent(started, {
      phase: 'delta',
      content: 'Checking the workspace.',
      now: 1_200,
    });

    expect(withDelta).toEqual({
      content: 'Checking the workspace.',
      streaming: true,
      label: 'Reasoning',
      startedAt: 1_000,
    });

    expect(applyChatThinkingEvent(withDelta, { phase: 'done', now: 2_500 })).toEqual({
      content: 'Checking the workspace.',
      streaming: false,
      label: 'Reasoning',
      startedAt: 1_000,
      endedAt: 2_500,
    });
  });

  it('keeps an empty trace renderable after completion so users see live thinking happened', () => {
    const started = applyChatThinkingEvent(undefined, {
      phase: 'start',
      label: 'Thinking',
      now: 10_000,
    });
    const done = applyChatThinkingEvent(started, { phase: 'done', now: 12_400 });

    expect(done).toEqual({
      content: '',
      streaming: false,
      label: 'Thinking',
      startedAt: 10_000,
      endedAt: 12_400,
    });
    expect(done ? shouldRenderThinkingTrace(done) : false).toBe(true);
    expect(done ? formatThinkingTraceLabel(done) : '').toBe('Thought for 2.4s');
  });
});
