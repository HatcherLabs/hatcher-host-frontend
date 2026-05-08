import type { LiveCityNode } from './liveCityHandoff';

export interface LiveAgentPose {
  x: number;
  z: number;
  heading: number;
}

type PathNode = Pick<LiveCityNode, 'x' | 'z'>;

export function makeLiveAgentLoopPath(
  pathNodes: PathNode[],
  fallbackX: number,
  fallbackZ: number,
): PathNode[] {
  const nodes =
    pathNodes.length > 1
      ? pathNodes
      : [
          { x: fallbackX, z: fallbackZ },
          { x: fallbackX + 1, z: fallbackZ + 1 },
        ];
  return [...nodes, nodes[0]!];
}

export function sampleLiveAgentPath(
  nodes: PathNode[],
  distance: number,
): LiveAgentPose {
  if (nodes.length < 2) return { x: 0, z: 0, heading: 0 };

  let total = 0;
  const segments = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    const length = Math.max(0.001, Math.hypot(b.x - a.x, b.z - a.z));
    segments.push({ a, b, length });
    total += length;
  }

  let remaining = ((distance % total) + total) % total;
  for (const segment of segments) {
    if (remaining > segment.length) {
      remaining -= segment.length;
      continue;
    }
    const t = remaining / segment.length;
    const x = segment.a.x + (segment.b.x - segment.a.x) * t;
    const z = segment.a.z + (segment.b.z - segment.a.z) * t;
    return {
      x,
      z,
      heading: Math.atan2(segment.b.x - segment.a.x, segment.b.z - segment.a.z),
    };
  }

  const fallback = nodes[0]!;
  return { x: fallback.x, z: fallback.z, heading: 0 };
}
