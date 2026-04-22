'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';

interface Props {
  framework: string;
  palette: FrameworkPalette;
}

/**
 * Small companion creature that orbits / bobs near the main avatar. One
 * silhouette per framework keeps the "habitat" metaphor playful.
 */
export function Pet({ framework, palette }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const wingRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Slow orbit around the avatar's ring, bob on Y
      groupRef.current.position.x = Math.cos(t * 0.35) * 2.2;
      groupRef.current.position.z = Math.sin(t * 0.35) * 2.2;
      groupRef.current.position.y = 0.6 + Math.sin(t * 1.6) * 0.12 + (framework === 'hermes' ? 1 : framework === 'elizaos' ? 0.6 : 0);
      groupRef.current.rotation.y = t * 0.35 + Math.PI / 2;
    }
    if (wingRef.current) {
      // Flap / pulse
      wingRef.current.rotation.z = Math.sin(t * 8) * 0.6;
    }
  });

  const materials = useMemo(() => ({
    primary: new THREE.MeshBasicMaterial({ color: palette.primary }),
    glow: new THREE.MeshBasicMaterial({ color: palette.bright }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1820, metalness: 0.7, roughness: 0.4 }),
    body: new THREE.MeshStandardMaterial({ color: palette.dim, metalness: 0.5, roughness: 0.45, emissive: palette.primary, emissiveIntensity: 0.3 }),
  }), [palette]);

  let creature: React.ReactNode = null;

  if (framework === 'openclaw') {
    // Mini crab (compact body + 2 tiny pincers + 4 legs)
    creature = (
      <group>
        <mesh material={materials.body}>
          <sphereGeometry args={[0.18, 14, 10]} />
        </mesh>
        {[-0.2, 0.2].map((x, i) => (
          <mesh key={`pEye-${i}`} position={[x, 0.1, 0.15]} material={materials.glow}>
            <sphereGeometry args={[0.03, 8, 6]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <group key={`claw-${s}`} position={[s * 0.18, -0.02, 0.14]}>
            <mesh material={materials.body}>
              <coneGeometry args={[0.05, 0.12, 6]} />
            </mesh>
          </group>
        ))}
        {[-1, 1].flatMap((s) => [-0.1, 0.1].map((z) => (
          <mesh
            key={`leg-${s}-${z}`}
            position={[s * 0.2, -0.08, z]}
            rotation={[0, 0, s * 0.6]}
            material={materials.dark}
          >
            <cylinderGeometry args={[0.015, 0.015, 0.18, 6]} />
          </mesh>
        )))}
      </group>
    );
  } else if (framework === 'hermes') {
    // Paper-airplane / scroll glider
    creature = (
      <group>
        <mesh rotation={[0, 0, 0]} material={materials.body}>
          <coneGeometry args={[0.08, 0.3, 4]} />
        </mesh>
        <group ref={wingRef}>
          <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]} material={materials.primary}>
            <planeGeometry args={[0.25, 0.14]} />
          </mesh>
        </group>
        <mesh position={[0, 0.06, 0.14]} material={materials.glow}>
          <sphereGeometry args={[0.04, 8, 6]} />
        </mesh>
      </group>
    );
  } else if (framework === 'elizaos') {
    // Mini jellyfish (dome + tentacles)
    creature = (
      <group>
        <mesh position={[0, 0.08, 0]} material={materials.body}>
          <sphereGeometry args={[0.18, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        </mesh>
        <mesh position={[0, 0.08, 0]} material={materials.glow}>
          <sphereGeometry args={[0.07, 10, 8]} />
        </mesh>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={`tent-${i}`}
              position={[Math.cos(a) * 0.12, -0.08, Math.sin(a) * 0.12]}
              material={materials.primary}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.2, 6]} />
            </mesh>
          );
        })}
      </group>
    );
  } else {
    // Milady — heart balloon
    creature = (
      <group>
        <mesh rotation={[0, 0, Math.PI / 4]} material={materials.primary}>
          <boxGeometry args={[0.12, 0.12, 0.04]} />
        </mesh>
        <mesh position={[-0.045, 0.045, 0]} material={materials.primary}>
          <sphereGeometry args={[0.06, 12, 10]} />
        </mesh>
        <mesh position={[0.045, 0.045, 0]} material={materials.primary}>
          <sphereGeometry args={[0.06, 12, 10]} />
        </mesh>
        {/* String */}
        <mesh position={[0, -0.3, 0]} material={materials.dark}>
          <cylinderGeometry args={[0.004, 0.004, 0.5, 6]} />
        </mesh>
      </group>
    );
  }

  return <group ref={groupRef}>{creature}</group>;
}
