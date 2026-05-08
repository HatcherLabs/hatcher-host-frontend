import { describe, expect, it } from 'vitest';
import { cityAgentPassportPath, cityBuildingTitle } from './cityNavigation';

describe('city navigation helpers', () => {
  it('opens active city agents directly to the public passport panel', () => {
    expect(cityAgentPassportPath('agent-123')).toBe(
      '/agent/agent-123/room?from=city&passport=1',
    );
  });

  it('labels user-owned buildings by public username', () => {
    expect(cityBuildingTitle('cristian')).toBe('cristian Building');
    expect(cityBuildingTitle('  maria  ')).toBe('maria Building');
    expect(cityBuildingTitle(null)).toBe('Builder Building');
  });
});
