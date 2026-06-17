import { describe, expect, it } from 'vitest';
import { cityGridFor } from './liveCityHandoff';
import { CITY_RENDER_BUDGET } from './cityRenderBudget';

describe('CITY_RENDER_BUDGET', () => {
  it('keeps the city grid scale unchanged for the current live city footprint', () => {
    const grid = cityGridFor(CITY_RENDER_BUDGET.minimumGridBuildings);

    expect(CITY_RENDER_BUDGET.minimumGridBuildings).toBe(2_500);
    expect(grid.nodes).toHaveLength(324);
  });

  it('disables expensive decorative city details', () => {
    expect(CITY_RENDER_BUDGET.agentTrails).toBe(false);
    expect(CITY_RENDER_BUDGET.intersectionAccents).toBe(false);
    expect(CITY_RENDER_BUDGET.crosswalkStripes).toBe(false);
    expect(CITY_RENDER_BUDGET.roadStripeMarks).toBe(false);
    expect(CITY_RENDER_BUDGET.signalBackbone).toBe(false);
    expect(CITY_RENDER_BUDGET.cyanBuildingCaps).toBe(false);
  });
});
