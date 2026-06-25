import { describe, expect, it } from 'vitest';
import { parseAgentChatStreamEvent } from '../lib/api/chatStreamEvents';

describe('parseAgentChatStreamEvent', () => {
  it('parses tool events from HTTP SSE fallback', () => {
    expect(parseAgentChatStreamEvent('tool', '{"callId":"call_1","name":"terminal","phase":"start","argsPreview":"pwd"}')).toEqual({
      kind: 'tool',
      event: {
        callId: 'call_1',
        name: 'terminal',
        phase: 'start',
        argsPreview: 'pwd',
      },
    });
  });

  it('parses thinking events from HTTP SSE fallback', () => {
    expect(parseAgentChatStreamEvent('thinking', '{"phase":"delta","content":"Checking the workspace."}')).toEqual({
      kind: 'thinking',
      event: {
        phase: 'delta',
        content: 'Checking the workspace.',
      },
    });
  });

  it('parses ordinary token events without an SSE event name', () => {
    expect(parseAgentChatStreamEvent(undefined, '{"token":"Done","model":"openclaw"}')).toEqual({
      kind: 'token',
      token: 'Done',
      model: 'openclaw',
    });
  });
});
