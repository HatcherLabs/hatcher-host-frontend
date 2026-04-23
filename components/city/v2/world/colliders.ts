import type { CityAgent } from '@/components/city/types';
import { layoutBuildingsV2 } from './Buildings.layout';

export interface SolidDisc {
  x: number;
  z: number;
  r: number;
}

/**
 * Circle colliders derived from agent building layout. Using discs
 * instead of AABBs because (a) Quaternius buildings are roughly
 * square footprints, (b) disc-vs-point distance check is one sqrt per
 * building, and (c) 700 discs at 60fps is ~42k checks/sec — well
 * under budget on every device we target.
 *
 * CharacterController consumes this array and pushes the character
 * radially out of any disc they would otherwise walk into.
 */
export function buildSolidDiscs(agents: CityAgent[]): SolidDisc[] {
  const layouts = layoutBuildingsV2(agents);
  // Radius tuned to Quaternius building footprints — 2.0u works for
  // small/medium, skyscrapers push it to 2.4u but still read as solid.
  return layouts.map((l) => ({ x: l.x, z: l.z, r: 2.1 }));
}
