import { describe, expect, it } from 'vitest';
import { cityGridFor } from './liveCityHandoff';
import { createTreeRingSpecs, terrainHeightAt } from './liveCityEnvironment';

describe('live city environment', () => {
  it('keeps the full dynamic city footprint flat', () => {
    const grid = cityGridFor(960);
    const edge = grid.half - 0.5;

    expect(terrainHeightAt(0, 0, grid.half)).toBe(0);
    expect(terrainHeightAt(edge, edge, grid.half)).toBe(0);
    expect(terrainHeightAt(-edge, edge, grid.half)).toBe(0);
  });

  it('places the tree ring outside the dynamic city square', () => {
    const grid = cityGridFor(960);
    const trees = createTreeRingSpecs(grid.half);

    expect(
      trees.every(
        (tree) => Math.abs(tree.x) > grid.half || Math.abs(tree.z) > grid.half,
      ),
    ).toBe(true);
  });
});
