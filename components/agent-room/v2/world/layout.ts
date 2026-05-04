export const STATION_IDS = [
  'agentAvatar',
  'skillWorkbench',
  'integrationsRack',
  'statusConsole',
  'logWall',
  'statsHologram',
  'memoryShelves',
  'configTerminal',
  'pluginsCabinet',
] as const;

export type StationId = (typeof STATION_IDS)[number];

export interface Station {
  id: StationId;
  position: [number, number, number];
  rotationY: number;
}

export type StationLayout = Record<StationId, Station>;

/**
 * 24x24 room — stations arranged so the player spawns near the south
 * wall (positive z), faces the center where the avatar stands, and
 * must walk towards the back to reach configure-only stations.
 *
 *   -z = "front of room" (log wall, avatar looks this way)
 *   +z = "back of room" (where player spawns)
 *   -x = left wall
 *   +x = right wall
 */
export function getStationLayout(framework: string): StationLayout {
  void framework;
  return {
    agentAvatar:      { id: 'agentAvatar',      position: [0, 0, 0],      rotationY: Math.PI },
    skillWorkbench:   { id: 'skillWorkbench',   position: [-8, 0, -5],    rotationY: Math.PI / 4 },
    integrationsRack: { id: 'integrationsRack', position: [8, 0, -5],     rotationY: -Math.PI / 4 },
    statusConsole:    { id: 'statusConsole',    position: [0, 0, -10],    rotationY: 0 },
    logWall:          { id: 'logWall',          position: [-11.5, 0, 0],  rotationY: Math.PI / 2 },
    statsHologram:    { id: 'statsHologram',    position: [0, 0, -7.2],   rotationY: 0 },
    memoryShelves:    { id: 'memoryShelves',    position: [11.5, 0, 3],   rotationY: -Math.PI / 2 },
    configTerminal:   { id: 'configTerminal',   position: [6, 0, 6],      rotationY: -Math.PI * 3 / 4 },
    pluginsCabinet:   { id: 'pluginsCabinet',   position: [-6, 0, 6],     rotationY: Math.PI * 3 / 4 },
  };
}
