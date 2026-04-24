'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { MetalBox, NeonBar } from './CyberParts';

interface Props {
  station: Station;
  framework: string;
  installedCount: number;
  onClick: () => void;
  isNear?: boolean;
  hideLabel?: boolean;
}

const DRAWER_COUNT = 5;

export function PluginsCabinet({
  station,
  framework,
  installedCount,
  onClick,
  isNear,
  hideLabel,
}: Props) {
  const palette = paletteFor(framework);
  const edgeColor = palette.primary;

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={edgeColor} active={!!isNear} />

      {/* Main cabinet body */}
      <MetalBox size={[1.2, 1.8, 0.55]} position={[0, 0.9, 0]} />

      {/* Neon trim outlining the cabinet */}
      <NeonBar start={[-0.62, 0.02, 0.29]} end={[-0.62, 1.78, 0.29]} color={edgeColor} thickness={0.025} />
      <NeonBar start={[0.62, 0.02, 0.29]} end={[0.62, 1.78, 0.29]} color={edgeColor} thickness={0.025} />
      <NeonBar start={[-0.62, 0.02, 0.29]} end={[0.62, 0.02, 0.29]} color={edgeColor} thickness={0.03} />
      <NeonBar start={[-0.62, 1.78, 0.29]} end={[0.62, 1.78, 0.29]} color={edgeColor} thickness={0.03} />

      {/* Drawers — each drawer glows if its index is within installedCount */}
      {Array.from({ length: DRAWER_COUNT }, (_, i) => {
        const y = 0.22 + i * 0.34;
        const on = i < Math.min(DRAWER_COUNT, installedCount);
        return (
          <group key={i} position={[0, y, 0.28]}>
            {/* Drawer front */}
            <mesh castShadow>
              <boxGeometry args={[1.1, 0.3, 0.05]} />
              <meshStandardMaterial
                color={on ? palette.accent : 0x18181f}
                emissive={on ? palette.accent : 0x000000}
                emissiveIntensity={on ? (isNear ? 1.2 : 0.6) : 0}
                metalness={0.4}
                roughness={0.5}
                toneMapped={false}
              />
            </mesh>
            {/* Handle */}
            <mesh position={[0, 0, 0.035]}>
              <boxGeometry args={[0.25, 0.05, 0.025]} />
              <meshStandardMaterial color={0x0a0a10} metalness={0.95} roughness={0.15} />
            </mesh>
            {/* Slot LED */}
            <mesh position={[0.4, 0, 0.03]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color={on ? '#22c55e' : '#3f3f46'} toneMapped={false} />
            </mesh>
          </group>
        );
      })}

      {!hideLabel && (
        <Html position={[0, 2.1, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
          <div
            className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
            style={{ borderColor: edgeColor, background: 'rgba(0,0,0,0.55)' }}
          >
            🧩 Plugins{installedCount > 0 && ` · ${installedCount}`}
          </div>
        </Html>
      )}
    </group>
  );
}
