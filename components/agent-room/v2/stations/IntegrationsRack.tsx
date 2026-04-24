'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';

const PLATFORMS = ['discord', 'telegram', 'twitter', 'whatsapp', 'slack'] as const;

interface Props {
  station: Station;
  framework: string;
  connected: Set<string>;
  onClick: () => void;
  isNear?: boolean;
}

export function IntegrationsRack({ station, framework, connected, onClick, isNear }: Props) {
  const palette = paletteFor(framework);
  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      {/* Rack body */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 2, 0.7]} />
        <meshStandardMaterial color={0x22222a} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Framework-tinted trim */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[1.45, 0.04, 0.75]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.99, 0]}>
        <boxGeometry args={[1.45, 0.04, 0.75]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} />
      </mesh>
      {/* 5 LED slots */}
      {PLATFORMS.map((p, i) => {
        const on = connected.has(p);
        return (
          <group key={p} position={[0, 1.7 - i * 0.3, 0.36]}>
            {/* LED */}
            <mesh>
              <boxGeometry args={[0.09, 0.09, 0.09]} />
              <meshBasicMaterial color={on ? '#22c55e' : '#525252'} toneMapped={false} />
            </mesh>
            {/* Slot slot */}
            <mesh position={[0.35, 0, 0]}>
              <boxGeometry args={[0.5, 0.15, 0.05]} />
              <meshStandardMaterial color={0x0b0b12} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
      <Html position={[0, 2.4, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur transition"
          style={{
            borderColor: palette.primary,
            background: isNear ? `${palette.primary}cc` : 'rgba(0,0,0,0.55)',
            color: isNear ? '#000' : '#fff',
          }}
        >
          🔌 Integrations
        </div>
      </Html>
    </group>
  );
}
