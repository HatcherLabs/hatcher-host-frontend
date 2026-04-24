'use client';
import { paletteFor } from '../colors';
import { ROOM_HALF, ROOM_HEIGHT } from './grid';

interface Props { framework: string; }

/**
 * Small decor touches that make each framework's room feel distinct
 * without redoing the floor plan. Applied as a child of RoomShell.
 * All geometry is tiny enough that the cost is negligible.
 */
export function FrameworkDecor({ framework }: Props) {
  const palette = paletteFor(framework);

  switch (framework) {
    case 'openclaw':
      // Industrial workshop — pipes running along the upper walls.
      return (
        <group>
          {[-1, 1].map(sx => (
            <mesh key={sx} position={[sx * ROOM_HALF * 0.95, ROOM_HEIGHT - 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.09, 0.09, ROOM_HALF * 1.8, 12]} />
              <meshStandardMaterial color={0x2a2a34} metalness={0.9} roughness={0.35} />
            </mesh>
          ))}
          {/* Grid floor stripes */}
          {[-2.5, 0, 2.5].map(z => (
            <mesh key={z} position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[ROOM_HALF * 1.95, 0.04]} />
              <meshBasicMaterial color={palette.primary} toneMapped={false} opacity={0.35} transparent />
            </mesh>
          ))}
        </group>
      );

    case 'hermes':
      // Library — tall arched window frames on the front wall (-z side).
      return (
        <group>
          {[-3, 0, 3].map(x => (
            <mesh key={x} position={[x, ROOM_HEIGHT * 0.55, -ROOM_HALF + 0.02]}>
              <planeGeometry args={[1.2, ROOM_HEIGHT * 0.65]} />
              <meshBasicMaterial color={palette.primary} toneMapped={false} opacity={0.18} transparent />
            </mesh>
          ))}
          {/* Chandelier node — an emissive sphere hanging from the ceiling */}
          <mesh position={[0, ROOM_HEIGHT - 0.8, 0]}>
            <sphereGeometry args={[0.28, 16, 16]} />
            <meshBasicMaterial color={palette.accent} toneMapped={false} />
          </mesh>
          <mesh position={[0, ROOM_HEIGHT - 0.4, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.8, 6]} />
            <meshStandardMaterial color={0x111117} />
          </mesh>
        </group>
      );

    case 'elizaos':
      // Plaza — central water fountain glowing blue.
      return (
        <group>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[1.1, 1.3, 0.3, 24]} />
            <meshStandardMaterial color={0x1b2a44} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 1.0, 32]} />
            <meshBasicMaterial color={palette.primary} toneMapped={false} opacity={0.55} transparent side={2} />
          </mesh>
          {/* Fountain jet — thin tall emissive cylinder */}
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.04, 0.08, 1.2, 8]} />
            <meshBasicMaterial color={palette.accent} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        </group>
      );

    case 'milady':
      // Studio — dressing mirror arch on the back wall with pink frame.
      return (
        <group>
          <mesh position={[0, ROOM_HEIGHT * 0.5, ROOM_HALF - 0.02]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[2.4, ROOM_HEIGHT * 0.55]} />
            <meshBasicMaterial color={palette.primary} toneMapped={false} opacity={0.22} transparent />
          </mesh>
          {/* Heart pendant centered above the pedestal */}
          <mesh position={[0, ROOM_HEIGHT - 1.1, ROOM_HALF - 0.2]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshBasicMaterial color={palette.accent} toneMapped={false} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}
