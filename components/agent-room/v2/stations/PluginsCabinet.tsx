'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';

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
      {/* Cabinet body */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 2, 0.6]} />
        <meshStandardMaterial color={0x1d1d25} metalness={0.4} roughness={0.6} />
      </mesh>
      {/* 3 drawer fronts */}
      {[0.4, 1.0, 1.6].map((y, i) => {
        const on = i < Math.min(3, installedCount);
        return (
          <group key={y}>
            <mesh position={[0, y, 0.31]}>
              <boxGeometry args={[1.1, 0.5, 0.04]} />
              <meshStandardMaterial
                color={palette.accent}
                emissive={palette.accent}
                emissiveIntensity={on ? 0.7 : 0.2}
                toneMapped={false}
              />
            </mesh>
            {/* Handle */}
            <mesh position={[0, y, 0.34]}>
              <boxGeometry args={[0.18, 0.04, 0.03]} />
              <meshStandardMaterial color={0x0b0b12} metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        );
      })}
      <Html position={[0, 2.3, 0]} center distanceFactor={10}>
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
