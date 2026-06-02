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
  const steps = 3 + Math.floor(Math.random() * 4); // 3-6 L-shaped steps (longer, windier)
  let cx = start.x;
  let cz = start.z;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const last = i === steps;
    const jitter = last ? 0 : 24; // bigger detours → longer, more random paths
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
