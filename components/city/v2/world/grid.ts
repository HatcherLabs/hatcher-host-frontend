// ====================================================================
// Shared geometry constants for the City V2 grid.
// ====================================================================
// Every world/* file that places something on the map (buildings,
// streets, pads, landmarks, traffic lanes, NPCs, minimap, streetlights,
// labels) must read from HERE, not hardcode the values. If these
// numbers drift between files the city immediately desynchronises —
// buildings land on streets, lanes cut through pads, minimap points
// wrong — and the drift is quiet (no runtime error).
//
// The current target: 700 production agents spread across 25 districts
// should feel spacious, not crammed. With DISTRICT_SIZE=70 and
// LANDMARK_CLEAR_RADIUS=8 we get ~4400 sq units per district available
// for ~28 buildings. That's ~150 sq u per building — roughly 2.5× a
// typical Quaternius footprint, enough air for street-level walking.
// ====================================================================

import { CATEGORIES } from '@/components/city/types';

export const DISTRICT_COLS = 5;
export const DISTRICT_ROWS = Math.ceil(CATEGORIES.length / DISTRICT_COLS);

// One district is DISTRICT_SIZE × DISTRICT_SIZE units. Bumped from 52
// → 70 → 90 as the agent population grew. At 90u, ~28 agents per
// district get ~290 sq u each — roughly 4× a typical Quaternius
// footprint, enough air so buildings don't overlap at scale.
export const DISTRICT_SIZE = 90;
// Gap between two district pads = street lane width. Bumped to 16 so
// two lanes of traffic + sidewalk breathe without a sea of asphalt.
export const DISTRICT_GAP = 16;
export const DISTRICT_STEP = DISTRICT_SIZE + DISTRICT_GAP;

// Landmark clearance — agent buildings are pushed radially out of this
// radius around each pad centre so they don't overlap the landmark.
export const LANDMARK_CLEAR_RADIUS = 8;

// World half-extent the character can roam. Must be >= the outer edge
// of the 5×5 district grid plus a margin.
export const WORLD_HALF = Math.max(
  DISTRICT_COLS * DISTRICT_STEP,
  DISTRICT_ROWS * DISTRICT_STEP,
) / 2 + 40;

// Ground plane edge length. Slight overshoot past 2×WORLD_HALF so the
// texture's rolloff doesn't cut visibly at the edges.
export const GROUND_SIZE = Math.ceil(WORLD_HALF * 2 + 80);

export function districtPosition(idx: number): { x: number; z: number } {
  const col = idx % DISTRICT_COLS;
  const row = Math.floor(idx / DISTRICT_COLS);
  return {
    x: (col - (DISTRICT_COLS - 1) / 2) * DISTRICT_STEP,
    z: (row - (DISTRICT_ROWS - 1) / 2) * DISTRICT_STEP,
  };
}
