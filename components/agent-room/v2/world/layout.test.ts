import { describe, expect, it } from 'vitest';
import { getStationLayout, ROOM_INTERACTION_STATION_IDS } from './layout';

describe('agent room station layout', () => {
  it('keeps walk interactions on rendered room objects only', () => {
    expect(ROOM_INTERACTION_STATION_IDS).toEqual([
      'agentAvatar',
      'integrationsRack',
      'statusConsole',
      'eyesConsole',
      'memoryShelves',
      'configTerminal',
      'buildingExit',
    ]);
    expect(ROOM_INTERACTION_STATION_IDS).not.toContain('logWall');
    expect(ROOM_INTERACTION_STATION_IDS).not.toContain('mailInbox');
    expect(ROOM_INTERACTION_STATION_IDS).not.toContain('pluginsCabinet');
  });

  it('places the TV, eyes console, laptop, library, and building exit near their visible meshes', () => {
    const layout = getStationLayout('openclaw');

    expect(layout.statusConsole.position).toEqual([0, 0, -6.7]);
    expect(layout.eyesConsole.position).toEqual([-5.1, 0, -6.65]);
    expect(layout.configTerminal.position).toEqual([3.2, 0, 6.2]);
    expect(layout.memoryShelves.position).toEqual([6.6, 0, 0]);
    expect(layout.buildingExit.position).toEqual([6.0, 0, 6.95]);
  });
});
