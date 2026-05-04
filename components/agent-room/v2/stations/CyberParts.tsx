'use client';
import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Shared building blocks for procedural cyber stations. All parts are
 * centered on x/z = 0, sit on y = 0, and accept a palette color.
 */

interface MetalProps {
  size: [number, number, number];
  position?: [number, number, number];
  metalness?: number;
  roughness?: number;
}

/** Dark metal slab — primary body of any station. */
export function MetalBox({ size, position = [0, 0, 0], metalness = 0.85, roughness = 0.4 }: MetalProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={0x15151d} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

/** Thin emissive neon bar — used for trim edges around a body. */
export function NeonBar({
  start,
  end,
  color,
  thickness = 0.035,
  opacity = 0.72,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  thickness?: number;
  opacity?: number;
}) {
  const { position, rotation, length } = useMemo(() => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    dir.normalize();
    // Default bar axis is Y (tall cylinder oriented along Y). Align it
    // to the direction from a→b using quaternion from unit Y.
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
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
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} />
    </mesh>
  );
}

/** Emissive screen panel (flat plane tinted color, slight transparency). */
export function Screen({
  size,
  position,
  rotation = [0, 0, 0],
  color,
  intensity = 1,
}: {
  size: [number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  intensity?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Black bezel behind */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[size[0] + 0.08, size[1] + 0.08]} />
        <meshStandardMaterial color={0x05050a} metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Emissive screen */}
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
          transparent
          opacity={0.42 * intensity}
        />
      </mesh>
      {/* Scanline overlay — very thin horizontal bars for a CRT feel */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={size} />
        <meshBasicMaterial
          color={0x000000}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Single colored LED bulb. */
export function Led({
  position,
  color,
  size = 0.08,
}: {
  position: [number, number, number];
  color: string;
  size?: number;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** Box frame around a body — 12 neon bars outlining a cuboid. */
export function NeonCage({
  size,
  position = [0, 0, 0],
  color,
  thickness = 0.025,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  color: string;
  thickness?: number;
}) {
  const [sx, sy, sz] = size;
  const [px, py, pz] = position;
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const corners: Array<[number, number, number]> = [
    [px - hx, py - hy, pz - hz], // 0
    [px + hx, py - hy, pz - hz], // 1
    [px + hx, py - hy, pz + hz], // 2
    [px - hx, py - hy, pz + hz], // 3
    [px - hx, py + hy, pz - hz], // 4
    [px + hx, py + hy, pz - hz], // 5
    [px + hx, py + hy, pz + hz], // 6
    [px - hx, py + hy, pz + hz], // 7
  ];
  const edges: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 0], // bottom
    [4, 5], [5, 6], [6, 7], [7, 4], // top
    [0, 4], [1, 5], [2, 6], [3, 7], // verticals
  ];
  return (
    <group>
      {edges.map(([a, b], i) => (
        <NeonBar key={i} start={corners[a]!} end={corners[b]!} color={color} thickness={thickness} />
      ))}
    </group>
  );
}
