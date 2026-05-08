import type { CityAgent, CityStatus } from '@/components/city/types';
import { TIER_HEIGHT } from '@/components/city/types';
import {
  BUILDING_BASES,
  pickBase,
  type BuildingBase,
} from '@/components/city/v2/world/Buildings.layout';

export const STATUS_WEIGHT: Record<CityStatus, number> = {
  running: 8_000,
  sleeping: 1_500,
  paused: 900,
  crashed: -2_000,
};

export interface LiveBuildingLayout {
  agentId: string;
  blockId: string;
  base: BuildingBase;
  x: number;
  z: number;
  height: number;
  rotation: number;
  framework: CityAgent['framework'];
  status: CityAgent['status'];
  tier: number;
  mine: boolean;
  rank: number;
}

export interface LiveRouteLayout {
  key: string;
  agentId: string;
  from: [number, number, number];
  to: [number, number, number];
  mid: [number, number, number];
  framework: CityAgent['framework'];
  mine: boolean;
  speed: number;
  phase: number;
}

export interface LiveCityLayout {
  buildings: LiveBuildingLayout[];
  routes: LiveRouteLayout[];
  ownedAgents: CityAgent[];
  visibleAgentIds: Set<string>;
}

export interface LiveCityLayoutOptions {
  maxBuildings?: number;
  routeLimit?: number;
}

const DEFAULT_MAX_BUILDINGS = 72;
const DEFAULT_ROUTE_LIMIT = 18;
const OWNER_WEIGHT = 200_000;

export interface LiveCityBlock {
  id: string;
  x: number;
  z: number;
  cols: number;
  rows: number;
  spacingX: number;
  spacingZ: number;
  padWidth: number;
  padDepth: number;
  heightScale: number;
  accent: 'core' | 'inner' | 'outer';
}

export interface LiveCityRoad {
  key: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: 'cyan' | 'emerald' | 'amber';
}

export const LIVE_CITY_BLOCKS: readonly LiveCityBlock[] = [
  {
    id: 'core-west',
    x: -18,
    z: -14,
    cols: 4,
    rows: 3,
    spacingX: 8,
    spacingZ: 8,
    padWidth: 42,
    padDepth: 34,
    heightScale: 1.24,
    accent: 'core',
  },
  {
    id: 'core-east',
    x: 18,
    z: -10,
    cols: 4,
    rows: 3,
    spacingX: 8,
    spacingZ: 8,
    padWidth: 42,
    padDepth: 34,
    heightScale: 1.18,
    accent: 'core',
  },
  {
    id: 'core-south',
    x: 0,
    z: 20,
    cols: 5,
    rows: 3,
    spacingX: 7,
    spacingZ: 8,
    padWidth: 48,
    padDepth: 32,
    heightScale: 1.08,
    accent: 'core',
  },
  {
    id: 'west-market',
    x: -48,
    z: 18,
    cols: 3,
    rows: 4,
    spacingX: 8,
    spacingZ: 8,
    padWidth: 34,
    padDepth: 44,
    heightScale: 0.92,
    accent: 'inner',
  },
  {
    id: 'east-stack',
    x: 48,
    z: 16,
    cols: 3,
    rows: 4,
    spacingX: 8,
    spacingZ: 8,
    padWidth: 34,
    padDepth: 44,
    heightScale: 1.02,
    accent: 'inner',
  },
  {
    id: 'north-port',
    x: -44,
    z: -42,
    cols: 3,
    rows: 3,
    spacingX: 9,
    spacingZ: 8,
    padWidth: 36,
    padDepth: 34,
    heightScale: 0.86,
    accent: 'inner',
  },
  {
    id: 'north-array',
    x: 44,
    z: -40,
    cols: 3,
    rows: 3,
    spacingX: 9,
    spacingZ: 8,
    padWidth: 36,
    padDepth: 34,
    heightScale: 0.9,
    accent: 'inner',
  },
  {
    id: 'south-left',
    x: -38,
    z: 54,
    cols: 4,
    rows: 2,
    spacingX: 8,
    spacingZ: 8,
    padWidth: 42,
    padDepth: 26,
    heightScale: 0.8,
    accent: 'outer',
  },
  {
    id: 'south-right',
    x: 38,
    z: 56,
    cols: 4,
    rows: 2,
    spacingX: 8,
    spacingZ: 8,
    padWidth: 42,
    padDepth: 26,
    heightScale: 0.82,
    accent: 'outer',
  },
  {
    id: 'far-west',
    x: -72,
    z: -18,
    cols: 2,
    rows: 4,
    spacingX: 9,
    spacingZ: 8,
    padWidth: 28,
    padDepth: 42,
    heightScale: 0.72,
    accent: 'outer',
  },
  {
    id: 'far-east',
    x: 72,
    z: -14,
    cols: 2,
    rows: 4,
    spacingX: 9,
    spacingZ: 8,
    padWidth: 28,
    padDepth: 42,
    heightScale: 0.74,
    accent: 'outer',
  },
];

export const LIVE_CITY_ROADS: readonly LiveCityRoad[] = [
  { key: 'central-spine', x: 0, z: 4, width: 9, depth: 136, color: 'cyan' },
  { key: 'cross-core', x: 0, z: -11, width: 130, depth: 8, color: 'emerald' },
  { key: 'south-cross', x: 0, z: 36, width: 110, depth: 7, color: 'cyan' },
  { key: 'north-cross', x: 0, z: -42, width: 108, depth: 7, color: 'cyan' },
  { key: 'west-lane', x: -56, z: 4, width: 7, depth: 88, color: 'emerald' },
  { key: 'east-lane', x: 56, z: 6, width: 7, depth: 88, color: 'emerald' },
  { key: 'owner-avenue', x: 0, z: 18, width: 72, depth: 5, color: 'amber' },
];

const CORE_BLOCK_IDS = [0, 1, 2] as const;
const INNER_BLOCK_IDS = [3, 4, 5, 6] as const;
const OUTER_BLOCK_IDS = [7, 8, 9, 10] as const;
const LIVE_CITY_HUBS = [
  { x: 0, y: 18, z: -2 },
  { x: -28, y: 14, z: 12 },
  { x: 28, y: 14, z: 10 },
  { x: -18, y: 13, z: -36 },
  { x: 18, y: 13, z: -34 },
  { x: 0, y: 15, z: 34 },
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

export function rankAgentForCity(agent: CityAgent): number {
  const tierScore = agent.tier * 1_200;
  const activityScore = Math.min(
    4_000,
    Math.log10(agent.messageCount + 1) * 1_500,
  );
  return (
    (agent.mine ? OWNER_WEIGHT : 0) +
    STATUS_WEIGHT[agent.status] +
    tierScore +
    activityScore
  );
}

export function selectRenderedAgents(
  agents: CityAgent[],
  maxBuildings = DEFAULT_MAX_BUILDINGS,
): CityAgent[] {
  const owned = agents.filter((agent) => agent.mine);
  const byRank = [...agents].sort((a, b) => {
    const rankDiff = rankAgentForCity(b) - rankAgentForCity(a);
    if (rankDiff !== 0) return rankDiff;
    return a.id.localeCompare(b.id);
  });

  const selected = new Map<string, CityAgent>();
  for (const agent of owned) selected.set(agent.id, agent);
  for (const agent of byRank) {
    if (selected.size >= maxBuildings) break;
    selected.set(agent.id, agent);
  }
  return [...selected.values()].sort((a, b) => {
    const rankDiff = rankAgentForCity(b) - rankAgentForCity(a);
    if (rankDiff !== 0) return rankDiff;
    return a.id.localeCompare(b.id);
  });
}

export function selectRouteAgents(
  agents: CityAgent[],
  limit = DEFAULT_ROUTE_LIMIT,
): CityAgent[] {
  if (limit <= 0) return [];
  return [...agents]
    .filter(
      (agent) =>
        agent.status === 'running' || agent.mine || agent.messageCount > 0,
    )
    .sort((a, b) => {
      const rankDiff = rankAgentForCity(b) - rankAgentForCity(a);
      if (rankDiff !== 0) return rankDiff;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

function chooseBlock(index: number, count: number, agentId: string) {
  const coreCount = Math.min(count, 27);
  const innerCount = Math.min(Math.max(count - coreCount, 0), 40);

  let ids: readonly number[];
  let localIndex: number;
  if (index < coreCount) {
    ids = CORE_BLOCK_IDS;
    localIndex = index;
  } else if (index < coreCount + innerCount) {
    ids = INNER_BLOCK_IDS;
    localIndex = index - coreCount;
  } else {
    ids = OUTER_BLOCK_IDS;
    localIndex = index - coreCount - innerCount;
  }

  const offset = Math.floor(hashStr(`${agentId}:block`) * ids.length);
  const blockIndex = ids[(localIndex + offset) % ids.length] ?? ids[0]!;
  const slot = Math.floor(localIndex / ids.length);
  return { block: LIVE_CITY_BLOCKS[blockIndex]!, slot };
}

function blockPosition(index: number, count: number, agentId: string) {
  const { block, slot } = chooseBlock(index, count, agentId);
  const col = slot % block.cols;
  const row = Math.floor(slot / block.cols);
  const width = Math.max(1, block.cols - 1) * block.spacingX;
  const depth = Math.max(1, block.rows - 1) * block.spacingZ;
  const x =
    block.x +
    col * block.spacingX -
    width / 2 +
    (hashStr(`${agentId}:x`) - 0.5) * 2.1;
  const z =
    block.z +
    row * block.spacingZ -
    depth / 2 +
    (hashStr(`${agentId}:z`) - 0.5) * 2.1;
  return { block, x, z };
}

function buildingHeight(agent: CityAgent, block: LiveCityBlock) {
  const base = TIER_HEIGHT[agent.tier] ?? TIER_HEIGHT[0] ?? 3;
  const activityBoost = Math.min(8, Math.log10(agent.messageCount + 1) * 2);
  const statusBoost =
    agent.status === 'running' ? 1.8 : agent.status === 'crashed' ? -1.4 : 0;
  return Math.max(
    2.5,
    (base * (agent.mine ? 1.18 : 1) + activityBoost + statusBoost) *
      block.heightScale,
  );
}

export function layoutLiveCity(
  agents: CityAgent[],
  options: LiveCityLayoutOptions = {},
): LiveCityLayout {
  const maxBuildings = options.maxBuildings ?? DEFAULT_MAX_BUILDINGS;
  const routeLimit = options.routeLimit ?? DEFAULT_ROUTE_LIMIT;
  const renderedAgents = selectRenderedAgents(agents, maxBuildings);
  const buildings = renderedAgents.map((agent, index) => {
    const pos = blockPosition(index, renderedAgents.length, agent.id);
    return {
      agentId: agent.id,
      blockId: pos.block.id,
      base: pickBase(agent.id, agent.tier),
      x: pos.x,
      z: pos.z,
      height: buildingHeight(agent, pos.block),
      rotation: hashStr(`${agent.id}:rotation`) * Math.PI * 2,
      framework: agent.framework,
      status: agent.status,
      tier: agent.tier,
      mine: agent.mine,
      rank: rankAgentForCity(agent),
    };
  });

  const byId = new Map(
    buildings.map((building) => [building.agentId, building]),
  );
  const routeAgents = selectRouteAgents(renderedAgents, routeLimit);
  const routes = routeAgents.flatMap((agent, index) => {
    const source = byId.get(agent.id);
    if (!source) return [];
    const hub =
      LIVE_CITY_HUBS[index % LIVE_CITY_HUBS.length] ?? LIVE_CITY_HUBS[0]!;
    const targetX = agent.mine ? 0 : hub.x;
    const targetY = agent.mine ? 18 : hub.y;
    const targetZ = agent.mine ? -2 : hub.z;
    return [
      {
        key: `${agent.id}-${index}`,
        agentId: agent.id,
        from: [source.x, Math.min(source.height + 2.8, 24), source.z] as [
          number,
          number,
          number,
        ],
        to: [targetX, targetY, targetZ] as [number, number, number],
        mid: [
          (source.x + targetX) / 2 + Math.sin(index * 2.31) * 5,
          Math.min(30, Math.max(source.height + 5, targetY + 5)),
          (source.z + targetZ) / 2 + Math.cos(index * 1.63) * 5,
        ] as [number, number, number],
        framework: agent.framework,
        mine: agent.mine,
        speed: 0.036 + (index % 6) * 0.006,
        phase: ((index * 37) % 100) / 100,
      },
    ];
  });

  return {
    buildings,
    routes,
    ownedAgents: agents.filter((agent) => agent.mine),
    visibleAgentIds: new Set(buildings.map((building) => building.agentId)),
  };
}

export function allKnownBuildingBases(): readonly BuildingBase[] {
  return BUILDING_BASES;
}
