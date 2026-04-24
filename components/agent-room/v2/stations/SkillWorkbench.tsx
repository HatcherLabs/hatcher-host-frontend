'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { MetalBox, NeonBar, Screen } from './CyberParts';

interface Props {
  station: Station;
  framework: string;
  onClick: () => void;
  isNear?: boolean;
  hideLabel?: boolean;
}

export function SkillWorkbench({ station, framework, onClick, isNear, hideLabel }: Props) {
  const palette = paletteFor(framework);
  const edgeColor = palette.primary;
  const toolGlow = isNear ? 1.8 : 0.9;

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={edgeColor} active={!!isNear} />

      {/* Two thin legs under the tabletop */}
      <MetalBox size={[0.1, 0.85, 0.1]} position={[-1.05, 0.425, -0.45]} />
      <MetalBox size={[0.1, 0.85, 0.1]} position={[1.05, 0.425, -0.45]} />
      <MetalBox size={[0.1, 0.85, 0.1]} position={[-1.05, 0.425, 0.45]} />
      <MetalBox size={[0.1, 0.85, 0.1]} position={[1.05, 0.425, 0.45]} />

      {/* Tabletop */}
      <MetalBox size={[2.3, 0.08, 1.1]} position={[0, 0.9, 0]} />

      {/* Front edge — neon trim */}
      <NeonBar
        start={[-1.15, 0.86, 0.55]}
        end={[1.15, 0.86, 0.55]}
        color={edgeColor}
        thickness={0.04}
      />
      {/* Back edge neon */}
      <NeonBar
        start={[-1.15, 0.86, -0.55]}
        end={[1.15, 0.86, -0.55]}
        color={edgeColor}
      />

      {/* Back panel with screen */}
      <MetalBox size={[1.8, 0.95, 0.06]} position={[0, 1.45, -0.52]} />
      <Screen
        size={[1.5, 0.7]}
        position={[0, 1.45, -0.49]}
        rotation={[0, 0, 0]}
        color={palette.primary}
        intensity={isNear ? 1 : 0.75}
      />

      {/* 3 glowing "tools" — upright cylinders in a rack */}
      {[-0.55, 0, 0.55].map((x, i) => (
        <group key={i} position={[x, 1.05, 0.3]}>
          {/* Mount */}
          <mesh>
            <cylinderGeometry args={[0.06, 0.08, 0.04, 12]} />
            <meshStandardMaterial color={0x222228} metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Glowing rod */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.4, 12]} />
            <meshStandardMaterial
              color={palette.accent}
              emissive={palette.accent}
              emissiveIntensity={toolGlow}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {!hideLabel && (
        <Html position={[0, 2.15, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
          <div
            className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
            style={{ borderColor: edgeColor, background: 'rgba(0,0,0,0.55)' }}
          >
            🛠 Skills
          </div>
        </Html>
      )}
    </group>
  );
}
