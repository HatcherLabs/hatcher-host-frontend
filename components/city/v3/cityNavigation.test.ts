import { describe, expect, it } from 'vitest';
import { cityBuildingTitle } from './cityNavigation';

describe('city navigation helpers', () => {
  it('labels user-owned buildings by public username without duplicating building copy', () => {
    expect(cityBuildingTitle('cristian')).toBe('cristian');
    expect(cityBuildingTitle('  maria  ')).toBe('maria');
    expect(cityBuildingTitle(null)).toBe('Builder');
  });
});
