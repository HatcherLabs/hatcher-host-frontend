import { describe, expect, it } from 'vitest';
import { buildChatActivityRows } from './chatActivityRows';

describe('buildChatActivityRows', () => {
  it('builds Virtuals-style conversation activity rows for thinking and tools', () => {
    expect(buildChatActivityRows({
      showThinking: true,
      showToolCalls: true,
      thinking: {
        content: '',
        streaming: false,
        label: 'Thinking',
        startedAt: 1_000,
        endedAt: 2_500,
      },
      toolEvents: [
        {
          callId: 'search-1',
          name: 'web_search',
          phase: 'done',
          argsPreview: 'BTC bitcoin price USD today',
          resultPreview: '{"results":[{"title":"BTC price"}]}',
        },
        {
          callId: 'terminal-1',
          name: 'terminal',
          phase: 'start',
          argsPreview: 'acp job list --json',
        },
      ],
    })).toEqual([
      {
        id: 'thinking',
        kind: 'thinking',
        label: 'Thought for 1.5s',
        phase: 'done',
      },
      {
        id: 'tool-search-1',
        kind: 'search',
        label: 'Searched "BTC bitcoin price USD today"',
        phase: 'done',
        detail: 'BTC bitcoin price USD today',
        sections: [
          {
            label: 'ARGUMENTS · WEB SEARCH',
            content: 'BTC bitcoin price USD today',
          },
          {
            label: 'RESULT',
            content: '{"results":[{"title":"BTC price"}]}',
          },
        ],
      },
      {
        id: 'tool-terminal-1',
        kind: 'terminal',
        label: 'Ran "acp job list --json"',
        phase: 'running',
        detail: 'acp job list --json',
        sections: [
          {
            label: 'ARGUMENTS · TERMINAL',
            content: 'acp job list --json',
          },
        ],
      },
    ]);
  });

  it('respects thinking and tool-call display toggles', () => {
    expect(buildChatActivityRows({
      showThinking: false,
      showToolCalls: false,
      thinking: {
        content: '',
        streaming: true,
        startedAt: 1_000,
      },
      toolEvents: [
        {
          callId: 'terminal-1',
          name: 'terminal',
          phase: 'start',
          argsPreview: 'pwd',
        },
      ],
    })).toEqual([]);
  });

  it('labels platform market-data lookups as visible tool activity', () => {
    expect(buildChatActivityRows({
      showThinking: false,
      showToolCalls: true,
      toolEvents: [
        {
          callId: 'market-data',
          name: 'market_data',
          phase: 'done',
          argsPreview: 'poti verifica pe internet pretul solana?',
          resultPreview: '{"asset":"SOL","priceUsd":139.41,"source":"CoinGecko"}',
        },
      ],
    })).toEqual([
      {
        id: 'tool-market-data',
        kind: 'search',
        label: 'Checked market data "poti verifica pe internet pretul solana?"',
        phase: 'done',
        detail: 'poti verifica pe internet pretul solana?',
        sections: [
          {
            label: 'ARGUMENTS · MARKET DATA',
            content: 'poti verifica pe internet pretul solana?',
          },
          {
            label: 'RESULT',
            content: '{"asset":"SOL","priceUsd":139.41,"source":"CoinGecko"}',
          },
        ],
      },
    ]);
  });

  it('labels unavailable agent runtime as visible tool activity', () => {
    expect(buildChatActivityRows({
      showThinking: false,
      showToolCalls: true,
      toolEvents: [
        {
          callId: 'agent-runtime',
          name: 'agent_runtime',
          phase: 'done',
          argsPreview: '{"reason":"container-proxy-failed","request":"list files"}',
          resultPreview: '{"status":"unavailable","reason":"container-proxy-failed","error":"timeout"}',
        },
      ],
    })).toEqual([
      {
        id: 'tool-agent-runtime',
        kind: 'tool',
        label: 'Agent runtime unavailable',
        phase: 'done',
        detail: '{"reason":"container-proxy-failed","request":"list files"}',
        sections: [
          {
            label: 'ARGUMENTS · RUNTIME',
            content: '{"reason":"container-proxy-failed","request":"list files"}',
          },
          {
            label: 'RESULT',
            content: '{"status":"unavailable","reason":"container-proxy-failed","error":"timeout"}',
          },
        ],
      },
    ]);
  });

  it('truncates long collapsed tool labels while keeping full expandable content', () => {
    const longCommand = 'python3 scripts/reconcile-wallet-activity.ts --agent cmqtjd9tl001as1to6xp4fpyj --network mainnet --include-transfers --include-swaps --write-json /tmp/reconcile-wallet-activity-output.json';

    const rows = buildChatActivityRows({
      showThinking: false,
      showToolCalls: true,
      toolEvents: [
        {
          callId: 'terminal-long',
          name: 'terminal',
          phase: 'start',
          argsPreview: longCommand,
        },
      ],
    });

    expect(rows[0]?.label).toBe(
      'Ran "python3 scripts/reconcile-wallet-activity.ts --agent cmqtjd9tl001as1to6xp4fpyj --network mainnet..."',
    );
    expect(rows[0]?.detail).toBe(longCommand);
    expect(rows[0]?.sections?.[0]?.content).toBe(longCommand);
  });
});
