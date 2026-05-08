import { createTreeRingSpecs } from './liveCityEnvironment';
import { createSeededRng, type LiveCityGrid } from './liveCityHandoff';
import type { LiveAgentMarkerLayout, LiveBuildingLayout } from './liveLayout';

export const WALK_EYE_HEIGHT = 0.82;
export const WALK_PLAYER_RADIUS = 0.38;
export const WALK_SPEED = 7.4;
export const WALK_FOV = 62;
export const SURVEY_FOV = 45;

export interface WalkPoint {
  x: number;
  z: number;
}

export interface WalkCircleCollider extends WalkPoint {
  radius: number;
}

export interface WalkBoxCollider extends WalkPoint {
  halfX: number;
  halfZ: number;
}

export interface WalkCollisionMap {
  bounds: number;
  boxes: WalkBoxCollider[];
  circles: WalkCircleCollider[];
}

export function createWalkCollisionMap(
  grid: LiveCityGrid,
  buildings: LiveBuildingLayout[],
): WalkCollisionMap {
  const bounds = Math.max(grid.half + 32, 138);
  const boxes = buildings.map((building) => ({
    x: building.x,
    z: building.z,
    halfX: building.visual.width / 2 + 1.35,
    halfZ: building.visual.depth / 2 + 1.35,
  }));
  const treeCircles = createTreeRingSpecs()
    .filter(
      (tree) => Math.abs(tree.x) < bounds + 4 && Math.abs(tree.z) < bounds + 4,
    )
    .map((tree) => ({
      x: tree.x,
      z: tree.z,
      radius: 0.36 + tree.scale * 0.42,
    }));
  const lightCircles = grid.nodes.map((node) => ({
    x: node.x,
    z: node.z,
    radius: 0.34,
  }));
  const buildingTreeCircles = buildings.flatMap((building) => {
    const tree = buildingTreeSpec(building);
    if (!tree) return [];
    return [
      {
        x: building.x + tree.x,
        z: building.z + tree.z,
        radius: 1.65,
      },
    ];
  });

  return {
    bounds,
    boxes,
    circles: [...treeCircles, ...buildingTreeCircles, ...lightCircles],
  };
}

export function createAgentColliders(
  markers: LiveAgentMarkerLayout[],
  resolveMarkerPoint: (marker: LiveAgentMarkerLayout) => WalkPoint,
): WalkCircleCollider[] {
  return markers.map((marker) => {
    const point = resolveMarkerPoint(marker);
    return {
      x: point.x,
      z: point.z,
      radius: 0.58 + marker.width * 0.12,
    };
  });
}

export function resolveWalkPosition(
  desired: WalkPoint,
  previous: WalkPoint,
  collisionMap: WalkCollisionMap,
  dynamicCircles: WalkCircleCollider[] = [],
  playerRadius = WALK_PLAYER_RADIUS,
): WalkPoint {
  const next = {
    x: clamp(desired.x, -collisionMap.bounds, collisionMap.bounds),
    z: clamp(desired.z, -collisionMap.bounds, collisionMap.bounds),
  };
  const circles = [...collisionMap.circles, ...dynamicCircles];

  for (let pass = 0; pass < 3; pass++) {
    for (const box of collisionMap.boxes) {
      pushOutBox(next, previous, box, playerRadius);
    }
    for (const circle of circles) {
      pushOutCircle(next, previous, circle, playerRadius);
    }
    next.x = clamp(next.x, -collisionMap.bounds, collisionMap.bounds);
    next.z = clamp(next.z, -collisionMap.bounds, collisionMap.bounds);
  }

  return next;
}

function pushOutBox(
  point: WalkPoint,
  previous: WalkPoint,
  box: WalkBoxCollider,
  radius: number,
) {
  const dx = point.x - box.x;
  const dz = point.z - box.z;
  const halfX = box.halfX + radius;
  const halfZ = box.halfZ + radius;
  const absX = Math.abs(dx);
  const absZ = Math.abs(dz);
  if (absX >= halfX || absZ >= halfZ) return;

  const overlapX = halfX - absX;
  const overlapZ = halfZ - absZ;
  if (overlapX < overlapZ) {
    point.x += signedPush(dx, previous.x - box.x) * overlapX;
  } else {
    point.z += signedPush(dz, previous.z - box.z) * overlapZ;
  }
}

function pushOutCircle(
  point: WalkPoint,
  previous: WalkPoint,
  circle: WalkCircleCollider,
  radius: number,
) {
  const minDistance = radius + circle.radius;
  let dx = point.x - circle.x;
  let dz = point.z - circle.z;
  let distanceSq = dx * dx + dz * dz;
  if (distanceSq >= minDistance * minDistance) return;

  const previousDx = previous.x - circle.x;
  const previousDz = previous.z - circle.z;
  const previousDistanceSq = previousDx * previousDx + previousDz * previousDz;
  if (previousDistanceSq >= minDistance * minDistance) {
    const previousDistance = Math.sqrt(previousDistanceSq);
    point.x = circle.x + (previousDx / previousDistance) * minDistance;
    point.z = circle.z + (previousDz / previousDistance) * minDistance;
    return;
  }

  if (distanceSq < 0.0001) {
    dx = point.x - previous.x || 1;
    dz = point.z - previous.z || 0;
    distanceSq = dx * dx + dz * dz;
  }

  const distance = Math.sqrt(distanceSq);
  const push = minDistance - distance;
  point.x += (dx / distance) * push;
  point.z += (dz / distance) * push;
}

function signedPush(currentDelta: number, previousDelta: number): number {
  if (Math.abs(previousDelta) > 0.0001) return Math.sign(previousDelta);
  if (Math.abs(currentDelta) > 0.0001) return Math.sign(currentDelta);
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildingTreeSpec(
  building: LiveBuildingLayout,
): { x: number; z: number } | null {
  const { depth, seed, tierKey, width } = building.visual;
  if (tierKey !== 'free' && tierKey !== 'starter') return null;

  const rng = rngAfterVisual(seed);
  if (tierKey === 'free') {
    rng();
    const hasChimney = rng() > 0.4;
    if (hasChimney) {
      rng();
      rng();
      rng();
    }
  } else {
    const pitched = rng() < 0.5;
    if (!pitched) {
      rng();
      rng();
    }
  }

  return makeBuildingTreeSpec(rng, width, depth);
}

function rngAfterVisual(seed: number): () => number {
  const rng = createSeededRng(seed);
  rng();
  rng();
  rng();
  rng();
  return rng;
}

function makeBuildingTreeSpec(
  rng: () => number,
  width: number,
  depth: number,
): { x: number; z: number } | null {
  if (rng() <= 0.4) return null;
  return {
    x: (rng() - 0.5) * width * 1.3,
    z: depth * 0.7 * (rng() < 0.5 ? 1 : -1),
  };
}
