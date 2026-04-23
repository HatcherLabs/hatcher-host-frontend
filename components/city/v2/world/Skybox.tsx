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
  // Use HDRI only for ambient + PBR reflections. Do NOT render it as
  // the page background — the neon-city HDRIs show real photographed
  // skyscrapers at the horizon which dwarf our 600u ground plane and
  // make the city feel like it sits "on a plank" inside someone
  // else's city. CitySceneV2 sets a flat cyber-dark <color attach="
  // background"> and <fog> blends the grid into it smoothly.
  return (
    <Environment
      files={`/assets/3d/city/skybox/${file}`}
      background={false}
    />
  );
}
