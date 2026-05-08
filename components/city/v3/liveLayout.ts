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
  const activityScore = Math.min(4_000, Math.log10(agent.messageCount + 1) * 1_500);
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

export function selectRouteAgents(agents: CityAgent[], limit = DEFAULT_ROUTE_LIMIT): CityAgent[] {
  if (limit <= 0) return [];
  return [...agents]
    .filter((agent) => agent.status === 'running' || agent.mine || agent.messageCount > 0)
    .sort((a, b) => {
      const rankDiff = rankAgentForCity(b) - rankAgentForCity(a);
      if (rankDiff !== 0) return rankDiff;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

function skylinePosition(index: number, count: number, agentId: string) {
  const row = Math.floor(index / 18);
  const col = index % 18;
  const rowCount = Math.min(18, count - row * 18);
  const width = Math.max(1, rowCount - 1) * 11;
  const x = col * 11 - width / 2 + (hashStr(`${agentId}:x`) - 0.5) * 2.4;
  const z = row * 18 - 34 + (hashStr(`${agentId}:z`) - 0.5) * 4.5;
  return { x, z };
}

function buildingHeight(agent: CityAgent) {
  const base = TIER_HEIGHT[agent.tier] ?? TIER_HEIGHT[0] ?? 3;
  const activityBoost = Math.min(8, Math.log10(agent.messageCount + 1) * 2);
  return base * (agent.mine ? 1.18 : 1) + activityBoost;
}

export function layoutLiveCity(
  agents: CityAgent[],
  options: LiveCityLayoutOptions = {},
): LiveCityLayout {
  const maxBuildings = options.maxBuildings ?? DEFAULT_MAX_BUILDINGS;
  const routeLimit = options.routeLimit ?? DEFAULT_ROUTE_LIMIT;
  const renderedAgents = selectRenderedAgents(agents, maxBuildings);
  const buildings = renderedAgents.map((agent, index) => {
    const pos = skylinePosition(index, renderedAgents.length, agent.id);
    return {
      agentId: agent.id,
      base: pickBase(agent.id, agent.tier),
      x: pos.x,
      z: pos.z,
      height: buildingHeight(agent),
      rotation: hashStr(`${agent.id}:rotation`) * Math.PI * 2,
      framework: agent.framework,
      status: agent.status,
      tier: agent.tier,
      mine: agent.mine,
      rank: rankAgentForCity(agent),
    };
  });

  const byId = new Map(buildings.map((building) => [building.agentId, building]));
  const routeAgents = selectRouteAgents(renderedAgents, routeLimit);
  const routes = routeAgents.flatMap((agent, index) => {
    const source = byId.get(agent.id);
    if (!source) return [];
    const targetX = agent.mine ? 0 : Math.sin(index * 1.77) * 22;
    const targetZ = agent.mine ? -58 : -48 - (index % 4) * 5;
    return [
      {
        key: `${agent.id}-${index}`,
        agentId: agent.id,
        from: [source.x, Math.min(source.height + 4, 28), source.z] as [
          number,
          number,
          number,
        ],
        to: [targetX, 34 + (index % 5) * 2, targetZ] as [number, number, number],
        mid: [
          (source.x + targetX) / 2 + Math.sin(index * 2.31) * 12,
          44 + (index % 6) * 3,
          (source.z + targetZ) / 2 + Math.cos(index * 1.63) * 8,
        ] as [number, number, number],
        framework: agent.framework,
        mine: agent.mine,
        speed: 0.052 + (index % 6) * 0.008,
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
