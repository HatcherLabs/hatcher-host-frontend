export const STATION_IDS = [
  'agentAvatar',
  'skillWorkbench',
  'integrationsRack',
  'statusConsole',
  'logWall',
  'statsHologram',
  'memoryShelves',
  'configTerminal',
  'mailInbox',
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
 * Office-style config room — stations are mapped to recognizable room
 * furniture: laptop = config, corkboard = integrations, bookshelf =
 * memory, TV/log panel = runtime state, mailbox = agent mail.
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
    skillWorkbench:   { id: 'skillWorkbench',   position: [-5.7, 0, -2.2], rotationY: Math.PI / 2 },
    integrationsRack: { id: 'integrationsRack', position: [-3.6, 0, 6.5],  rotationY: Math.PI },
    statusConsole:    { id: 'statusConsole',    position: [1.7, 0, -6.7],  rotationY: 0 },
    logWall:          { id: 'logWall',          position: [-3.8, 0, -6.7], rotationY: 0 },
    statsHologram:    { id: 'statsHologram',    position: [0, 0, -2.6],    rotationY: 0 },
    memoryShelves:    { id: 'memoryShelves',    position: [6.6, 0, -1.1],  rotationY: -Math.PI / 2 },
    configTerminal:   { id: 'configTerminal',   position: [3.2, 0, 6.2],   rotationY: Math.PI },
    mailInbox:        { id: 'mailInbox',        position: [6.2, 0, 5.1],   rotationY: -Math.PI * 3 / 4 },
    pluginsCabinet:   { id: 'pluginsCabinet',   position: [-6.1, 0, 3.7],  rotationY: Math.PI / 2 },
  };
}
