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
  const innerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const outerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const markerMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const markerRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    if (innerMatRef.current) {
      const targetOpacity = active ? 0.42 + 0.34 * pulse : 0;
      innerMatRef.current.opacity += (targetOpacity - innerMatRef.current.opacity) * 0.15;
    }
    if (outerMatRef.current) {
      const targetOpacity = active ? 0.18 + 0.2 * (1 - pulse) : 0;
      outerMatRef.current.opacity += (targetOpacity - outerMatRef.current.opacity) * 0.12;
    }
    const targetMarkerOpacity = active ? 0.65 + 0.25 * pulse : 0;
    markerMatRefs.current.forEach((mat) => {
      if (mat) mat.opacity += (targetMarkerOpacity - mat.opacity) * 0.16;
    });
    if (groupRef.current) {
      groupRef.current.rotation.z = t * 0.6;
    }
    if (outerRef.current) {
      const s = active ? 1 + 0.08 * pulse : 1;
      outerRef.current.scale.set(s, s, 1);
    }
    if (markerRef.current) {
      markerRef.current.rotation.z = -t * 0.95;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[radius - 0.15, radius, 48]} />
        <meshBasicMaterial
          ref={innerMatRef}
          color={color}
          transparent
          opacity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={outerRef}>
        <ringGeometry args={[radius + 0.22, radius + 0.28, 64]} />
        <meshBasicMaterial
          ref={outerMatRef}
          color={color}
          transparent
          opacity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <group ref={markerRef}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * (radius + 0.45), Math.sin(a) * (radius + 0.45), 0.01]}
              rotation={[0, 0, a]}
            >
              <planeGeometry args={[0.48, 0.08]} />
              <meshBasicMaterial
                ref={(mat) => {
                  markerMatRefs.current[i] = mat;
                }}
                color={color}
                transparent
                opacity={0}
                toneMapped={false}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
