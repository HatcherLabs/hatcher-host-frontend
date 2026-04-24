'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  color: string;
  /** Render when true, fade out when false. */
  active: boolean;
  /** Ring radius on the floor. */
  radius?: number;
}

/**
 * Pulsing halo ring that sits at y=0.02 directly underneath a station,
 * visible only when the player is within proximity range. The ring
 * rotates slowly and its emissive intensity breathes on a 1.2s cycle
 * so it reads as "stand here to interact" without competing with the
 * station's own glow.
 */
export function ProximityHalo({ color, active, radius = 1.8 }: Props) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) {
      const targetOpacity = active ? 0.55 + 0.35 * Math.sin(t * 5) : 0;
      matRef.current.opacity += (targetOpacity - matRef.current.opacity) * 0.15;
    }
    if (groupRef.current) {
      groupRef.current.rotation.z = t * 0.6;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[radius - 0.15, radius, 48]} />
        <meshBasicMaterial
          ref={matRef}
          color={color}
          transparent
          opacity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
