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

export function SkillWorkbench({ station, framework, onClick, isNear }: Props) {
  const palette = paletteFor(framework);
  const emissiveIntensity = isNear ? 1.8 : 0.9;
  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      {/* Table body */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.0, 1.2]} />
        <meshStandardMaterial color={0x2a2a34} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Glowing top edge */}
      <mesh position={[0, 1.01, 0]}>
        <boxGeometry args={[2.25, 0.05, 1.25]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} />
      </mesh>
      {/* Tool rack */}
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[-0.7 + i * 0.7, 1.4, -0.3]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 12]} />
          <meshStandardMaterial
            color={palette.accent}
            emissive={palette.accent}
            emissiveIntensity={emissiveIntensity}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* Screen on the back */}
      <mesh position={[0, 1.5, -0.55]} rotation={[-0.15, 0, 0]}>
        <planeGeometry args={[1.0, 0.5]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} opacity={0.6} transparent />
      </mesh>
      <Html position={[0, 2.3, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
          style={{ borderColor: palette.primary, background: 'rgba(0,0,0,0.55)' }}
        >
          🛠 Skills
        </div>
      </Html>
    </group>
  );
}
