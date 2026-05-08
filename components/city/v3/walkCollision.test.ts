import { describe, expect, it } from 'vitest';
import {
  resolveWalkPosition,
  WALK_EYE_HEIGHT,
  WALK_SPEED,
  type WalkCollisionMap,
} from './walkCollision';

const emptyMap: WalkCollisionMap = {
  bounds: 10,
  boxes: [],
  circles: [],
};

describe('walkCollision', () => {
  it('uses a pedestrian-height camera profile', () => {
    expect(WALK_EYE_HEIGHT).toBeLessThan(1.2);
    expect(WALK_SPEED).toBeLessThan(10);
  });

  it('keeps the walker inside city bounds', () => {
    expect(
      resolveWalkPosition({ x: 20, z: -20 }, { x: 0, z: 0 }, emptyMap),
    ).toEqual({ x: 10, z: -10 });
  });

  it('pushes the walker out of building footprints', () => {
    const map: WalkCollisionMap = {
      bounds: 10,
      boxes: [{ x: 0, z: 0, halfX: 2, halfZ: 2 }],
      circles: [],
    };

    const next = resolveWalkPosition(
      { x: 0.5, z: 0 },
      { x: -3, z: 0 },
      map,
      [],
      0.3,
    );

    expect(next.x).toBeLessThanOrEqual(-2.3);
  });

  it('pushes the walker away from circular colliders', () => {
    const map: WalkCollisionMap = {
      bounds: 10,
      boxes: [],
      circles: [{ x: 0, z: 0, radius: 0.7 }],
    };

    const next = resolveWalkPosition(
      { x: 0.2, z: 0 },
      { x: -2, z: 0 },
      map,
      [],
      0.3,
    );

    expect(Math.hypot(next.x, next.z)).toBeGreaterThanOrEqual(1);
  });
});
