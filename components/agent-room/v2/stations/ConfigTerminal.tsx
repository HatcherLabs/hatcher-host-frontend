'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';

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
      {/* Base */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.6, 0.7]} />
        <meshStandardMaterial color={0x1d1d25} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Tilted display */}
      <mesh position={[0, 0.7, 0.05]} rotation={[-0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.92, 0.6, 0.06]} />
        <meshStandardMaterial color={0x0b0b12} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Screen emissive */}
      <mesh position={[0, 0.7, 0.09]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.82, 0.5]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} opacity={0.7} transparent />
      </mesh>
      <Html position={[0, 1.5, 0]} center distanceFactor={10}>
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
