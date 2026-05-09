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
  'buildingExit',
] as const;

export type StationId = (typeof STATION_IDS)[number];

export const ROOM_INTERACTION_STATION_IDS = [
  'agentAvatar',
  'integrationsRack',
  'statusConsole',
  'memoryShelves',
  'configTerminal',
  'buildingExit',
] as const satisfies readonly StationId[];

export interface Station {
  id: StationId;
  position: [number, number, number];
  rotationY: number;
}

export type StationLayout = Record<StationId, Station>;

/**
 * Office-style config room — stations are mapped to recognizable room
 * furniture: laptop = config, corkboard = integrations, bookshelf =
 * memory, TV/log panel = runtime state, laptop = config/mail/passport/avatar.
 *
 *   -z = "front of room" (log wall, avatar looks this way)
 *   +z = "back of room" (where player spawns)
 *   -x = left wall
 *   +x = right wall
 */
export function getStationLayout(framework: string): StationLayout {
  void framework;
  return {
    agentAvatar: { id: 'agentAvatar', position: [0, 0, 0], rotationY: Math.PI },
    skillWorkbench: { id: 'skillWorkbench', position: [3.2, 0, 6.2], rotationY: Math.PI },
    integrationsRack: { id: 'integrationsRack', position: [-3.6, 0, 6.5], rotationY: Math.PI },
    statusConsole: { id: 'statusConsole', position: [0, 0, -6.7], rotationY: 0 },
    logWall: { id: 'logWall', position: [0, 0, -6.7], rotationY: 0 },
    statsHologram: { id: 'statsHologram', position: [0, 0, -2.6], rotationY: 0 },
    memoryShelves: { id: 'memoryShelves', position: [6.6, 0, 0], rotationY: -Math.PI / 2 },
    configTerminal: { id: 'configTerminal', position: [3.2, 0, 6.2], rotationY: Math.PI },
    mailInbox: { id: 'mailInbox', position: [3.2, 0, 6.2], rotationY: Math.PI },
    pluginsCabinet: { id: 'pluginsCabinet', position: [3.2, 0, 6.2], rotationY: Math.PI },
    buildingExit: { id: 'buildingExit', position: [6.0, 0, 6.95], rotationY: Math.PI },
  };
}
