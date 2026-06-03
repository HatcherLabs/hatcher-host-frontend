import type { CityAgent, CityStatus, CityUser } from '@/components/city/types';
import {
  cityGridFor,
  deriveHandoffBuildingVisual,
  hashInt,
  LIVE_CITY_SUPER,
  nodeAt,
  plotPosition,
  spiralOrder,
  tierKeyForCity,
  type HandoffBuildingVisual,
  type LiveCityGrid,
  type LiveCityNode,
  type LiveCityTierKey,
} from './liveCityHandoff';

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
  activeAgentCount: number;
  blockId: string;
  gridX: number;
  gridZ: number;
  x: number;
  z: number;
  height: number;
  rotation: number;
  framework: CityAgent['framework'];
  status: CityAgent['status'];
  tier: number;
  tierKey: LiveCityTierKey;
  visual: HandoffBuildingVisual;
  mine: boolean;
  rank: number;
}

export interface LiveAgentMarkerLayout {
  agentId: string;
  agentSlug?: string | null;
  dashboardAgentId?: string | null;
  agentName: string;
  ownerKey: string;
  ownerUsername: string | null;
  blockId: string;
  x: number;
  z: number;
  height: number;
  width: number;
  framework: CityAgent['framework'];
  status: CityAgent['status'];
  tier: number;
  mine: boolean;
  visibility?: CityAgent['visibility'];
  publicChatEnabled?: boolean;
  avatar?: string | null;
  rank: number;
  pathNodes: LiveCityNode[];
  speed: number;
  phase: number;
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
  grid: LiveCityGrid;
  buildings: LiveBuildingLayout[];
  markers: LiveAgentMarkerLayout[];
  routes: LiveRouteLayout[];
  ownedAgents: CityAgent[];
  visibleAgentIds: Set<string>;
}

export interface LiveCityLayoutOptions {
  maxBuildings?: number;
  routeLimit?: number;
  users?: CityUser[];
}

const DEFAULT_MAX_BUILDINGS = 2_500;
const DEFAULT_ROUTE_LIMIT = 18;
const OWNER_WEIGHT = 200_000;

export const LIVE_CITY_BOUNDS = cityGridFor(DEFAULT_MAX_BUILDINGS).bounds;

function safeTier(agent: Pick<CityAgent, 'tier'>): number {
  return agent.tier ?? 0;
}

function safeMessageCount(agent: Pick<CityAgent, 'messageCount'>): number {
  return agent.messageCount ?? 0;
}

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
  agentCount: number;
  activeAgentCount: number;
  rank: number;
}

function hashStr(s: string): number {
  return hashInt(s) / 0xffffffff;
}

export function rankAgentForCity(agent: CityAgent): number {
  const tierScore = safeTier(agent) * 1_200;
  const activityScore = Math.min(
    4_000,
    Math.log10(safeMessageCount(agent) + 1) * 1_500,
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
    cluster.activeAgentCount * 1_100 +
    Math.min(2_500, cluster.agentCount * 180)
  );
}

function makeUserRepresentative(user: CityUser): CityAgent {
  const ownerUsername = user.ownerUsername?.trim() || null;
  return {
    id: `user-building:${user.ownerKey}`,
    slug: null,
    name: `${ownerUsername || 'Builder'} building`,
    avatarUrl: null,
    framework: 'openclaw',
    category: 'automation',
    ownerKey: user.ownerKey,
    ownerUsername,
    tier: user.tier,
    status: user.activeAgentCount > 0 ? 'running' : 'sleeping',
    messageCount: 0,
    mine: user.mine,
    visibility: 'private',
  };
}

function clusterAgentsByOwner(
  agents: CityAgent[],
  users: CityUser[] = [],
): LiveUserCluster[] {
  const byOwner = new Map<string, CityAgent[]>();
  for (const agent of agents) {
    const key = ownerKeyFor(agent);
    const bucket = byOwner.get(key) ?? [];
    bucket.push(agent);
    byOwner.set(key, bucket);
  }
  const usersByOwner = new Map(users.map((user) => [user.ownerKey, user]));
  const ownerKeys = new Set([...usersByOwner.keys(), ...byOwner.keys()]);

  return [...ownerKeys]
    .map((ownerKey) => {
      const ownerAgents = byOwner.get(ownerKey) ?? [];
      const user = usersByOwner.get(ownerKey);
      const sorted = [...ownerAgents].sort((a, b) => {
        const rankDiff = rankAgentForCity(b) - rankAgentForCity(a);
        if (rankDiff !== 0) return rankDiff;
        return a.id.localeCompare(b.id);
      });
      const activeAgents = sorted.filter((agent) => agent.status === 'running');
      const representative =
        sorted[0] ?? (user ? makeUserRepresentative(user) : null);
      if (!representative) return null;
      const agentCount = user?.agentCount ?? sorted.length;
      const activeAgentCount = user?.activeAgentCount ?? activeAgents.length;
      const clusterBase = {
        ownerKey,
        ownerUsername: user?.ownerUsername ?? ownerUsernameFor(sorted),
        agents: sorted,
        activeAgents,
        representative,
        framework: sorted.length
          ? dominantFramework(sorted)
          : representative.framework,
        status:
          activeAgentCount > 0
            ? 'running'
            : sorted.length
              ? aggregateStatus(sorted)
              : 'sleeping',
        tier: Math.max(user?.tier ?? 0, ...sorted.map((agent) => safeTier(agent))),
        mine: user?.mine ?? sorted.some((agent) => agent.mine),
        messageCount: sorted.reduce(
          (sum, agent) => sum + safeMessageCount(agent),
          0,
        ),
        agentCount,
        activeAgentCount,
      };
      return { ...clusterBase, rank: clusterRank(clusterBase) };
    })
    .filter((cluster): cluster is LiveUserCluster => cluster !== null)
    .sort((a, b) => {
      const rankDiff = b.rank - a.rank;
      if (rankDiff !== 0) return rankDiff;
      return a.ownerKey.localeCompare(b.ownerKey);
    });
}

function selectRenderedOwners(
  agents: CityAgent[],
  maxBuildings = DEFAULT_MAX_BUILDINGS,
  users: CityUser[] = [],
): LiveUserCluster[] {
  const clusters = clusterAgentsByOwner(agents, users);
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
        agent.status === 'running' || agent.mine || safeMessageCount(agent) > 0,
    )
    .sort((a, b) => {
      const rankDiff = rankAgentForCity(b) - rankAgentForCity(a);
      if (rankDiff !== 0) return rankDiff;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

const TIER_PLACEMENT_RANK: Record<LiveCityTierKey, number> = {
  founding: 0,
  business: 1,
  pro: 2,
  starter: 3,
  free: 4,
};

function placementScore(cluster: LiveUserCluster): number {
  const tierScore = TIER_PLACEMENT_RANK[tierKeyForCity(cluster.tier)];
  const jitter = hashStr(`${cluster.ownerKey}:handoff-placement`) * 0.6;
  return tierScore + jitter;
}

function sortForPlacement(clusters: LiveUserCluster[]): LiveUserCluster[] {
  return [...clusters].sort((a, b) => {
    const placementDiff = placementScore(a) - placementScore(b);
    if (placementDiff !== 0) return placementDiff;
    const rankDiff = b.rank - a.rank;
    if (rankDiff !== 0) return rankDiff;
    return a.ownerKey.localeCompare(b.ownerKey);
  });
}

function markerHeight(agent: CityAgent) {
  const activityBoost = Math.min(
    1.25,
    Math.log10(safeMessageCount(agent) + 1) * 0.34,
  );
  return Math.min(3.1, 1.3 + safeTier(agent) * 0.22 + activityBoost);
}

function markerWidth(agent: CityAgent) {
  if (agent.mine) return 1.2;
  if (agent.status === 'running') return 1;
  if (agent.status === 'paused') return 0.72;
  return 0.62;
}

function clampNodeIndex(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

function nearestNodeForPlot(
  grid: LiveCityGrid,
  gridX: number,
  gridZ: number,
): LiveCityNode {
  const gx = clampNodeIndex(
    Math.round((gridX + 0.5) / LIVE_CITY_SUPER),
    grid.Nsb,
  );
  const gz = clampNodeIndex(
    Math.round((gridZ + 0.5) / LIVE_CITY_SUPER),
    grid.Nsb,
  );
  return nodeAt(grid, gx, gz) ?? grid.nodes[0]!;
}

function planAgentPath(
  grid: LiveCityGrid,
  building: LiveBuildingLayout,
  agent: CityAgent,
  localIndex: number,
): LiveCityNode[] {
  const start = nearestNodeForPlot(grid, building.gridX, building.gridZ);
  const seed = hashInt(`${agent.id}:handoff-walk:${localIndex}`);
  const endIndex = seed % grid.nodes.length;
  let end = grid.nodes[endIndex] ?? start;
  if (end.id === start.id && grid.nodes.length > 1) {
    end =
      grid.nodes[(endIndex + Math.ceil(grid.Nsb / 2) + 1) % grid.nodes.length]!;
  }

  const goXFirst = (seed & 1) === 0;
  const corner =
    (goXFirst
      ? nodeAt(grid, end.gx, start.gz)
      : nodeAt(grid, start.gx, end.gz)) ?? null;

  if (!corner || corner.id === start.id || corner.id === end.id) {
    return [start, end];
  }
  return [start, corner, end];
}

function layoutAgentMarkers(
  clusters: LiveUserCluster[],
  buildingsByOwner: Map<string, LiveBuildingLayout>,
  grid: LiveCityGrid,
): LiveAgentMarkerLayout[] {
  return clusters.flatMap((cluster) => {
    const building = buildingsByOwner.get(cluster.ownerKey);
    if (!building) return [];

    return cluster.activeAgents.map((agent, localIndex) => {
      const pathNodes = planAgentPath(grid, building, agent, localIndex);
      const start =
        pathNodes[0] ??
        nearestNodeForPlot(grid, building.gridX, building.gridZ);
      return {
        agentId: agent.id,
        agentSlug: agent.slug,
        dashboardAgentId: agent.dashboardAgentId ?? null,
        agentName: agent.name,
        ownerKey: cluster.ownerKey,
        ownerUsername: cluster.ownerUsername,
        blockId: building.blockId,
        x: start.x,
        z: start.z,
        height: markerHeight(agent),
        width: markerWidth(agent),
        framework: agent.framework,
        status: agent.status,
        tier: safeTier(agent),
        mine: agent.mine,
        visibility: agent.visibility,
        publicChatEnabled: agent.publicChatEnabled === true,
        avatar: agent.avatarVariant ?? null,
        rank: rankAgentForCity(agent),
        pathNodes,
        speed: 1.35 + hashStr(`${agent.id}:walk-speed`) * 0.95,
        phase: hashStr(`${agent.id}:walk-phase`) * Math.PI * 2,
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
  const renderedClusters = selectRenderedOwners(
    agents,
    maxBuildings,
    options.users,
  );
  const placementClusters = sortForPlacement(renderedClusters);
  const grid = cityGridFor(placementClusters.length);
  const coords = spiralOrder(grid.N);
  const buildings = placementClusters.map((cluster, index) => {
    const [gridX, gridZ] = coords[index] ?? coords[coords.length - 1] ?? [0, 0];
    const position = plotPosition(gridX, gridZ, grid.half);
    const visual = deriveHandoffBuildingVisual(cluster.ownerKey, cluster.tier);
    const superX = Math.floor(gridX / LIVE_CITY_SUPER);
    const superZ = Math.floor(gridZ / LIVE_CITY_SUPER);

    return {
      agentId: cluster.representative.id,
      ownerKey: cluster.ownerKey,
      ownerUsername: cluster.ownerUsername,
      agentIds: cluster.agents.map((agent) => agent.id),
      activeAgentIds: cluster.activeAgents.map((agent) => agent.id),
      agentCount: cluster.agentCount,
      activeAgentCount: cluster.activeAgentCount,
      blockId: `super-${superX}-${superZ}`,
      gridX,
      gridZ,
      x: position.x,
      z: position.z,
      height: visual.height,
      rotation: 0,
      framework: cluster.framework,
      status: cluster.status,
      tier: cluster.tier,
      tierKey: visual.tierKey,
      visual,
      mine: cluster.mine,
      rank: cluster.rank,
    } satisfies LiveBuildingLayout;
  });

  const byOwner = new Map(
    buildings.map((building) => [building.ownerKey, building]),
  );
  const markers = layoutAgentMarkers(renderedClusters, byOwner, grid);
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
    const target =
      grid.nodes[(index * 7 + 3) % grid.nodes.length] ?? grid.nodes[0];
    if (!source || !target) return [];
    return [
      {
        key: `${agent.id}-${index}`,
        agentId: agent.id,
        from: [source.x, Math.min(source.height + 2.8, 24), source.z] as [
          number,
          number,
          number,
        ],
        to: [target.x, 1.8, target.z] as [number, number, number],
        mid: [
          (source.x + target.x) / 2 + Math.sin(index * 2.31) * 5,
          Math.min(30, Math.max(source.height + 5, 6)),
          (source.z + target.z) / 2 + Math.cos(index * 1.63) * 5,
        ] as [number, number, number],
        framework: agent.framework,
        mine: agent.mine,
        speed: 0.036 + (index % 6) * 0.006,
        phase: ((index * 37) % 100) / 100,
      },
    ];
  });

  return {
    grid,
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
