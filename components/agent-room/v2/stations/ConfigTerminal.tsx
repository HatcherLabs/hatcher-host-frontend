'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { KenneyModel } from './KenneyModel';

interface Props {
  station: Station;
  framework: string;
  onClick: () => void;
  isNear?: boolean;
}

export function ConfigTerminal({ station, framework, onClick, isNear }: Props) {
  const palette = paletteFor(framework);
  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={palette.primary} active={!!isNear} radius={1.3} />
      {/* Standalone computer screen — Kenney Space Kit CC0 */}
      <KenneyModel
        url="desk_computer_screen.glb"
        targetHeight={1.0}
        emissive={palette.primary}
        emissiveIntensity={isNear ? 0.35 : 0.15}
      />
      <Html position={[0, 1.5, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
          style={{
            borderColor: palette.primary,
            background: isNear ? `${palette.primary}cc` : 'rgba(0,0,0,0.55)',
            color: isNear ? '#000' : '#fff',
          }}
        >
          ⚙ Config
        </div>
      </Html>
    </group>
  );
}
