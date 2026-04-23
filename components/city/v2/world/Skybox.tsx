'use client';
import { Environment } from '@react-three/drei';
import { useMemo } from 'react';

export type TimeOfDay = 'day' | 'night';

function resolveAuto(): TimeOfDay {
  const h = new Date().getHours();
  return h >= 6 && h < 19 ? 'day' : 'night';
}

interface Props {
  timeOfDay?: TimeOfDay | 'auto';
}

/**
 * HDRI skybox + PBR environment map. Single lighting source for the
 * city — PBR materials on buildings reflect this map for free.
 *
 * Phase 1 uses day + night only. Dawn/dusk added in later phases.
 */
export function Skybox({ timeOfDay = 'auto' }: Props) {
  const resolved = useMemo(
    () => (timeOfDay === 'auto' ? resolveAuto() : timeOfDay),
    [timeOfDay],
  );
  const file = resolved === 'day' ? 'day.hdr' : 'night.hdr';
  return (
    <Environment
      files={`/assets/3d/city/skybox/${file}`}
      background
      ground={false}
    />
  );
}
