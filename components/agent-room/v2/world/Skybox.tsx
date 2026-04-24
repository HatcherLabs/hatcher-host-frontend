'use client';
import { Environment } from '@react-three/drei';

interface Props { framework: string; }

// Reuses the city/v2 night HDRI (already in /public/assets/3d/city/skybox).
// The room is enclosed so the HDRI is never seen as background — it's
// used solely for ambient PBR reflections / indirect light tint.
export function Skybox({ framework }: Props) {
  void framework;
  return <Environment files="/assets/3d/city/skybox/night.hdr" background={false} />;
}
