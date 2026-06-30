import { describe, expect, it } from 'vitest';
import {
  filterExploreAgents,
  getExploreStats,
  sortExploreAgents,
  type PublicExploreAgent,
} from './publicAgents';

function agent(id: string, overrides: Partial<PublicExploreAgent> = {}): PublicExploreAgent {
  return {
    id,
    slug: id,
    name: id,
    description: null,
    avatarUrl: null,
    framework: 'openclaw',
    status: 'running',
    messageCount: 0,
    createdAt: '2026-05-14T00:00:00.000Z',
    publicChatEnabled: true,
    owner: { username: null, walletAddress: null },
    ...overrides,
  };
}

describe('public agent explore helpers', () => {
  it('filters by query, framework, and live status', () => {
    const agents = [
      agent('bella', {
        name: 'BellaResearchBot',
        description: 'Real-time blockchain research',
        framework: 'openclaw',
        status: 'active',
      }),
      agent('osler', {
        name: 'Osler Intake',
        description: 'Healthcare intake',
        framework: 'hermes',
        status: 'sleeping',
      }),
    ];

    expect(
      filterExploreAgents(agents, {
        query: 'blockchain',
        framework: 'all',
        liveOnly: true,
      }).map((item) => item.id),
    ).toEqual(['bella']);

    expect(
      filterExploreAgents(agents, {
        query: '',
        framework: 'hermes',
        liveOnly: true,
      }),
    ).toEqual([]);
  });

  it('sorts running and higher-usage agents first', () => {
    const agents = [
      agent('quiet-live', { status: 'running', messageCount: 2 }),
      agent('busy-sleeping', { status: 'sleeping', messageCount: 10_000 }),
      agent('busy-live', { status: 'running', messageCount: 500 }),
    ];

    expect(sortExploreAgents(agents).map((item) => item.id)).toEqual([
      'busy-live',
      'quiet-live',
      'busy-sleeping',
    ]);
  });

  it('keeps priority public agents ahead of high-usage live agents', () => {
    expect(
      sortExploreAgents([
        agent('busy-live', { status: 'running', messageCount: 500 }),
        agent('priority-live', { status: 'running', messageCount: 0, featuredPriority: 100 }),
      ]).map((item) => item.id),
    ).toEqual(['priority-live', 'busy-live']);
  });

  it('summarizes visible public agents for the page header', () => {
    expect(
      getExploreStats([
        agent('a', { status: 'active', messageCount: 12 }),
        agent('b', { status: 'sleeping', messageCount: 5 }),
      ]),
    ).toEqual({ total: 2, live: 1, interactions: 17 });
  });
});
