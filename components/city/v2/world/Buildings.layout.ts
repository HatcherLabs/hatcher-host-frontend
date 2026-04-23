import type { CityAgent, Category } from '@/components/city/types';
import { CATEGORIES, TIER_HEIGHT } from '@/components/city/types';

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

// District grid constants — must match CityScene.tsx + Streets.tsx +
// DistrictPads.tsx. If these ever change, update all four places.
const DISTRICT_COLS = 5;
const DISTRICT_SIZE = 52;
const DISTRICT_GAP = 14;

function districtPosition(idx: number): { x: number; z: number } {
  const col = idx % DISTRICT_COLS;
  const row = Math.floor(idx / DISTRICT_COLS);
  const totalRows = Math.ceil(CATEGORIES.length / DISTRICT_COLS);
  const x = (col - (DISTRICT_COLS - 1) / 2) * (DISTRICT_SIZE + DISTRICT_GAP);
  const z = (row - (totalRows - 1) / 2) * (DISTRICT_SIZE + DISTRICT_GAP);
  return { x, z };
}

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
      const bx =
        pos.x -
        DISTRICT_SIZE / 2 +
        3 +
        col * spacing +
        spacing / 2 +
        (rx - 0.5) * jitter;
      const bz =
        pos.z -
        DISTRICT_SIZE / 2 +
        3 +
        row * spacing +
        spacing / 2 +
        (rz - 0.5) * jitter;
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
      });
    });
  });
  return out;
}
