'use client';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import type { StationLayout, StationId } from '../world/layout';
import { INTERACT_RADIUS } from '../world/grid';

// Stations you can actually interact with (open a panel / toggle state).
// Stats Hologram is purely read-only ambient decor so we skip it here —
// otherwise the "Press E" hint shows near it but pressing E does nothing,
// which reads as a bug.
const INTERACTABLE: ReadonlySet<StationId> = new Set<StationId>([
  'agentAvatar',
  'skillWorkbench',
  'integrationsRack',
  'statusConsole',
  'logWall',
  'memoryShelves',
  'configTerminal',
  'pluginsCabinet',
]);

export function useStationProximity(
  playerPos: React.MutableRefObject<THREE.Vector3>,
  layout: StationLayout | null,
): StationId | null {
  const [nearest, setNearest] = useState<StationId | null>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!layout) return;
    const tick = () => {
      let best: { id: StationId; d: number } | null = null;
      for (const s of Object.values(layout)) {
        if (!INTERACTABLE.has(s.id)) continue;
        const dx = playerPos.current.x - s.position[0];
        const dz = playerPos.current.z - s.position[2];
        const d = Math.hypot(dx, dz);
        if (d < INTERACT_RADIUS && (!best || d < best.d)) best = { id: s.id, d };
      }
      const nextId = best?.id ?? null;
      setNearest(prev => (prev === nextId ? prev : nextId));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [layout, playerPos]);

  return nearest;
}
