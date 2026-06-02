import { sampleLiveAgentPath } from '@/components/city/v3/liveAgentMotion';
import type { DispatchPacket } from './config';

type Pt = { x: number; z: number };

export function pathLength(nodes: Pt[]): number {
  let total = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    total += Math.hypot(nodes[i + 1]!.x - nodes[i]!.x, nodes[i + 1]!.z - nodes[i]!.z);
  }
  return total;
}

/**
 * A varied one-way path from `start` to `dest`, cornered Manhattan-style (right
 * angles, reads as following the street grid) but with a random number of
 * staircase steps and jittered intermediate waypoints so no two runs trace the
 * same boring rectangle. Ends AT the destination (no round trip).
 */
export function buildDispatchRoute(start: Pt, dest: Pt): Pt[] {
  const pts: Pt[] = [{ x: start.x, z: start.z }];
  const steps = 4 + Math.floor(Math.random() * 5); // 4-8 L-shaped steps (long, windy)
  let cx = start.x;
  let cz = start.z;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const last = i === steps;
    const jitter = last ? 0 : 36; // big detours → much longer, more random paths
    const nx = last ? dest.x : start.x + (dest.x - start.x) * t + (Math.random() - 0.5) * jitter;
    const nz = last ? dest.z : start.z + (dest.z - start.z) * t + (Math.random() - 0.5) * jitter;
    // Alternate which axis we corner on first, for shape variety.
    if (i % 2 === 1) {
      pts.push({ x: nx, z: cz });
      pts.push({ x: nx, z: nz });
    } else {
      pts.push({ x: cx, z: nz });
      pts.push({ x: nx, z: nz });
    }
    cx = nx;
    cz = nz;
  }
  return pts;
}

/**
 * Evenly spaced collectibles along the route (excluding the very ends). The
 * last `rareCount` packets are flagged rare (worth a large multiplier).
 */
export function spawnPackets(
  route: Pt[],
  totalLength: number,
  count: number,
  rareCount = 0,
): DispatchPacket[] {
  const packets: DispatchPacket[] = [];
  for (let i = 1; i <= count; i++) {
    const d = (i / (count + 1)) * totalLength;
    const p = sampleLiveAgentPath(route, d);
    packets.push({ x: p.x, z: p.z, collected: false, rare: i > count - rareCount });
  }
  return packets;
}

/**
 * Collectibles scattered across the STREET GRID in the region between start and
 * dest (not strung along the route), so a manual driver has to hunt for them.
 * Picks random street nodes (reachable — they sit on roads, not inside
 * buildings) with a little jitter. Falls back to the whole grid if the local
 * region is too sparse.
 */
export function scatterPackets(
  nodes: Pt[],
  start: Pt,
  dest: Pt,
  count: number,
  rareCount = 0,
): DispatchPacket[] {
  const margin = 55;
  const minX = Math.min(start.x, dest.x) - margin;
  const maxX = Math.max(start.x, dest.x) + margin;
  const minZ = Math.min(start.z, dest.z) - margin;
  const maxZ = Math.max(start.z, dest.z) + margin;
  const region = nodes.filter((n) => n.x >= minX && n.x <= maxX && n.z >= minZ && n.z <= maxZ);
  const pool = region.length >= count ? region : nodes.length ? nodes : [start, dest];

  const picked: Pt[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (picked.length < count && guard < count * 25 && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    if (!used.has(i) || used.size >= pool.length) {
      used.add(i);
      picked.push(pool[i]!);
    }
    guard += 1;
  }

  return picked.map((p, i) => ({
    x: p.x + (Math.random() - 0.5) * 4,
    z: p.z + (Math.random() - 0.5) * 4,
    collected: false,
    rare: i >= picked.length - rareCount,
  }));
}
