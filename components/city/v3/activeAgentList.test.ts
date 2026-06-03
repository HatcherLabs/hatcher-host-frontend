import { describe, expect, it } from 'vitest';
import type { LiveAgentMarkerLayout } from './liveLayout';
import { publicAgentChatHref, selectActiveCityAgents } from './activeAgentList';

function marker(id: string, overrides: Partial<LiveAgentMarkerLayout> = {}): LiveAgentMarkerLayout {
  return {
    agentId: id,
    agentName: id,
    ownerKey: `owner-${id}`,
    ownerUsername: 'Builder',
    blockId: 'block-1',
    x: 0,
    z: 0,
    height: 1,
    width: 1,
    framework: 'openclaw',
    status: 'running',
    tier: 0,
    mine: false,
    visibility: 'public',
    rank: 1,
    pathNodes: [],
    speed: 1,
    phase: 0,
    ...overrides,
  };
}

describe('active city agent list', () => {
  it('prioritizes public chat agents in the active list', () => {
    const items = selectActiveCityAgents([
      marker('busy-private', { visibility: 'private', rank: 1000 }),
      marker('sleeping-chat', { status: 'sleeping', publicChatEnabled: true, rank: 500 }),
      marker('bella', { agentName: 'BellaResearchBot', publicChatEnabled: true, rank: 1 }),
      marker('busy-public', { rank: 900 }),
    ]);

    expect(items.map((item) => item.agentId)).toEqual([
      'bella',
      'busy-public',
      'busy-private',
    ]);
  });

  it('builds chat links only for public chat enabled public agents', () => {
    expect(publicAgentChatHref(marker('opaque-bella', { agentSlug: 'bella', publicChatEnabled: true }))).toBe(
      '/agent/bella?chat=1',
    );
    expect(publicAgentChatHref(marker('opaque-only', { publicChatEnabled: true }))).toBeNull();
    expect(publicAgentChatHref(marker('private', { visibility: 'private', publicChatEnabled: true }))).toBeNull();
    expect(publicAgentChatHref(marker('disabled', { publicChatEnabled: false }))).toBeNull();
  });
});
