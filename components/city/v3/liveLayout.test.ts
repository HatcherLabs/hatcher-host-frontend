import { describe, expect, it } from 'vitest';
import type { CityAgent } from '@/components/city/types';
import {
  layoutLiveCity,
  rankAgentForCity,
  selectRouteAgents,
  STATUS_WEIGHT,
} from './liveLayout';

function mkAgent(
  id: string,
  overrides: Partial<CityAgent> = {},
): CityAgent {
  return {
    id,
    slug: id,
    name: id,
    avatarUrl: null,
    framework: 'openclaw',
    category: 'automation',
    tier: 1,
    status: 'sleeping',
    messageCount: 0,
    mine: false,
    ...overrides,
  };
}

describe('rankAgentForCity', () => {
  it('prioritizes owned agents over public agents', () => {
    const owned = mkAgent('owned', { mine: true, status: 'sleeping', messageCount: 0 });
    const publicActive = mkAgent('public', { mine: false, status: 'running', messageCount: 500 });

    expect(rankAgentForCity(owned)).toBeGreaterThan(rankAgentForCity(publicActive));
  });

  it('uses status, tier, and message count for public ranking', () => {
    const running = mkAgent('running', { status: 'running' });
    const crashed = mkAgent('crashed', { status: 'crashed' });
    const highTier = mkAgent('high-tier', { tier: 4 });
    const lowTier = mkAgent('low-tier', { tier: 0 });
    const busy = mkAgent('busy', { messageCount: 200 });
    const quiet = mkAgent('quiet', { messageCount: 1 });

    expect(rankAgentForCity(running)).toBeGreaterThan(rankAgentForCity(crashed));
    expect(rankAgentForCity(highTier)).toBeGreaterThan(rankAgentForCity(lowTier));
    expect(rankAgentForCity(busy)).toBeGreaterThan(rankAgentForCity(quiet));
    expect(STATUS_WEIGHT.running).toBeGreaterThan(STATUS_WEIGHT.sleeping);
  });
});

describe('layoutLiveCity', () => {
  it('is deterministic for the same agent list', () => {
    const agents = [
      mkAgent('a', { mine: true, tier: 4, status: 'running' }),
      mkAgent('b', { tier: 2, messageCount: 100 }),
      mkAgent('c', { framework: 'hermes', tier: 1 }),
    ];

    expect(layoutLiveCity(agents, { routeLimit: 8 })).toEqual(
      layoutLiveCity(agents, { routeLimit: 8 }),
    );
  });

  it('keeps owned agents in the rendered hero set even when many public agents exist', () => {
    const publicAgents = Array.from({ length: 80 }, (_, i) =>
      mkAgent(`public-${i}`, { status: 'running', messageCount: 1000 + i, tier: 4 }),
    );
    const owned = mkAgent('mine', { mine: true, status: 'sleeping', tier: 1 });

    const layout = layoutLiveCity([...publicAgents, owned], { maxBuildings: 24, routeLimit: 8 });

    expect(layout.buildings.some((b) => b.agentId === 'mine')).toBe(true);
    expect(layout.ownedAgents.map((a) => a.id)).toContain('mine');
    expect(layout.buildings.length).toBeLessThanOrEqual(24);
  });

  it('caps live routes by option', () => {
    const agents = Array.from({ length: 30 }, (_, i) =>
      mkAgent(`agent-${i}`, { status: 'running', messageCount: i * 10 }),
    );

    expect(selectRouteAgents(agents, 10)).toHaveLength(10);
    expect(selectRouteAgents(agents, 0)).toHaveLength(0);
  });
});
