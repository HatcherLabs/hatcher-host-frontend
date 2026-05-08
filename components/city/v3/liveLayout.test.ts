import { describe, expect, it } from 'vitest';
import type { CityAgent } from '@/components/city/types';
import {
  LIVE_CITY_BOUNDS,
  layoutLiveCity,
  rankAgentForCity,
  selectRouteAgents,
  STATUS_WEIGHT,
} from './liveLayout';

type AgentOverrides = Partial<CityAgent> & {
  ownerKey?: string;
  ownerUsername?: string;
};

function mkAgent(id: string, overrides: AgentOverrides = {}): CityAgent {
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

  it('aggregates each owner fleet into one user building', () => {
    const layout = layoutLiveCity(
      [
        mkAgent('owner-a-running', {
          ownerKey: 'owner-a',
          ownerUsername: 'cristian',
          status: 'running',
          tier: 2,
          messageCount: 50,
        }),
        mkAgent('owner-a-sleeping', {
          ownerKey: 'owner-a',
          ownerUsername: 'cristian',
          status: 'sleeping',
          tier: 4,
          messageCount: 200,
        }),
        mkAgent('owner-b-agent', {
          ownerKey: 'owner-b',
          ownerUsername: 'maria',
          status: 'sleeping',
          tier: 1,
          messageCount: 8,
        }),
      ],
      { maxBuildings: 10, routeLimit: 4 },
    );

    expect(layout.buildings).toHaveLength(2);
    expect(
      layout.buildings.map((building) => building.ownerKey).sort(),
    ).toEqual(['owner-a', 'owner-b']);
    expect(
      layout.buildings.find((building) => building.ownerKey === 'owner-a')
        ?.agentCount,
    ).toBe(2);
    expect(
      layout.buildings.find((building) => building.ownerKey === 'owner-a')
        ?.tier,
    ).toBe(4);
    expect(
      layout.buildings.find((building) => building.ownerKey === 'owner-a')
        ?.ownerUsername,
    ).toBe('cristian');
    expect(
      layout.buildings.find((building) => building.ownerKey === 'owner-b')
        ?.ownerUsername,
    ).toBe('maria');
  });

  it('renders only active agents as city markers around user buildings', () => {
    const layout = layoutLiveCity(
      [
        mkAgent('active-a', {
          ownerKey: 'owner-a',
          status: 'running',
          tier: 3,
          messageCount: 100,
        }),
        mkAgent('sleeping-a', {
          ownerKey: 'owner-a',
          status: 'sleeping',
          tier: 2,
          messageCount: 40,
        }),
        mkAgent('paused-b', {
          ownerKey: 'owner-b',
          status: 'paused',
          tier: 1,
          messageCount: 12,
        }),
        mkAgent('active-b', {
          ownerKey: 'owner-b',
          status: 'running',
          tier: 1,
          messageCount: 16,
        }),
      ],
      { maxBuildings: 10, routeLimit: 4 },
    );

    expect(layout.markers.map((marker) => marker.agentId).sort()).toEqual([
      'active-a',
      'active-b',
    ]);
    expect(layout.markers.every((marker) => marker.status === 'running')).toBe(
      true,
    );
  });

  it('represents every public agent through an owner building or active marker', () => {
    const agents = Array.from({ length: 700 }, (_, i) =>
      mkAgent(`agent-${i}`, {
        ownerKey: `owner-${i % 70}`,
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

    expect(layout.buildings).toHaveLength(70);
    expect(layout.markers).toHaveLength(78);
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

  it('keeps hundreds of owner buildings inside the expanded city footprint', () => {
    const agents = Array.from({ length: 520 }, (_, i) =>
      mkAgent(`agent-${i}`, {
        ownerKey: `owner-${i}`,
        status: i % 11 === 0 ? 'running' : 'sleeping',
        tier: i % 5,
        messageCount: 20 + i,
      }),
    );

    const layout = layoutLiveCity(agents, {
      maxBuildings: 800,
      routeLimit: 12,
    });
    const halfWidth = LIVE_CITY_BOUNDS.width / 2;
    const minZ = LIVE_CITY_BOUNDS.centerZ - LIVE_CITY_BOUNDS.depth / 2;
    const maxZ = LIVE_CITY_BOUNDS.centerZ + LIVE_CITY_BOUNDS.depth / 2;

    expect(layout.buildings).toHaveLength(520);
    expect(
      layout.buildings.every(
        (building) =>
          Math.abs(building.x) < halfWidth - 8 &&
          building.z > minZ + 8 &&
          building.z < maxZ - 8,
      ),
    ).toBe(true);
  });

  it('uses tier to choose larger building families instead of color coding', () => {
    const layout = layoutLiveCity(
      [
        mkAgent('free-owner', { ownerKey: 'free-owner', tier: 0 }),
        mkAgent('basic-owner', { ownerKey: 'basic-owner', tier: 2 }),
        mkAgent('pro-owner', { ownerKey: 'pro-owner', tier: 4 }),
      ],
      { maxBuildings: 10, routeLimit: 0 },
    );

    const byOwner = new Map(
      layout.buildings.map((building) => [building.ownerKey, building]),
    );

    expect(byOwner.get('free-owner')?.base.startsWith('small-building-')).toBe(
      true,
    );
    expect(byOwner.get('basic-owner')?.base.startsWith('medium-building-')).toBe(
      true,
    );
    expect(byOwner.get('pro-owner')?.base.startsWith('skyscraper-')).toBe(true);
  });

  it('does not render sleeping overflow agents as loose markers', () => {
    const agents = Array.from({ length: 240 }, (_, i) =>
      mkAgent(`agent-${i}`, {
        ownerKey: `owner-${i % 40}`,
        status: i % 5 === 0 ? 'running' : 'sleeping',
        tier: i % 5,
        messageCount: i,
      }),
    );

    const layout = layoutLiveCity(agents, { maxBuildings: 80, routeLimit: 12 });

    expect(layout.buildings).toHaveLength(40);
    expect(layout.markers).toHaveLength(48);
    expect(layout.markers.every((marker) => marker.status === 'running')).toBe(
      true,
    );
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
