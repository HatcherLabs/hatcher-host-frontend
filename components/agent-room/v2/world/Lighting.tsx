'use client';
import { paletteFor } from '../colors';
import { ROOM_HALF, ROOM_HEIGHT } from './grid';

interface Props { framework: string; }

export function Lighting({ framework }: Props) {
  const palette = paletteFor(framework);
  return (
    <group>
      {/* Base ambient — intentionally dim. The room leans on accent
          point lights in corners plus the HDRI environment map to read
          as "lit by neon" rather than "lit by fluorescents". */}
      <ambientLight color={palette.ambient} intensity={0.18} />
      <hemisphereLight color={palette.primary} groundColor={0x000000} intensity={0.08} />
      {/* Soft key from above, no shadows — shadows in low/medium tier are off anyway */}
      <directionalLight position={[0, ROOM_HEIGHT * 1.4, 0]} intensity={0.25} />
      {/* Two corner neon fills (diagonal) — four was too much */}
      {[-1, 1].map(s => (
        <pointLight
          key={s}
          color={palette.primary}
          intensity={1.8}
          distance={ROOM_HEIGHT * 1.4}
          position={[s * (ROOM_HALF - 0.8), ROOM_HEIGHT - 0.6, s * (ROOM_HALF - 0.8)]}
        />
      ))}
    </group>
  );
}
