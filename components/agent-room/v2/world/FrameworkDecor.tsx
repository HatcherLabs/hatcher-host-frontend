'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { paletteFor } from '../colors';
import { ROOM_HALF, ROOM_HEIGHT } from './grid';

interface Props { framework: string; }

function Beam({
  start,
  end,
  color = 0x24242c,
  thickness = 0.08,
  emissive,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color?: number | string;
  thickness?: number;
  emissive?: string;
}) {
  const { position, rotation, length } = useMemo(() => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    return {
      position: [mid.x, mid.y, mid.z] as [number, number, number],
      rotation: [e.x, e.y, e.z] as [number, number, number],
      length: len,
    };
  }, [start, end]);

  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[thickness, length, thickness]} />
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.32}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 0.35 : 0}
      />
    </mesh>
  );
}

function OpenClawGantry({ primary, accent }: { primary: string; accent: string }) {
  const carriage = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!carriage.current) return;
    carriage.current.position.x = Math.sin(clock.getElapsedTime() * 0.35) * 1.1;
  });

  return (
    <group>
      <Beam start={[-7.2, ROOM_HEIGHT - 0.9, -6.5]} end={[7.2, ROOM_HEIGHT - 0.9, -6.5]} thickness={0.16} />
      <Beam start={[-7.2, ROOM_HEIGHT - 0.9, 6.5]} end={[7.2, ROOM_HEIGHT - 0.9, 6.5]} thickness={0.16} />
      <Beam start={[-7.2, ROOM_HEIGHT - 1.0, -6.5]} end={[-7.2, ROOM_HEIGHT - 1.0, 6.5]} thickness={0.12} emissive={primary} />
      <Beam start={[7.2, ROOM_HEIGHT - 1.0, -6.5]} end={[7.2, ROOM_HEIGHT - 1.0, 6.5]} thickness={0.12} emissive={primary} />

      <group ref={carriage} position={[0, 0, 0]}>
        <mesh position={[0, ROOM_HEIGHT - 0.95, 0]}>
          <boxGeometry args={[1.1, 0.35, 0.7]} />
          <meshStandardMaterial color={0x202027} metalness={0.9} roughness={0.25} emissive={primary} emissiveIntensity={0.18} />
        </mesh>
        <Beam start={[0, ROOM_HEIGHT - 1.1, 0]} end={[0.7, ROOM_HEIGHT - 2.0, -0.45]} thickness={0.12} />
        <Beam start={[0.7, ROOM_HEIGHT - 2.0, -0.45]} end={[0.05, ROOM_HEIGHT - 2.75, -0.35]} thickness={0.12} />
        <mesh position={[0.7, ROOM_HEIGHT - 2.0, -0.45]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color={0x2a2a32} metalness={0.9} roughness={0.28} emissive={accent} emissiveIntensity={0.18} />
        </mesh>
        {[-1, 1].map((s) => (
          <Beam
            key={s}
            start={[0.05, ROOM_HEIGHT - 2.75, -0.35]}
            end={[s * 0.38, ROOM_HEIGHT - 3.18, -0.55]}
            thickness={0.07}
            emissive={accent}
          />
        ))}
      </group>

      {[-1, 1].map((s) => (
        <group key={s} position={[s * 9.5, 0, -8.6]}>
          <mesh position={[0, 0.65, 0]}>
            <boxGeometry args={[0.55, 1.3, 0.55]} />
            <meshStandardMaterial color={0x1e1e25} metalness={0.86} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <cylinderGeometry args={[0.55, 0.75, 0.32, 6]} />
            <meshStandardMaterial color={0x26262d} metalness={0.9} roughness={0.35} emissive={primary} emissiveIntensity={0.12} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function HermesArchive({ primary, accent }: { primary: string; accent: string }) {
  const orrery = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!orrery.current) return;
    orrery.current.rotation.y = clock.getElapsedTime() * 0.18;
    orrery.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.22) * 0.08;
  });

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (ROOM_HALF - 0.18), 0, 0]} rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          {[-6.5, -3.25, 0, 3.25, 6.5].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 1.35, 0]}>
                <boxGeometry args={[2.2, 2.65, 0.34]} />
                <meshStandardMaterial color={0x121018} metalness={0.35} roughness={0.78} emissive={primary} emissiveIntensity={0.03} />
              </mesh>
              {[0.52, 1.1, 1.68, 2.25].map((y) => (
                <mesh key={y} position={[0, y, 0.19]}>
                  <boxGeometry args={[1.95, 0.035, 0.07]} />
                  <meshBasicMaterial color={primary} toneMapped={false} transparent opacity={0.38} />
                </mesh>
              ))}
              {Array.from({ length: 10 }, (_, i) => (
                <mesh key={i} position={[-0.86 + i * 0.19, 0.8 + (i % 4) * 0.47, 0.23]}>
                  <boxGeometry args={[0.08 + (i % 3) * 0.025, 0.34, 0.045]} />
                  <meshStandardMaterial color={i % 2 ? accent : primary} emissive={i % 2 ? accent : primary} emissiveIntensity={0.18} roughness={0.7} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}

      <group ref={orrery} position={[0, ROOM_HEIGHT - 0.5, 0]} scale={0.55}>
        {[0, Math.PI / 2, Math.PI / 4].map((r, i) => (
          <mesh key={i} rotation={[r, i === 2 ? Math.PI / 3 : 0, 0]}>
            <torusGeometry args={[1.25 + i * 0.22, 0.018, 8, 72]} />
            <meshBasicMaterial color={i === 1 ? accent : primary} toneMapped={false} transparent opacity={0.72} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.35, Math.sin(a * 1.7) * 0.25, Math.sin(a) * 1.35]}>
              <sphereGeometry args={[0.075, 12, 12]} />
              <meshBasicMaterial color={primary} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/**
 * Small decor touches that make each framework's room feel distinct
 * without redoing the floor plan. Applied as a child of RoomShell.
 * All geometry is tiny enough that the cost is negligible.
 */
export function FrameworkDecor({ framework }: Props) {
  const palette = paletteFor(framework);
  const primary = framework === 'openclaw' ? '#39ff88' : palette.primary;
  const accent = framework === 'openclaw' ? '#38bdf8' : palette.accent;

  switch (framework) {
    case 'openclaw':
      // Industrial workshop — pipes running along the upper walls.
      return (
        <group>
          <OpenClawGantry primary={primary} accent={accent} />
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
              <meshBasicMaterial color={primary} toneMapped={false} opacity={0.35} transparent />
            </mesh>
          ))}
        </group>
      );

    case 'hermes':
      // Library — tall arched window frames on the front wall (-z side).
      return (
        <group>
          <HermesArchive primary={palette.primary} accent={palette.accent} />
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

    default:
      return null;
  }
}
