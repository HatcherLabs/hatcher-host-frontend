'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';

interface Props {
  palette: FrameworkPalette;
}

export function Platform({ palette }: Props) {
  const ringRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.getElapsedTime();
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(palette.primary).getHSL(hsl);
      ringRef.current.color.setHSL(hsl.h, hsl.s, hsl.l + Math.sin(t * 1.2) * 0.08);
    }
  });
  return (
    <group>
      <gridHelper args={[40, 40, palette.dim, 0x1a1a22]} />
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[3.2, 3.4, 0.18, 32]} />
        <meshStandardMaterial color={0x14161b} metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <torusGeometry args={[3.3, 0.04, 16, 96]} />
        <meshBasicMaterial ref={ringRef} color={palette.primary} />
      </mesh>
    </group>
  );
}
