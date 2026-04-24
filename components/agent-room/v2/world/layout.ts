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

export function getStationLayout(framework: string): StationLayout {
  void framework; // per-framework offsets may override in future; base layout shared
  return {
    agentAvatar:      { id: 'agentAvatar',      position: [0, 0, 0],       rotationY: 0 },
    skillWorkbench:   { id: 'skillWorkbench',   position: [-5, 0, -3],     rotationY: Math.PI / 4 },
    integrationsRack: { id: 'integrationsRack', position: [5, 0, -3],      rotationY: -Math.PI / 4 },
    statusConsole:    { id: 'statusConsole',    position: [0, 0, -6],      rotationY: 0 },
    logWall:          { id: 'logWall',          position: [-6.8, 0, 0],    rotationY: Math.PI / 2 },
    statsHologram:    { id: 'statsHologram',    position: [0, 0, 4.5],     rotationY: Math.PI },
    memoryShelves:    { id: 'memoryShelves',    position: [6.8, 0, 2],     rotationY: -Math.PI / 2 },
    configTerminal:   { id: 'configTerminal',   position: [3.5, 0, 3.5],   rotationY: -Math.PI * 3 / 4 },
    pluginsCabinet:   { id: 'pluginsCabinet',   position: [-3.5, 0, 3.5],  rotationY: Math.PI * 3 / 4 },
  };
}
