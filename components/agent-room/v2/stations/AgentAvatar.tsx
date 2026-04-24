'use client';
import { Suspense } from 'react';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { GlbRobot } from '@/components/agent-room/GlbRobot';
import { paletteFor as legacyPaletteFor } from '@/components/agent-room/colors';

interface Props {
  station: Station;
  framework: string;
  onClick: () => void;
  isNear?: boolean;
}

export function AgentAvatar({ station, framework, onClick, isNear }: Props) {
  const palette = paletteFor(framework);
  const legacyPalette = legacyPaletteFor(framework);

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]}>
      <Suspense fallback={null}>
        <GlbRobot palette={legacyPalette} framework={framework} />
      </Suspense>
      <mesh position={[0, 1.3, 0]} onClick={onClick}>
        <cylinderGeometry args={[1.2, 1.2, 2.8, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <Html position={[0, 2.8, 0]} center distanceFactor={8} occlude="blending">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="pointer-events-auto whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium backdrop-blur transition"
          style={{
            borderColor: palette.primary,
            background: isNear ? palette.primary : 'rgba(0,0,0,0.55)',
            color: isNear ? '#000' : '#fff',
            boxShadow: isNear ? `0 0 18px ${palette.primary}` : 'none',
          }}
        >
          💬 Talk
        </button>
      </Html>
    </group>
  );
}
