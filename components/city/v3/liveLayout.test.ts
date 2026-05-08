import { describe, expect, it } from 'vitest';
import type { CityAgent } from '@/components/city/types';
import {
  layoutLiveCity,
  rankAgentForCity,
  selectRouteAgents,
  STATUS_WEIGHT,
} from './liveLayout';

function mkAgent(id: string, overrides: Partial<CityAgent> = {}): CityAgent {
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
    const owned = mkAgent('owned', {
      mine: true,
      status: 'sleeping',
      messageCount: 0,
    });
    const publicActive = mkAgent('public', {
      mine: false,
      status: 'running',
      messageCount: 500,
    });

    expect(rankAgentForCity(owned)).toBeGreaterThan(
      rankAgentForCity(publicActive),
    );
  });

  it('uses status, tier, and message count for public ranking', () => {
    const running = mkAgent('running', { status: 'running' });
    const crashed = mkAgent('crashed', { status: 'crashed' });
    const highTier = mkAgent('high-tier', { tier: 4 });
    const lowTier = mkAgent('low-tier', { tier: 0 });
    const busy = mkAgent('busy', { messageCount: 200 });
    const quiet = mkAgent('quiet', { messageCount: 1 });

    expect(rankAgentForCity(running)).toBeGreaterThan(
      rankAgentForCity(crashed),
    );
    expect(rankAgentForCity(highTier)).toBeGreaterThan(
      rankAgentForCity(lowTier),
    );
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
      mkAgent(`public-${i}`, {
        status: 'running',
        messageCount: 1000 + i,
        tier: 4,
      }),
    );
    const owned = mkAgent('mine', { mine: true, status: 'sleeping', tier: 1 });

    const layout = layoutLiveCity([...publicAgents, owned], {
      maxBuildings: 24,
      routeLimit: 8,
    });

    expect(layout.buildings.some((b) => b.agentId === 'mine')).toBe(true);
    expect(layout.ownedAgents.map((a) => a.id)).toContain('mine');
    expect(layout.buildings.length).toBeLessThanOrEqual(24);
  });

  it('represents every public agent with either a building or marker', () => {
    const agents = Array.from({ length: 700 }, (_, i) =>
      mkAgent(`agent-${i}`, {
        framework: i % 2 === 0 ? 'openclaw' : 'hermes',
        status: i % 9 === 0 ? 'running' : 'sleeping',
        tier: i % 5,
        messageCount: i * 3,
      }),
    );

    const layout = layoutLiveCity(agents, {
      maxBuildings: 180,
      routeLimit: 14,
    });

    expect(layout.buildings).toHaveLength(180);
    expect(layout.markers).toHaveLength(520);
    expect(layout.visibleAgentIds.size).toBe(700);
    expect(agents.every((agent) => layout.visibleAgentIds.has(agent.id))).toBe(
      true,
    );
  });

  it('caps live routes by option', () => {
    const agents = Array.from({ length: 30 }, (_, i) =>
      mkAgent(`agent-${i}`, { status: 'running', messageCount: i * 10 }),
    );

    expect(selectRouteAgents(agents, 10)).toHaveLength(10);
    expect(selectRouteAgents(agents, 0)).toHaveLength(0);
  });

  it('spreads buildings across city blocks instead of linear rows', () => {
    const agents = Array.from({ length: 72 }, (_, i) =>
      mkAgent(`agent-${i}`, {
        status: i % 4 === 0 ? 'running' : 'sleeping',
        tier: i % 5,
        messageCount: 100 + i,
      }),
    );

    const layout = layoutLiveCity(agents, { maxBuildings: 72, routeLimit: 12 });
    const blockIds = new Set(
      layout.buildings.map((building) => building.blockId),
    );
    const left = layout.buildings.some((building) => building.x < -35);
    const right = layout.buildings.some((building) => building.x > 35);
    const front = layout.buildings.some((building) => building.z > 35);
    const back = layout.buildings.some((building) => building.z < -30);

    expect(blockIds.size).toBeGreaterThanOrEqual(8);
    expect(left).toBe(true);
    expect(right).toBe(true);
    expect(front).toBe(true);
    expect(back).toBe(true);
  });

  it('packs overflow agent markers back into city blocks', () => {
    const agents = Array.from({ length: 240 }, (_, i) =>
      mkAgent(`agent-${i}`, {
        status: i % 5 === 0 ? 'running' : 'sleeping',
        tier: i % 5,
        messageCount: i,
      }),
    );

    const layout = layoutLiveCity(agents, { maxBuildings: 80, routeLimit: 12 });
    const markerBlockIds = new Set(
      layout.markers.map((marker) => marker.blockId),
    );

    expect(layout.markers).toHaveLength(160);
    expect(markerBlockIds.size).toBeGreaterThanOrEqual(8);
    expect(layout.markers.every((marker) => marker.height > 0.6)).toBe(true);
  });

  it('keeps network routes close to the city skyline', () => {
    const agents = Array.from({ length: 20 }, (_, i) =>
      mkAgent(`agent-${i}`, {
        status: 'running',
        tier: 3,
        messageCount: 50 + i,
      }),
    );

    const layout = layoutLiveCity(agents, { routeLimit: 12 });

    expect(layout.routes).toHaveLength(12);
    expect(layout.routes.every((route) => route.to[1] <= 18)).toBe(true);
    expect(layout.routes.every((route) => route.mid[1] <= 30)).toBe(true);
  });
});
