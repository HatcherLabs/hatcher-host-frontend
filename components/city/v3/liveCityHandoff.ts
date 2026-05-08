import type { CityAgent } from '@/components/city/types';

export type LiveCityTierKey = 'free' | 'starter' | 'pro' | 'enterprise';

export interface LiveCityTierConfig {
  label: string;
  color: number;
  glow: number;
  minH: number;
  maxH: number;
  footprint: readonly [number, number];
}

export const LIVE_CITY_TIERS: Record<LiveCityTierKey, LiveCityTierConfig> = {
  free: {
    label: 'Free',
    color: 0x3d4a63,
    glow: 0xffd089,
    minH: 1.2,
    maxH: 2.0,
    footprint: [2, 2],
  },
  starter: {
    label: 'Starter',
    color: 0x4d6d92,
    glow: 0xffe4a8,
    minH: 2.5,
    maxH: 4.0,
    footprint: [3, 3],
  },
  pro: {
    label: 'Pro',
    color: 0x475a72,
    glow: 0x7fd9ff,
    minH: 5.0,
    maxH: 9.0,
    footprint: [3, 4],
  },
  enterprise: {
    label: 'Enterprise',
    color: 0x3d4863,
    glow: 0xa9d8ff,
    minH: 12.0,
    maxH: 22.0,
    footprint: [4, 4],
  },
};

export const LIVE_CITY_BLOCK = 5.6;
export const LIVE_CITY_GUTTER = 3.0;
export const LIVE_CITY_SUPER = 3;
export const LIVE_CITY_SUPER_W = LIVE_CITY_SUPER * LIVE_CITY_BLOCK;
export const LIVE_CITY_TILE = LIVE_CITY_SUPER_W + LIVE_CITY_GUTTER;

export interface LiveCityBounds {
  width: number;
  depth: number;
  centerZ: number;
}

export interface LiveCityRoad {
  key: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  kind: 'vertical' | 'horizontal';
}

export interface LiveCityNode {
  id: number;
  gx: number;
  gz: number;
  x: number;
  z: number;
}

export interface LiveCityGrid {
  N: number;
  Nsb: number;
  half: number;
  totalW: number;
  bounds: LiveCityBounds;
  roads: LiveCityRoad[];
  streetXs: number[];
  streetZs: number[];
  nodes: LiveCityNode[];
}

export interface HandoffBuildingVisual {
  tierKey: LiveCityTierKey;
  seed: number;
  variant: number;
  width: number;
  depth: number;
  height: number;
}

const spiralCache = new Map<number, Array<readonly [number, number]>>();

export function tierKeyForCity(tier: CityAgent['tier']): LiveCityTierKey {
  if (tier <= 0) return 'free';
  if (tier === 1) return 'starter';
  if (tier === 2) return 'pro';
  return 'enterprise';
}

export function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function hashInt(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function deriveHandoffBuildingVisual(
  ownerKey: string,
  tier: CityAgent['tier'],
): HandoffBuildingVisual {
  const tierKey = tierKeyForCity(tier);
  const config = LIVE_CITY_TIERS[tierKey];
  const seed = hashInt(`${ownerKey}:hatcher-city-building`);
  const rng = createSeededRng(seed);
  const variant = Math.floor(rng() * 4);
  const width = config.footprint[0] * 0.9 + rng() * 0.4;
  const depth = config.footprint[1] * 0.9 + rng() * 0.4;
  const height = config.minH + rng() * (config.maxH - config.minH);

  return { tierKey, seed, variant, width, depth, height };
}

export function cityGridFor(buildingCount: number): LiveCityGrid {
  const count = Math.max(1, buildingCount);
  const N0 = Math.ceil(Math.sqrt(count));
  const Nsb = Math.ceil(N0 / LIVE_CITY_SUPER);
  const N = Nsb * LIVE_CITY_SUPER;
  const totalW = Nsb * LIVE_CITY_TILE + LIVE_CITY_GUTTER;
  const half = totalW / 2;
  const streetXs = Array.from(
    { length: Nsb + 1 },
    (_, i) => -half + i * LIVE_CITY_TILE + LIVE_CITY_GUTTER / 2,
  );
  const streetZs = Array.from(
    { length: Nsb + 1 },
    (_, i) => -half + i * LIVE_CITY_TILE + LIVE_CITY_GUTTER / 2,
  );
  const roads: LiveCityRoad[] = [
    ...streetXs.map((x, index) => ({
      key: `avenue-${index}`,
      x,
      z: 0,
      width: LIVE_CITY_GUTTER,
      depth: totalW,
      kind: 'vertical' as const,
    })),
    ...streetZs.map((z, index) => ({
      key: `street-${index}`,
      x: 0,
      z,
      width: totalW,
      depth: LIVE_CITY_GUTTER,
      kind: 'horizontal' as const,
    })),
  ];
  const nodes: LiveCityNode[] = [];
  for (let gx = 0; gx <= Nsb; gx++) {
    for (let gz = 0; gz <= Nsb; gz++) {
      nodes.push({
        id: gx * 1000 + gz,
        gx,
        gz,
        x: streetXs[gx]!,
        z: streetZs[gz]!,
      });
    }
  }

  return {
    N,
    Nsb,
    half,
    totalW,
    bounds: { width: totalW, depth: totalW, centerZ: 0 },
    roads,
    streetXs,
    streetZs,
    nodes,
  };
}

export function plotPosition(gx: number, gz: number, half: number) {
  const sbx = Math.floor(gx / LIVE_CITY_SUPER);
  const inx = gx % LIVE_CITY_SUPER;
  const sbz = Math.floor(gz / LIVE_CITY_SUPER);
  const inz = gz % LIVE_CITY_SUPER;
  return {
    x:
      -half +
      LIVE_CITY_GUTTER +
      sbx * LIVE_CITY_TILE +
      inx * LIVE_CITY_BLOCK +
      LIVE_CITY_BLOCK / 2,
    z:
      -half +
      LIVE_CITY_GUTTER +
      sbz * LIVE_CITY_TILE +
      inz * LIVE_CITY_BLOCK +
      LIVE_CITY_BLOCK / 2,
  };
}

export function spiralOrder(N: number): Array<readonly [number, number]> {
  const cached = spiralCache.get(N);
  if (cached) return cached;

  const cx = (N - 1) / 2;
  const cz = (N - 1) / 2;
  const all: Array<readonly [number, number]> = [];
  for (let gx = 0; gx < N; gx++) {
    for (let gz = 0; gz < N; gz++) all.push([gx, gz]);
  }
  all.sort(
    (a, b) =>
      (a[0] - cx) ** 2 +
      (a[1] - cz) ** 2 -
      ((b[0] - cx) ** 2 + (b[1] - cz) ** 2),
  );
  spiralCache.set(N, all);
  return all;
}

export function nodeAt(
  grid: LiveCityGrid,
  gx: number,
  gz: number,
): LiveCityNode | null {
  if (gx < 0 || gz < 0 || gx > grid.Nsb || gz > grid.Nsb) return null;
  return grid.nodes.find((node) => node.gx === gx && node.gz === gz) ?? null;
}
