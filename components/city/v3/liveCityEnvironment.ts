import { createSeededRng, hashInt } from './liveCityHandoff';

export const TERRAIN_SIZE = 1400;
export const TERRAIN_SEGMENTS = 80;
export const CITY_FLAT_RADIUS = 110;

export interface LiveCityTreeSpec {
  key: string;
  x: number;
  z: number;
  height: number;
  rotation: number;
  scale: number;
  cone: boolean;
  materialIndex: number;
}

export function terrainNoise(x: number, z: number): number {
  return (
    Math.sin(x * 0.018) * Math.cos(z * 0.022) * 1 +
    Math.sin(x * 0.043 + 1.7) * Math.cos(z * 0.037 + 0.5) * 0.55 +
    Math.sin(x * 0.092 + 2.4) * Math.cos(z * 0.087 - 1.1) * 0.25
  );
}

export function hashUnit(value: string): number {
  return hashInt(value) / 0xffffffff;
}

export function createTreeRingSpecs(): LiveCityTreeSpec[] {
  const rng = createSeededRng(55_491);
  return Array.from({ length: 380 }, (_, index) => {
    const radius = CITY_FLAT_RADIUS + 6 + Math.pow(rng(), 0.6) * 480;
    const angle = rng() * Math.PI * 2;
    const x = Math.cos(angle) * radius + (rng() - 0.5) * 8;
    const z = Math.sin(angle) * radius + (rng() - 0.5) * 8;
    const dist = Math.hypot(x, z);
    const height =
      terrainNoise(x, z) * 6 * Math.min(1, (dist - CITY_FLAT_RADIUS) / 50) +
      Math.max(0, dist - 200) * 0.02;

    return {
      key: `tree-${index}`,
      x,
      z,
      height,
      rotation: rng() * Math.PI,
      scale: 0.7 + rng() * 0.9,
      cone: rng() < 0.55,
      materialIndex: Math.floor(rng() * 3),
    };
  });
}
