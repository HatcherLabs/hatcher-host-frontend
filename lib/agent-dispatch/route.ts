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
 * A there-and-back loop from `start` to `dest`, cornered Manhattan-style so the
 * courier reads as following the street grid: out via one corner, home via the
 * other. The courier travels distance 0 -> totalLength once, then the run ends.
 */
export function buildDispatchRoute(start: Pt, dest: Pt): Pt[] {
  const cornerOut = { x: dest.x, z: start.z };
  const cornerBack = { x: start.x, z: dest.z };
  return [
    { x: start.x, z: start.z },
    cornerOut,
    { x: dest.x, z: dest.z },
    cornerBack,
    { x: start.x, z: start.z },
  ];
}

/** Evenly spaced collectibles along the route (excluding the very ends). */
export function spawnPackets(route: Pt[], totalLength: number, count: number): DispatchPacket[] {
  const packets: DispatchPacket[] = [];
  for (let i = 1; i <= count; i++) {
    const d = (i / (count + 1)) * totalLength;
    const p = sampleLiveAgentPath(route, d);
    packets.push({ x: p.x, z: p.z, collected: false });
  }
  return packets;
}
