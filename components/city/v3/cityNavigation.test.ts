import { describe, expect, it } from 'vitest';
import {
  agentRoomFromBuildingHref,
  buildingPanelEnterLabel,
  cityBuildingHref,
  cityBuildingTitle,
  isViewerBuilding,
} from './cityNavigation';

describe('city navigation helpers', () => {
  it('labels user-owned buildings by public username without duplicating building copy', () => {
    expect(cityBuildingTitle('cristian')).toBe('cristian');
    expect(cityBuildingTitle('  maria  ')).toBe('maria');
    expect(cityBuildingTitle(null)).toBe('Builder');
  });

  it('uses the building route for city-to-room navigation', () => {
    expect(cityBuildingHref()).toBe('/city/building');
    expect(agentRoomFromBuildingHref('agent-123')).toBe(
      '/agent/agent-123/room?from=building',
    );
  });

  it('keeps city building entry available for authenticated users', () => {
    expect(buildingPanelEnterLabel({ canEnterBuilding: false, isMyBuilding: true })).toBeNull();
    expect(buildingPanelEnterLabel({ canEnterBuilding: true, isMyBuilding: true })).toBe(
      'Enter building',
    );
    expect(buildingPanelEnterLabel({ canEnterBuilding: true, isMyBuilding: false })).toBeNull();
  });

  it('recognizes the viewer building beyond the backend mine flag', () => {
    expect(
      isViewerBuilding({
        buildingMine: false,
        buildingOwnerKey: 'owner-1',
        buildingOwnerUsername: 'canes100x',
        viewerOwnerKey: 'owner-1',
        viewerUsername: null,
      }),
    ).toBe(true);
    expect(
      isViewerBuilding({
        buildingMine: false,
        buildingOwnerKey: 'owner-2',
        buildingOwnerUsername: ' Canes100x ',
        viewerOwnerKey: null,
        viewerUsername: 'canes100x',
      }),
    ).toBe(true);
    expect(
      isViewerBuilding({
        buildingMine: false,
        buildingOwnerKey: 'owner-2',
        buildingOwnerUsername: 'other',
        viewerOwnerKey: 'owner-1',
        viewerUsername: 'canes100x',
      }),
    ).toBe(false);
  });
});
