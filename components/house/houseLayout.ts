import type { Agent } from '@/lib/api';

export const HOUSE_DOOR_PITCH = 2.8;
export const HOUSE_WIDTH = 6.4;
export const HOUSE_HEIGHT = 3.35;
export const HOUSE_EYE_HEIGHT = 1.5;

export interface HouseDoorLayout {
  agent: Agent;
  index: number;
  side: 'west' | 'east';
  x: number;
  z: number;
  facing: 1 | -1;
}

export interface HouseLayout {
  width: number;
  height: number;
  length: number;
  doors: HouseDoorLayout[];
}

export function buildHouseLayout(agents: Agent[]): HouseLayout {
  const perSide = Math.max(1, Math.ceil(agents.length / 2));
  const length = Math.max(12, perSide * HOUSE_DOOR_PITCH + 5);
  const startZ = -((perSide - 1) * HOUSE_DOOR_PITCH) / 2;

  return {
    width: HOUSE_WIDTH,
    height: HOUSE_HEIGHT,
    length,
    doors: agents.map((agent, index) => {
      const side = index % 2 === 0 ? 'west' : 'east';
      const idxOnSide = Math.floor(index / 2);
      return {
        agent,
        index,
        side,
        x: side === 'west' ? -HOUSE_WIDTH / 2 + 0.08 : HOUSE_WIDTH / 2 - 0.08,
        z: startZ + idxOnSide * HOUSE_DOOR_PITCH,
        facing: side === 'west' ? 1 : -1,
      };
    }),
  };
}

export function labelAgentStatus(status: string | undefined): string {
  switch (status) {
    case 'active':
    case 'running':
      return 'Active';
    case 'restarting':
      return 'Restarting';
    case 'paused':
      return 'Paused';
    case 'error':
    case 'killed':
    case 'crashed':
      return 'Needs attention';
    case 'sleeping':
      return 'Sleeping';
    default:
      return 'Idle';
  }
}

export function statusColor(status: string | undefined): string {
  switch (status) {
    case 'active':
    case 'running':
      return '#68ff8a';
    case 'restarting':
      return '#22d3ee';
    case 'paused':
      return '#facc15';
    case 'error':
    case 'killed':
    case 'crashed':
      return '#fb7185';
    case 'sleeping':
      return '#64748b';
    default:
      return '#94a3b8';
  }
}

export function frameworkColor(framework: string | undefined): string {
  return framework === 'hermes' ? '#b987ff' : '#f5c518';
}
