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
  hideLabel?: boolean;
}

export function AgentAvatar({ station, framework, onClick, isNear, hideLabel }: Props) {
  const palette = paletteFor(framework);
  const legacyPalette = legacyPaletteFor(framework);

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]}>
      {/* GlbRobot internally applies scale 0.55 (≈2.75m tall). At this
          scale the robot towers over a 1.55m-eye player in first person
          and looks disproportionate — wrap in an extra 0.75 so it reads
          as a ~2m tall humanoid instead. */}
      <group scale={0.75}>
        <Suspense fallback={null}>
          <GlbRobot palette={legacyPalette} framework={framework} />
        </Suspense>
      </group>
      <mesh position={[0, 1.0, 0]} onClick={onClick}>
        <cylinderGeometry args={[0.9, 0.9, 2.1, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {!hideLabel && (
        <Html position={[0, 2.8, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
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
      )}
    </group>
  );
}
