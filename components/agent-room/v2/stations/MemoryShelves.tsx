'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { MetalBox, NeonBar } from './CyberParts';

interface Props {
  station: Station;
  framework: string;
  hasMemory: boolean;
  onClick: () => void;
  isNear?: boolean;
  hideLabel?: boolean;
}

export function MemoryShelves({
  station,
  framework,
  hasMemory,
  onClick,
  isNear,
  hideLabel,
}: Props) {
  const palette = paletteFor(framework);
  const edgeColor = palette.primary;
  const shelfGlow = hasMemory ? 1.2 : 0.35;

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={edgeColor} active={!!isNear} />

      {/* Bookcase frame — full-height dark cabinet */}
      <MetalBox size={[2.0, 2.4, 0.55]} position={[0, 1.2, 0]} />

      {/* Side and top/bottom neon trim */}
      <NeonBar start={[-1.02, 0.02, 0.29]} end={[-1.02, 2.38, 0.29]} color={edgeColor} thickness={0.03} />
      <NeonBar start={[1.02, 0.02, 0.29]} end={[1.02, 2.38, 0.29]} color={edgeColor} thickness={0.03} />
      <NeonBar start={[-1.02, 0.02, 0.29]} end={[1.02, 0.02, 0.29]} color={edgeColor} thickness={0.03} />
      <NeonBar start={[-1.02, 2.38, 0.29]} end={[1.02, 2.38, 0.29]} color={edgeColor} thickness={0.03} />

      {/* 4 horizontal shelf dividers */}
      {[0.55, 1.1, 1.65, 2.2].map(y => (
        <mesh key={y} position={[0, y, 0.28]}>
          <boxGeometry args={[1.95, 0.04, 0.05]} />
          <meshBasicMaterial color={edgeColor} toneMapped={false} />
        </mesh>
      ))}

      {/* "Data cards" on each shelf — rows of thin vertical bars glowing
          when memory exists. Each shelf has 7 bars. */}
      {[0.28, 0.83, 1.38, 1.93].map((y, shelfIdx) => (
        <group key={shelfIdx}>
          {Array.from({ length: 7 }, (_, i) => {
            const x = -0.78 + i * 0.26;
            return (
              <mesh key={i} position={[x, y, 0.27]} castShadow>
                <boxGeometry args={[0.18, 0.42, 0.04]} />
                <meshStandardMaterial
                  color={palette.accent}
                  emissive={palette.accent}
                  emissiveIntensity={shelfGlow * (0.4 + (((i + shelfIdx) * 13) % 7) / 15)}
                  metalness={0.1}
                  roughness={0.5}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {!hideLabel && (
        <Html position={[0, 2.8, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
          <div
            className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
            style={{ borderColor: edgeColor, background: 'rgba(0,0,0,0.55)' }}
          >
            📚 Memory
          </div>
        </Html>
      )}
    </group>
  );
}
