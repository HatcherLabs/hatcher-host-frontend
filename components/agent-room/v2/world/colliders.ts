import type { SolidDisc } from '@/components/city/v2/world/colliders';
import { STATION_COLLIDER_RADIUS, ROOM_HALF } from './grid';
import type { StationLayout } from './layout';

export function collidersFromLayout(layout: StationLayout): SolidDisc[] {
  return Object.values(layout).map(s => ({
    x: s.position[0],
    z: s.position[2],
    r: STATION_COLLIDER_RADIUS,
  }));
}

export function wallColliders(): SolidDisc[] {
  // Approximate walls with 4 huge discs placed just beyond each wall.
  // The character controller's push-out is disc-based; a big radius
  // ensures the character is shoved back inside the room.
  const big = ROOM_HALF * 10;
  return [
    { x: 0, z: -ROOM_HALF - big, r: big },
    { x: 0, z: ROOM_HALF + big,  r: big },
    { x: -ROOM_HALF - big, z: 0, r: big },
    { x: ROOM_HALF + big,  z: 0, r: big },
  ];
}
