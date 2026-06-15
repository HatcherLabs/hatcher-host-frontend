'use client';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CharacterState } from '@/components/city/v2/character/CharacterController';

function playerColor(framework: string): number {
  switch (framework) {
    case 'openclaw':
      return 0xd6b177;
    case 'hermes':
      return 0x8be0ff;
    default:
      return 0x9fd9c4;
  }
}

/**
 * The visible "you" — a small framework-tinted robot that tracks the character
 * controller's position + heading. Shown only in third-person (hidden in first
 * person so it never occludes the view). Legs swing while moving so it doesn't
 * ice-skate.
 */
export function PlayerAvatar({
  state,
  framework,
  visible,
}: {
  state: CharacterState;
  framework: string;
  visible: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const headingRef = useRef(state.heading);
  const lastPos = useRef(new THREE.Vector3().copy(state.position));
  const phaseRef = useRef(0);

  const accent = useMemo(() => new THREE.Color(playerColor(framework)), [framework]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(state.position.x, 0, state.position.z);

    // Ease heading toward the controller's facing (shortest angular path).
    const diff = ((state.heading - headingRef.current + Math.PI) % (Math.PI * 2)) - Math.PI;
    headingRef.current += diff * Math.min(1, dt * 10);
    g.rotation.y = headingRef.current;

    // Leg swing scaled by ground speed.
    const moved = state.position.distanceTo(lastPos.current);
    lastPos.current.copy(state.position);
    const speed = dt > 0 ? moved / dt : 0;
    const walk = THREE.MathUtils.clamp(speed / 5.5, 0, 1);
    phaseRef.current += dt * THREE.MathUtils.lerp(2, 10, walk);
    const swing = Math.sin(phaseRef.current) * 0.5 * walk;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
  });

  return (
    <group ref={groupRef} visible={visible}>
      <mesh position={[0, 0.42, 0]} scale={[0.82, 0.78, 0.7]} castShadow receiveShadow>
        <sphereGeometry args={[0.38, 24, 16]} />
        <meshStandardMaterial
          color={0xe9e5dc}
          roughness={0.5}
          metalness={0.12}
          emissive={accent}
          emissiveIntensity={0.025}
        />
      </mesh>
      <mesh position={[0, 0.66, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.27, 0.014, 8, 36]} />
        <meshBasicMaterial color={0xd6b177} transparent opacity={0.72} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.96, 0]} scale={[1, 0.72, 0.84]} castShadow receiveShadow>
        <sphereGeometry args={[0.3, 24, 16]} />
        <meshStandardMaterial
          color={0x20272d}
          roughness={0.34}
          metalness={0.58}
          emissive={accent}
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh position={[0, 0.97, 0.26]} scale={[1, 0.42, 0.12]}>
        <sphereGeometry args={[0.18, 18, 10]} />
        <meshBasicMaterial color={accent} transparent opacity={0.78} toneMapped={false} />
      </mesh>
      <mesh position={[-0.07, 0.98, 0.31]}>
        <sphereGeometry args={[0.032, 10, 8]} />
        <meshBasicMaterial color={0xf5fafb} toneMapped={false} />
      </mesh>
      <mesh position={[0.07, 0.98, 0.31]}>
        <sphereGeometry args={[0.032, 10, 8]} />
        <meshBasicMaterial color={0xf5fafb} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.29, 0]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.19, 0]}>
        <cylinderGeometry args={[0.014, 0.018, 0.24, 8]} />
        <meshStandardMaterial color={0x9ba3a6} roughness={0.32} metalness={0.7} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`arm-${side}`}
          position={[side * 0.28, 0.55, 0.02]}
          rotation={[0, 0, side * 0.24]}
          castShadow
          receiveShadow
        >
          <capsuleGeometry args={[0.045, 0.18, 4, 8]} />
          <meshStandardMaterial color={0xa4a8a8} roughness={0.38} metalness={0.48} />
        </mesh>
      ))}
      <mesh ref={leftLegRef} position={[-0.09, 0.16, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.048, 0.16, 4, 8]} />
        <meshStandardMaterial color={0x30373d} roughness={0.42} metalness={0.42} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.09, 0.16, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.048, 0.16, 4, 8]} />
        <meshStandardMaterial color={0x30373d} roughness={0.42} metalness={0.42} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.42, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.36, 18]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.26} depthWrite={false} />
      </mesh>
    </group>
  );
}
