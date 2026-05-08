import type { CityAgent, CityStatus } from '@/components/city/types';
import { TIER_HEIGHT } from '@/components/city/types';
import {
  BUILDING_BASES,
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
  ownerKey: string;
  ownerUsername: string | null;
  agentIds: string[];
  activeAgentIds: string[];
  agentCount: number;
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

export interface LiveAgentMarkerLayout {
  agentId: string;
  blockId: string;
  x: number;
  z: number;
  height: number;
  width: number;
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
  markers: LiveAgentMarkerLayout[];
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
const CITY_CENTER_Z = 8;

export const LIVE_CITY_BOUNDS = {
  width: 220,
  depth: 188,
  centerZ: CITY_CENTER_Z,
} as const;

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
  kind: 'vertical' | 'horizontal';
}

const ROAD_XS = [-88, -52, -16, 20, 56, 92] as const;
const ROAD_ZS = [-76, -42, -8, 26, 60, 94] as const;
const BLOCK_XS = [-70, -34, 2, 38, 74] as const;
const BLOCK_ZS = [-58, -24, 10, 44, 78] as const;

function blockAccent(x: number, z: number): LiveCityBlock['accent'] {
  const distance = Math.hypot(x / 128, (z - CITY_CENTER_Z) / 124);
  if (distance < 0.55) return 'core';
  if (distance < 1.08) return 'inner';
  return 'outer';
}

export const LIVE_CITY_BLOCKS: readonly LiveCityBlock[] = BLOCK_ZS.flatMap(
  (z, row) =>
    BLOCK_XS.map((x, col) => {
      const accent = blockAccent(x, z);
      const capacityBoost = accent === 'core' ? 1 : 0;
      return {
        id: `block-${row}-${col}`,
        x,
        z,
        cols: 6 + capacityBoost,
        rows: 6,
        spacingX: accent === 'core' ? 5.9 : 5.55,
        spacingZ: accent === 'core' ? 5.7 : 5.35,
        padWidth: 31,
        padDepth: 29,
        heightScale: accent === 'core' ? 1.16 : accent === 'inner' ? 0.98 : 0.82,
        accent,
      } satisfies LiveCityBlock;
    }),
).sort((a, b) => {
  const distanceA = Math.hypot(a.x / 128, (a.z - CITY_CENTER_Z) / 124);
  const distanceB = Math.hypot(b.x / 128, (b.z - CITY_CENTER_Z) / 124);
  return distanceA - distanceB;
});

export const LIVE_CITY_ROADS: readonly LiveCityRoad[] = [
  ...ROAD_XS.map((x) => ({
    key: `avenue-${x}`,
    x,
    z: CITY_CENTER_Z,
    width: Math.abs(x - 20) <= 36 ? 7.2 : 6.4,
    depth: 172,
    kind: 'vertical' as const,
  })),
  ...ROAD_ZS.map((z) => ({
    key: `street-${z}`,
    x: 0,
    z,
    width: 204,
    depth: Math.abs(z - CITY_CENTER_Z) === 18 ? 7.2 : 6.4,
    kind: 'horizontal' as const,
  })),
];

const LIVE_CITY_HUBS = [
  { x: 0, y: 18, z: -2 },
  { x: -28, y: 14, z: 12 },
  { x: 28, y: 14, z: 10 },
  { x: -18, y: 13, z: -36 },
  { x: 18, y: 13, z: -34 },
  { x: 0, y: 15, z: 34 },
];

interface LiveUserCluster {
  ownerKey: string;
  ownerUsername: string | null;
  agents: CityAgent[];
  activeAgents: CityAgent[];
  representative: CityAgent;
  framework: CityAgent['framework'];
  status: CityAgent['status'];
  tier: number;
  mine: boolean;
  messageCount: number;
  rank: number;
}

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

function ownerKeyFor(agent: CityAgent): string {
  return agent.ownerKey || `agent:${agent.id}`;
}

function ownerUsernameFor(agents: CityAgent[]): string | null {
  const username = agents.find((agent) =>
    agent.ownerUsername?.trim(),
  )?.ownerUsername;
  return username?.trim() || null;
}

function dominantFramework(agents: CityAgent[]): CityAgent['framework'] {
  let openclaw = 0;
  let hermes = 0;
  for (const agent of agents) {
    if (agent.framework === 'hermes') hermes++;
    else openclaw++;
  }
  return hermes > openclaw ? 'hermes' : 'openclaw';
}

function aggregateStatus(agents: CityAgent[]): CityAgent['status'] {
  if (agents.some((agent) => agent.status === 'running')) return 'running';
  if (agents.some((agent) => agent.status === 'crashed')) return 'crashed';
  if (agents.some((agent) => agent.status === 'paused')) return 'paused';
  return 'sleeping';
}

function clusterRank(cluster: Omit<LiveUserCluster, 'rank'>): number {
  const tierScore = cluster.tier * 3_000;
  const activityScore = Math.min(
    8_000,
    Math.log10(cluster.messageCount + 1) * 2_200,
  );
  return (
    (cluster.mine ? OWNER_WEIGHT : 0) +
    STATUS_WEIGHT[cluster.status] +
    tierScore +
    activityScore +
    cluster.activeAgents.length * 1_100 +
    Math.min(2_500, cluster.agents.length * 180)
  );
}

function clusterAgentsByOwner(agents: CityAgent[]): LiveUserCluster[] {
  const byOwner = new Map<string, CityAgent[]>();
  for (const agent of agents) {
    const key = ownerKeyFor(agent);
    const bucket = byOwner.get(key) ?? [];
    bucket.push(agent);
    byOwner.set(key, bucket);
  }

  return [...byOwner.entries()]
    .map(([ownerKey, ownerAgents]) => {
      const sorted = [...ownerAgents].sort((a, b) => {
        const rankDiff = rankAgentForCity(b) - rankAgentForCity(a);
        if (rankDiff !== 0) return rankDiff;
        return a.id.localeCompare(b.id);
      });
      const activeAgents = sorted.filter((agent) => agent.status === 'running');
      const representative = sorted[0]!;
      const clusterBase = {
        ownerKey,
        ownerUsername: ownerUsernameFor(sorted),
        agents: sorted,
        activeAgents,
        representative,
        framework: dominantFramework(sorted),
        status: aggregateStatus(sorted),
        tier: Math.max(...sorted.map((agent) => agent.tier)),
        mine: sorted.some((agent) => agent.mine),
        messageCount: sorted.reduce(
          (sum, agent) => sum + agent.messageCount,
          0,
        ),
      };
      return { ...clusterBase, rank: clusterRank(clusterBase) };
    })
    .sort((a, b) => {
      const rankDiff = b.rank - a.rank;
      if (rankDiff !== 0) return rankDiff;
      return a.ownerKey.localeCompare(b.ownerKey);
    });
}

function selectRenderedOwners(
  agents: CityAgent[],
  maxBuildings = DEFAULT_MAX_BUILDINGS,
): LiveUserCluster[] {
  const clusters = clusterAgentsByOwner(agents);
  if (clusters.length <= maxBuildings) return clusters;

  const owned = clusters.filter((cluster) => cluster.mine);
  const selected = new Map<string, LiveUserCluster>();
  for (const cluster of owned) selected.set(cluster.ownerKey, cluster);
  for (const cluster of clusters) {
    if (selected.size >= maxBuildings) break;
    selected.set(cluster.ownerKey, cluster);
  }
  return [...selected.values()].sort((a, b) => {
    const rankDiff = b.rank - a.rank;
    if (rankDiff !== 0) return rankDiff;
    return a.ownerKey.localeCompare(b.ownerKey);
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

function blockCapacity(block: LiveCityBlock): number {
  return block.cols * block.rows;
}

function chooseBlock(index: number, count: number) {
  const activeBlockCount = Math.min(
    LIVE_CITY_BLOCKS.length,
    Math.max(8, count > 240 ? LIVE_CITY_BLOCKS.length : Math.ceil(count / 22)),
  );
  const activeBlocks = LIVE_CITY_BLOCKS.slice(0, activeBlockCount);
  const block = activeBlocks[index % activeBlocks.length] ?? activeBlocks[0]!;
  const slot = Math.floor(index / activeBlocks.length);

  if (slot < blockCapacity(block)) return { block, slot };

  let remaining = index;
  for (const overflowBlock of LIVE_CITY_BLOCKS) {
    const capacity = blockCapacity(overflowBlock);
    if (remaining < capacity) return { block: overflowBlock, slot: remaining };
    remaining -= capacity;
  }

  const fallbackBlock =
    LIVE_CITY_BLOCKS[index % LIVE_CITY_BLOCKS.length] ?? LIVE_CITY_BLOCKS[0]!;
  return {
    block: fallbackBlock,
    slot: index % blockCapacity(fallbackBlock),
  };
}

function blockPosition(index: number, count: number, agentId: string) {
  const { block, slot } = chooseBlock(index, count);
  const col = slot % block.cols;
  const row = Math.floor(slot / block.cols);
  const width = Math.max(1, block.cols - 1) * block.spacingX;
  const depth = Math.max(1, block.rows - 1) * block.spacingZ;
  const x =
    block.x +
    col * block.spacingX -
    width / 2 +
    (hashStr(`${agentId}:x`) - 0.5) * 1.35;
  const z =
    block.z +
    row * block.spacingZ -
    depth / 2 +
    (hashStr(`${agentId}:z`) - 0.5) * 1.25;
  return { block, x, z };
}

function pickLiveBase(ownerKey: string, tier: number): BuildingBase {
  const r = hashStr(`${ownerKey}:live-base`);
  const small = BUILDING_BASES.filter((b) => b.startsWith('small-building-'));
  const medium = BUILDING_BASES.filter((b) => b.startsWith('medium-building-'));
  const skyscrapers = BUILDING_BASES.filter((b) => b.startsWith('skyscraper-'));

  if (tier <= 0) return small[Math.floor(r * small.length)]!;
  if (tier === 1) {
    const options = [...small, ...medium];
    return options[Math.floor(r * options.length)]!;
  }
  if (tier === 2) return medium[Math.floor(r * medium.length)]!;
  if (tier === 3) {
    const options = [...medium, ...skyscrapers];
    return options[Math.floor(r * options.length)]!;
  }
  return skyscrapers[Math.floor(r * skyscrapers.length)]!;
}

function buildingHeight(cluster: LiveUserCluster, block: LiveCityBlock) {
  const base = TIER_HEIGHT[cluster.tier] ?? TIER_HEIGHT[0] ?? 3;
  const activityBoost = Math.min(4.4, Math.log10(cluster.messageCount + 1) * 1.1);
  const fleetBoost = Math.min(4.2, Math.log2(cluster.agents.length + 1) * 0.85);
  const statusBoost =
    cluster.status === 'running'
      ? 1.2
      : cluster.status === 'crashed'
        ? -1.1
        : 0;
  return Math.max(
    3,
    (base * (cluster.mine ? 1.18 : 1) +
      activityBoost +
      fleetBoost +
      statusBoost) *
      block.heightScale,
  );
}

function markerHeight(agent: CityAgent) {
  const activityBoost = Math.min(
    1.25,
    Math.log10(agent.messageCount + 1) * 0.34,
  );
  return Math.min(5.2, 1.8 + agent.tier * 0.38 + activityBoost);
}

function markerWidth(agent: CityAgent) {
  if (agent.mine) return 1.32;
  if (agent.status === 'running') return 1.02;
  if (agent.status === 'paused') return 0.72;
  return 0.62;
}

function layoutAgentMarkers(
  clusters: LiveUserCluster[],
  buildingsByOwner: Map<string, LiveBuildingLayout>,
): LiveAgentMarkerLayout[] {
  return clusters.flatMap((cluster) => {
    const building = buildingsByOwner.get(cluster.ownerKey);
    if (!building) return [];

    return cluster.activeAgents.map((agent, localIndex) => {
      const angle =
        (localIndex / Math.max(1, cluster.activeAgents.length)) * Math.PI * 2 +
        hashStr(`${agent.id}:active-angle`) * 0.65;
      const radius =
        6.4 +
        Math.min(5.2, cluster.agents.length * 0.24) +
        hashStr(`${agent.id}:active-radius`) * 2.2;
      return {
        agentId: agent.id,
        blockId: building.blockId,
        x: building.x + Math.cos(angle) * radius,
        z: building.z + Math.sin(angle) * radius,
        height: markerHeight(agent),
        width: markerWidth(agent),
        framework: agent.framework,
        status: agent.status,
        tier: agent.tier,
        mine: agent.mine,
        rank: rankAgentForCity(agent),
      };
    });
  });
}

export function layoutLiveCity(
  agents: CityAgent[],
  options: LiveCityLayoutOptions = {},
): LiveCityLayout {
  const maxBuildings = options.maxBuildings ?? DEFAULT_MAX_BUILDINGS;
  const routeLimit = options.routeLimit ?? DEFAULT_ROUTE_LIMIT;
  const renderedClusters = selectRenderedOwners(agents, maxBuildings);
  const buildings = renderedClusters.map((cluster, index) => {
    const pos = blockPosition(index, renderedClusters.length, cluster.ownerKey);
    return {
      agentId: cluster.representative.id,
      ownerKey: cluster.ownerKey,
      ownerUsername: cluster.ownerUsername,
      agentIds: cluster.agents.map((agent) => agent.id),
      activeAgentIds: cluster.activeAgents.map((agent) => agent.id),
      agentCount: cluster.agents.length,
      blockId: pos.block.id,
      base: pickLiveBase(cluster.ownerKey, cluster.tier),
      x: pos.x,
      z: pos.z,
      height: buildingHeight(cluster, pos.block),
      rotation:
        Math.round(hashStr(`${cluster.ownerKey}:rotation`) * 3) *
          (Math.PI / 2) +
        (hashStr(`${cluster.ownerKey}:rotation-jitter`) - 0.5) * 0.1,
      framework: cluster.framework,
      status: cluster.status,
      tier: cluster.tier,
      mine: cluster.mine,
      rank: cluster.rank,
    };
  });

  const byOwner = new Map(
    buildings.map((building) => [building.ownerKey, building]),
  );
  const markers = layoutAgentMarkers(renderedClusters, byOwner);
  const routeAgents = selectRouteAgents(
    renderedClusters.flatMap((cluster) =>
      cluster.activeAgents.length
        ? cluster.activeAgents
        : [cluster.representative],
    ),
    routeLimit,
  );
  const routes = routeAgents.flatMap((agent, index) => {
    const source = byOwner.get(ownerKeyFor(agent));
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
    markers,
    routes,
    ownedAgents: agents.filter((agent) => agent.mine),
    visibleAgentIds: new Set([
      ...buildings.flatMap((building) => building.agentIds),
      ...markers.map((marker) => marker.agentId),
    ]),
  };
}

export function allKnownBuildingBases(): readonly BuildingBase[] {
  return BUILDING_BASES;
}
