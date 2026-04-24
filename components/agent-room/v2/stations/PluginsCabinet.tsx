'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { KenneyModel } from './KenneyModel';

interface Props {
  station: Station;
  framework: string;
  installedCount: number;
  onClick: () => void;
  isNear?: boolean;
}

export function PluginsCabinet({ station, framework, installedCount, onClick, isNear }: Props) {
  const palette = paletteFor(framework);
  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={palette.primary} active={!!isNear} />
      {/* Drawer cabinet — Kenney Furniture Kit CC0.
         Emissive ramps up with installed plugin count so a well-kitted
         agent literally has glowing drawers. */}
      <KenneyModel
        url="cabinet_drawers.glb"
        scale={2.2}
        emissive={palette.accent}
        emissiveIntensity={installedCount > 0 ? (isNear ? 0.55 : 0.25) : 0.08}
      />
      <Html position={[0, 2.3, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
          style={{
            borderColor: palette.primary,
            background: isNear ? `${palette.primary}cc` : 'rgba(0,0,0,0.55)',
            color: isNear ? '#000' : '#fff',
          }}
        >
          🧩 Plugins{installedCount > 0 && ` · ${installedCount}`}
        </div>
      </Html>
    </group>
  );
}
