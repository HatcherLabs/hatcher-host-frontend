'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';

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
      {/* Shelf frame */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[2.5, 2.5, 0.5]} />
        <meshStandardMaterial color={0x22222a} metalness={0.4} roughness={0.7} />
      </mesh>
      {/* Shelf dividers — horizontal bars */}
      {[0.6, 1.2, 1.8].map(y => (
        <mesh key={y} position={[0, y, 0.26]}>
          <boxGeometry args={[2.45, 0.04, 0.04]} />
          <meshStandardMaterial color={palette.primary} emissive={palette.primary} emissiveIntensity={0.5} toneMapped={false} />
        </mesh>
      ))}
      {/* "Books" — vertical planes per shelf */}
      {[0, 1, 2].map(row => (
        <group key={row}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh
              key={i}
              position={[-0.95 + i * 0.38, 0.3 + row * 0.6, 0.28]}
              castShadow
            >
              <boxGeometry args={[0.26, 0.5, 0.05]} />
              <meshStandardMaterial
                color={palette.accent}
                emissive={palette.accent}
                emissiveIntensity={hasMemory ? 0.6 : 0.2}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}
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
