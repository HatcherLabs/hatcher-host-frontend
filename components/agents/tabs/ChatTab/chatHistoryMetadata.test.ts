import { describe, expect, it } from 'vitest';
import {
  chatMessageMetadataSignature,
  normalizeChatMessageMetadata,
  serializeChatMessageMetadata,
} from './chatHistoryMetadata';

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
