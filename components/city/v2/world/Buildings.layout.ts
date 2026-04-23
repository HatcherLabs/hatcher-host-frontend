import type { CityAgent, Category } from '@/components/city/types';
import { CATEGORIES, TIER_HEIGHT } from '@/components/city/types';
import {
  DISTRICT_SIZE,
  LANDMARK_CLEAR_RADIUS,
  districtPosition,
} from './grid';

export const BUILDING_BASES = [
  'small-building-a',
  'small-building-b',
  'small-building-c',
  'medium-building-a',
  'medium-building-b',
  'skyscraper-a',
  'skyscraper-b',
  'skyscraper-c',
] as const;
export type BuildingBase = (typeof BUILDING_BASES)[number];

/** Stable hash — matches components/city/CityScene.tsx so V2 agent
 *  positions line up with the legacy scene. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

export function pickBase(agentId: string, tier: number): BuildingBase {
  const r = hashStr(agentId + ':base');
  if (tier <= 1) {
    const small = BUILDING_BASES.filter((b) => b.startsWith('small-building-'));
    return small[Math.floor(r * small.length)]!;
  }
  if (tier >= 4) {
    const sky = BUILDING_BASES.filter((b) => b.startsWith('skyscraper-'));
    return sky[Math.floor(r * sky.length)]!;
  }
  const mid = BUILDING_BASES.filter(
    (b) => b.startsWith('medium-building-') || b.startsWith('small-building-'),
  );
  return mid[Math.floor(r * mid.length)]!;
}

// DISTRICT_COLS/SIZE/GAP + districtPosition imported from ./grid.ts so
// every consumer (Streets/Pads/Landmarks/Traffic/NPCs/...) stays in
// lockstep. If this scene ever drifts from the grid, that's a bug.

export interface BuildingLayout {
  agentId: string;
  base: BuildingBase;
  x: number;
  z: number;
  height: number;
  rotation: number;
  framework: CityAgent['framework'];
  category: Category;
  tier: number;
  /** Mirrored from CityAgent.mine so Buildings.tsx can colour owner
   *  buildings gold without doing a second lookup. */
  mine: boolean;
}

export function layoutBuildingsV2(agents: CityAgent[]): BuildingLayout[] {
  const byCategory = new Map<Category, CityAgent[]>();
  for (const c of CATEGORIES) byCategory.set(c, []);
  for (const a of agents) {
    const bucket = byCategory.get(a.category) ?? byCategory.get(CATEGORIES[0]!)!;
    bucket.push(a);
  }

  const out: BuildingLayout[] = [];
  CATEGORIES.forEach((cat, di) => {
    const list = byCategory.get(cat) ?? [];
    if (!list.length) return;
    const pos = districtPosition(di);
    const cols = Math.max(1, Math.ceil(Math.sqrt(list.length)));
    const spacing = (DISTRICT_SIZE - 6) / cols;

    list.forEach((a, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rx = hashStr(a.id + ':x');
      const rz = hashStr(a.id + ':z');
      const rh = hashStr(a.id + ':h');
      const rr = hashStr(a.id + ':r');
      const jitter = 0.15 * spacing;
      let bx =
        pos.x -
        DISTRICT_SIZE / 2 +
        3 +
        col * spacing +
        spacing / 2 +
        (rx - 0.5) * jitter;
      let bz =
        pos.z -
        DISTRICT_SIZE / 2 +
        3 +
        row * spacing +
        spacing / 2 +
        (rz - 0.5) * jitter;

      // Keep agents out of the center circle reserved for the
      // landmark sculpt (see Landmarks.tsx). Push the building out
      // radially if its cell fell inside the clearance ring so
      // Finance/$ tower, Security fortress, etc. never get clipped by
      // an InstancedMesh building stacked on top of them.
      const dx = bx - pos.x;
      const dz = bz - pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < LANDMARK_CLEAR_RADIUS) {
        // If the cell is effectively at center (d ≈ 0), use the jitter
        // direction (rx, rz) to pick a push angle that's still stable.
        const angle =
          d > 0.001 ? Math.atan2(dz, dx) : (rx + rz) * Math.PI * 2;
        bx = pos.x + Math.cos(angle) * LANDMARK_CLEAR_RADIUS;
        bz = pos.z + Math.sin(angle) * LANDMARK_CLEAR_RADIUS;
      }

      const baseHeight = TIER_HEIGHT[a.tier] ?? 3;
      const height = baseHeight * (0.85 + rh * 0.3);

      out.push({
        agentId: a.id,
        base: pickBase(a.id, a.tier),
        x: bx,
        z: bz,
        height,
        rotation: rr * Math.PI * 2,
        framework: a.framework,
        category: a.category,
        tier: a.tier,
        mine: a.mine,
      });
    });
  });
  return out;
}
