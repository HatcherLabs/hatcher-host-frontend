'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { MetalBox, NeonBar, Led } from './CyberParts';

const PLATFORMS = ['discord', 'telegram', 'twitter', 'whatsapp', 'slack'] as const;

interface Props {
  station: Station;
  framework: string;
  connected: Set<string>;
  onClick: () => void;
  isNear?: boolean;
  hideLabel?: boolean;
}

export function IntegrationsRack({
  station,
  framework,
  connected,
  onClick,
  isNear,
  hideLabel,
}: Props) {
  const palette = paletteFor(framework);
  const edgeColor = palette.primary;

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={edgeColor} active={!!isNear} />

      {/* Main rack body — tall dark cabinet */}
      <MetalBox size={[1.3, 2.4, 0.8]} position={[0, 1.2, 0]} />

      {/* Top + bottom neon trim */}
      <NeonBar start={[-0.7, 0.02, 0.42]} end={[0.7, 0.02, 0.42]} color={edgeColor} thickness={0.04} />
      <NeonBar start={[-0.7, 2.38, 0.42]} end={[0.7, 2.38, 0.42]} color={edgeColor} thickness={0.04} />
      {/* Vertical trim on the front corners */}
      <NeonBar start={[-0.65, 0.02, 0.41]} end={[-0.65, 2.38, 0.41]} color={edgeColor} thickness={0.025} />
      <NeonBar start={[0.65, 0.02, 0.41]} end={[0.65, 2.38, 0.41]} color={edgeColor} thickness={0.025} />

      {/* 5 horizontal "blade" slots on the front */}
      {PLATFORMS.map((p, i) => {
        const y = 1.95 - i * 0.3;
        const on = connected.has(p);
        return (
          <group key={p} position={[0, y, 0.41]}>
            {/* Slot recess (slightly inset) */}
            <mesh>
              <boxGeometry args={[1.05, 0.22, 0.02]} />
              <meshStandardMaterial color={0x08080f} metalness={0.4} roughness={0.7} />
            </mesh>
            {/* Inner glowing strip — green if connected, dim grey otherwise */}
            <mesh position={[0, 0, 0.012]}>
              <boxGeometry args={[0.95, 0.04, 0.01]} />
              <meshBasicMaterial color={on ? '#22c55e' : '#2b2b33'} toneMapped={false} />
            </mesh>
            {/* Status LED on the right edge of the slot */}
            <Led position={[0.47, 0, 0.02]} color={on ? '#22c55e' : '#3f3f46'} size={0.05} />
          </group>
        );
      })}

      {/* Ventilation grille along the bottom */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} position={[-0.4 + i * 0.2, 0.3, 0.41]}>
          <boxGeometry args={[0.12, 0.12, 0.015]} />
          <meshStandardMaterial color={0x0a0a10} metalness={0.4} roughness={0.85} />
        </mesh>
      ))}

      {!hideLabel && (
        <Html position={[0, 2.7, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
          <div
            className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
            style={{ borderColor: edgeColor, background: 'rgba(0,0,0,0.55)' }}
          >
            🔌 Integrations
          </div>
        </Html>
      )}
    </group>
  );
}
