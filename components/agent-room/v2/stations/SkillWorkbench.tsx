'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { KenneyModel } from './KenneyModel';

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
      <ProximityHalo color={palette.primary} active={!!isNear} />
      {/* Corner desk with monitor + keyboard — Kenney Space Kit CC0 */}
      <KenneyModel
        url="desk_computer_corner.glb"
        targetHeight={1.2}
        emissive={palette.primary}
        emissiveIntensity={isNear ? 0.3 : 0.1}
      />
      {/* Framework-tinted glow tools floating above the desk */}
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[-0.4 + i * 0.4, 1.45, -0.15]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.35, 12]} />
          <meshStandardMaterial
            color={palette.accent}
            emissive={palette.accent}
            emissiveIntensity={emissiveIntensity}
            toneMapped={false}
          />
        </mesh>
      ))}
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
