'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { MetalBox, NeonBar, Screen, Led } from './CyberParts';

interface Props {
  station: Station;
  framework: string;
  onClick: () => void;
  isNear?: boolean;
  hideLabel?: boolean;
}

export function ConfigTerminal({ station, framework, onClick, isNear, hideLabel }: Props) {
  const palette = paletteFor(framework);
  const edgeColor = palette.primary;

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={edgeColor} active={!!isNear} radius={1.3} />

      {/* Pedestal base */}
      <MetalBox size={[0.7, 0.9, 0.6]} position={[0, 0.45, 0]} />
      <NeonBar start={[-0.38, 0.91, 0.3]} end={[0.38, 0.91, 0.3]} color={edgeColor} thickness={0.035} />

      {/* Upright monitor panel (tilted slightly back) */}
      <group position={[0, 1.5, 0]} rotation={[0.12, 0, 0]}>
        <MetalBox size={[1.0, 0.75, 0.06]} position={[0, 0, 0]} />
        <Screen
          size={[0.86, 0.6]}
          position={[0, 0, 0.04]}
          color={palette.primary}
          intensity={isNear ? 1 : 0.7}
        />
        {/* Vertical neon on either side of the screen */}
        <NeonBar start={[-0.52, -0.38, 0.04]} end={[-0.52, 0.38, 0.04]} color={edgeColor} thickness={0.025} />
        <NeonBar start={[0.52, -0.38, 0.04]} end={[0.52, 0.38, 0.04]} color={edgeColor} thickness={0.025} />
      </group>

      {/* Tiny indicator LEDs on the pedestal front */}
      <Led position={[-0.2, 0.6, 0.32]} color={palette.accent} size={0.035} />
      <Led position={[0, 0.6, 0.32]} color={palette.accent} size={0.035} />
      <Led position={[0.2, 0.6, 0.32]} color={palette.accent} size={0.035} />

      {!hideLabel && (
        <Html position={[0, 2.3, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
          <div
            className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
            style={{ borderColor: edgeColor, background: 'rgba(0,0,0,0.55)' }}
          >
            ⚙ Config
          </div>
        </Html>
      )}
    </group>
  );
}
