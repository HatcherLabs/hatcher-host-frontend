import { describe, expect, it } from 'vitest';
import {
  agentRoomFromBuildingHref,
  cityBuildingHref,
  cityBuildingTitle,
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
});
