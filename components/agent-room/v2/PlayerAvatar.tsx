'use client';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CharacterState } from '@/components/city/v2/character/CharacterController';

function playerColor(framework: string): number {
  switch (framework) {
    case 'openclaw':
      return 0xffc21f;
    case 'hermes':
      return 0xb88bff;
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
      <mesh position={[0, 0.62, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.5, 4, 10]} />
        <meshStandardMaterial color={0xcfd6e0} roughness={0.55} metalness={0.22} />
      </mesh>
      <mesh position={[0, 1.04, 0]} castShadow>
        <boxGeometry args={[0.3, 0.26, 0.26]} />
        <meshStandardMaterial color={0xc7cdd8} roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.05, 0.135]}>
        <boxGeometry args={[0.22, 0.08, 0.02]} />
        <meshStandardMaterial color={0x05080f} emissive={accent} emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <mesh ref={leftLegRef} position={[-0.1, 0.34, 0]} castShadow>
        <boxGeometry args={[0.1, 0.34, 0.12]} />
        <meshStandardMaterial color={0x2a3040} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.1, 0.34, 0]} castShadow>
        <boxGeometry args={[0.1, 0.34, 0.12]} />
        <meshStandardMaterial color={0x2a3040} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 18]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.26} depthWrite={false} />
      </mesh>
    </group>
  );
}
