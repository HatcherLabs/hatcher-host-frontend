import { describe, expect, it } from 'vitest';
import {
  chatMessageMetadataSignature,
  normalizeChatMessageMetadata,
  serializeChatMessageMetadata,
} from './chatHistoryMetadata';
import type { ChatMsg } from './types';

describe('chatHistoryMetadata', () => {
  it('normalizes persisted thinking and tool events from API history', () => {
    expect(normalizeChatMessageMetadata({
      thinking: {
        content: '',
        streaming: true,
        label: 'Thinking',
        startedAt: 1_000,
        endedAt: 2_500,
        extra: 'ignored',
      },
      toolEvents: [
        {
          callId: 'terminal-1',
          name: 'terminal',
          phase: 'done',
          argsPreview: 'pwd',
          extra: 'ignored',
        },
        {
          callId: '',
          name: 'bad',
          phase: 'start',
        },
      ],
    })).toEqual({
      thinking: {
        content: '',
        streaming: false,
        label: 'Thinking',
        startedAt: 1_000,
        endedAt: 2_500,
      },
      toolEvents: [
        {
          callId: 'terminal-1',
          name: 'terminal',
          phase: 'done',
          argsPreview: 'pwd',
        },
      ],
    });
  });

  it('serializes completed assistant activity metadata for history saves', () => {
    expect(serializeChatMessageMetadata({
      thinking: {
        content: '',
        streaming: true,
        label: 'Thinking',
        startedAt: 1_000,
      },
      toolEvents: [
        {
          callId: 'search-1',
          name: 'web_search',
          phase: 'start',
          argsPreview: 'BTC price',
        },
      ],
    }, () => 2_250)).toEqual({
      thinking: {
        content: '',
        streaming: false,
        label: 'Thinking',
        startedAt: 1_000,
        endedAt: 2_250,
      },
      toolEvents: [
        {
          callId: 'search-1',
          name: 'web_search',
          phase: 'start',
          argsPreview: 'BTC price',
        },
      ],
    });
  });

  it('normalizes persisted usage metadata from API history', () => {
    expect(normalizeChatMessageMetadata({
      usage: {
        credits: 3,
        inputTokens: 12_340,
        outputTokens: 890,
        extra: 'ignored',
      },
    })).toEqual({
      usage: {
        credits: 3,
        inputTokens: 12_340,
        outputTokens: 890,
      },
    });
  });

  it('normalizes the optional model on persisted usage metadata', () => {
    expect(normalizeChatMessageMetadata({
      usage: {
        credits: 3,
        inputTokens: 12_340,
        outputTokens: 890,
        model: '  claude-fable-5  ',
      },
    })).toEqual({
      usage: {
        credits: 3,
        inputTokens: 12_340,
        outputTokens: 890,
        model: 'claude-fable-5',
      },
    });
  });

  it('caps an over-long usage model at 128 characters', () => {
    expect(normalizeChatMessageMetadata({
      usage: { credits: 3, inputTokens: 1, outputTokens: 2, model: 'm'.repeat(200) },
    })).toEqual({
      usage: { credits: 3, inputTokens: 1, outputTokens: 2, model: 'm'.repeat(128) },
    });
  });

  it('drops a malformed usage model but keeps the rest of the usage object', () => {
    const expected = { usage: { credits: 3, inputTokens: 1, outputTokens: 2 } };
    expect(normalizeChatMessageMetadata({
      usage: { credits: 3, inputTokens: 1, outputTokens: 2, model: 42 },
    })).toEqual(expected);
    expect(normalizeChatMessageMetadata({
      usage: { credits: 3, inputTokens: 1, outputTokens: 2, model: '' },
    })).toEqual(expected);
    expect(normalizeChatMessageMetadata({
      usage: { credits: 3, inputTokens: 1, outputTokens: 2, model: '   ' },
    })).toEqual(expected);
  });

  it('drops malformed usage metadata', () => {
    expect(normalizeChatMessageMetadata({
      usage: { credits: -1, inputTokens: 1, outputTokens: 2 },
    })).toBeUndefined();
    expect(normalizeChatMessageMetadata({
      usage: { credits: 2.5, inputTokens: 1, outputTokens: 2 },
    })).toBeUndefined();
    expect(normalizeChatMessageMetadata({
      usage: { credits: 3, inputTokens: 1 },
    })).toBeUndefined();
    expect(normalizeChatMessageMetadata({
      usage: { credits: Number.POSITIVE_INFINITY, inputTokens: 1, outputTokens: 2 },
    })).toBeUndefined();
    expect(normalizeChatMessageMetadata({
      usage: 'nope',
    })).toBeUndefined();
  });

  it('omits usage from serialized history metadata — the server is authoritative', () => {
    const message: ChatMsg = {
      id: 'msg-1',
      role: 'assistant',
      content: 'Done.',
      usage: { credits: 3, inputTokens: 12_340, outputTokens: 890, model: 'claude-fable-5' },
      toolEvents: [
        {
          callId: 'terminal-1',
          name: 'terminal',
          phase: 'done',
        },
      ],
    };

    expect(serializeChatMessageMetadata(message, () => 0)).toEqual({
      toolEvents: [
        {
          callId: 'terminal-1',
          name: 'terminal',
          phase: 'done',
        },
      ],
    });
  });

  it('includes activity metadata in the history signature', () => {
    const base = {};

    expect(chatMessageMetadataSignature(base)).not.toBe(chatMessageMetadataSignature({
      toolEvents: [
        {
          callId: 'terminal-1',
          name: 'terminal',
          phase: 'done' as const,
          argsPreview: 'pwd',
        },
      ],
    }));
  });
});
