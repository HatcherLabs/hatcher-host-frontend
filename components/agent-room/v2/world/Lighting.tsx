'use client';
import { paletteFor } from '../colors';
import { ROOM_HALF, ROOM_HEIGHT } from './grid';

interface Props { framework: string; }

export function Lighting({ framework }: Props) {
  const palette = paletteFor(framework);
  return (
    <group>
      <ambientLight color={palette.ambient} intensity={0.55} />
      <hemisphereLight color={palette.primary} groundColor={0x000000} intensity={0.2} />
      <directionalLight position={[0, ROOM_HEIGHT * 2, 0]} intensity={0.6} castShadow />
      {[-1, 1].flatMap(sx =>
        [-1, 1].map(sz => (
          <pointLight
            key={`${sx}_${sz}`}
            color={palette.primary}
            intensity={6}
            distance={9}
            position={[sx * (ROOM_HALF - 0.5), ROOM_HEIGHT - 0.3, sz * (ROOM_HALF - 0.5)]}
          />
        ))
      )}
    </group>
  );
}
