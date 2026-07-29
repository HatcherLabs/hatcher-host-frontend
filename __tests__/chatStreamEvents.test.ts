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

  it('parses usage events emitted before the [DONE] terminator', () => {
    expect(parseAgentChatStreamEvent('usage', '{"credits":3,"inputTokens":12340,"outputTokens":890}')).toEqual({
      kind: 'usage',
      usage: { credits: 3, inputTokens: 12_340, outputTokens: 890 },
    });
  });

  it('passes the optional model through on usage events', () => {
    expect(parseAgentChatStreamEvent('usage', '{"credits":3,"inputTokens":12340,"outputTokens":890,"model":"claude-fable-5"}')).toEqual({
      kind: 'usage',
      usage: { credits: 3, inputTokens: 12_340, outputTokens: 890, model: 'claude-fable-5' },
    });
  });

  it('omits a malformed usage model but keeps the usage event valid', () => {
    const expected = { kind: 'usage', usage: { credits: 3, inputTokens: 1, outputTokens: 2 } };
    expect(parseAgentChatStreamEvent('usage', '{"credits":3,"inputTokens":1,"outputTokens":2,"model":42}')).toEqual(expected);
    expect(parseAgentChatStreamEvent('usage', '{"credits":3,"inputTokens":1,"outputTokens":2,"model":""}')).toEqual(expected);
    expect(parseAgentChatStreamEvent('usage', '{"credits":3,"inputTokens":1,"outputTokens":2,"model":"   "}')).toEqual(expected);
  });

  it('skips usage events with missing or non-numeric fields', () => {
    expect(parseAgentChatStreamEvent('usage', '{"credits":"3","inputTokens":1,"outputTokens":2}')).toEqual({ kind: 'skip' });
    expect(parseAgentChatStreamEvent('usage', '{"credits":3,"inputTokens":1}')).toEqual({ kind: 'skip' });
    expect(parseAgentChatStreamEvent('usage', 'not-json')).toEqual({ kind: 'skip' });
  });
});
