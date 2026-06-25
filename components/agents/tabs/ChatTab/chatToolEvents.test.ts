import { describe, expect, it } from 'vitest';
import { applyChatToolEvent, streamToolEventToChatToolEvent } from './chatToolEvents';

describe('chat tool events', () => {
  it('adds and completes a tool call for persisted chat display', () => {
    const started = applyChatToolEvent([], {
      callId: 'call-1',
      name: 'terminal',
      phase: 'start',
      argsPreview: 'date +%s%N',
    });

    expect(started).toEqual([
      {
        callId: 'call-1',
        name: 'terminal',
        phase: 'start',
        argsPreview: 'date +%s%N',
      },
    ]);

    expect(applyChatToolEvent(started, {
      callId: 'call-1',
      name: 'terminal',
      phase: 'done',
      resultPreview: '{"exit_code":0,"output":"ok","error":null}',
    })).toEqual([
      {
        callId: 'call-1',
        name: 'terminal',
        phase: 'done',
        argsPreview: 'date +%s%N',
        resultPreview: '{"exit_code":0,"output":"ok","error":null}',
      },
    ]);
  });

  it('marks all active tools complete when Hermes sends a generic done event', () => {
    expect(applyChatToolEvent([
      { callId: 'call-1', name: 'terminal', phase: 'start' },
      { callId: 'call-2', name: 'web_search', phase: 'start' },
    ], {
      callId: 'all',
      name: '*',
      phase: 'done',
    })).toEqual([
      { callId: 'call-1', name: 'terminal', phase: 'done' },
      { callId: 'call-2', name: 'web_search', phase: 'done' },
    ]);
  });

  it('preserves live tool result previews from stream events', () => {
    expect(streamToolEventToChatToolEvent({
      callId: 'terminal-1',
      name: 'terminal',
      phase: 'done',
      argsPreview: 'pwd',
      resultPreview: '{"exit_code":0,"output":"/workspace\\n","error":null}',
      agentId: 'agent-1',
    })).toEqual({
      callId: 'terminal-1',
      name: 'terminal',
      phase: 'done',
      argsPreview: 'pwd',
      resultPreview: '{"exit_code":0,"output":"/workspace\\n","error":null}',
    });
  });
});
