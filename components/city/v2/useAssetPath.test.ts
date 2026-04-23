import { describe, it, expect } from 'vitest';
import { buildAssetPath } from './useAssetPath';

describe('buildAssetPath', () => {
  it('suffixes quality before .glb', () => {
    expect(buildAssetPath('city/buildings/small-building-a.glb', 'high')).toBe(
      '/assets/3d/city/buildings/small-building-a.high.glb',
    );
  });

  it('works with low', () => {
    expect(buildAssetPath('city/buildings/small-building-a.glb', 'low')).toBe(
      '/assets/3d/city/buildings/small-building-a.low.glb',
    );
  });

  it('returns HDRIs unchanged (already not per-quality)', () => {
    expect(buildAssetPath('city/skybox/day.hdr', 'high')).toBe('/assets/3d/city/skybox/day.hdr');
  });

  it('prepends leading slash', () => {
    expect(buildAssetPath('a.glb', 'high').startsWith('/')).toBe(true);
  });
});
