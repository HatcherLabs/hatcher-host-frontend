'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { KenneyModel } from './KenneyModel';

interface Props {
  station: Station;
  framework: string;
  hasMemory: boolean;
  onClick: () => void;
  isNear?: boolean;
}

export function MemoryShelves({ station, framework, hasMemory, onClick, isNear }: Props) {
  const palette = paletteFor(framework);
  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={palette.primary} active={!!isNear} />
      {/* Bookcase full of lore — Kenney Furniture Kit CC0 */}
      <KenneyModel
        url="bookcase.glb"
        targetHeight={2.2}
        emissive={palette.primary}
        emissiveIntensity={hasMemory ? (isNear ? 0.4 : 0.2) : 0.08}
      />
      <Html position={[0, 2.8, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
          style={{
            borderColor: palette.primary,
            background: isNear ? `${palette.primary}cc` : 'rgba(0,0,0,0.55)',
            color: isNear ? '#000' : '#fff',
          }}
        >
          📚 Memory
        </div>
      </Html>
    </group>
  );
}
