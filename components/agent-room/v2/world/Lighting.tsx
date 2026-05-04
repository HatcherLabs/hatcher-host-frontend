'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { paletteFor } from '../colors';
import { ROOM_HALF, ROOM_HEIGHT } from './grid';

interface Props { framework: string; }

export function Lighting({ framework }: Props) {
  const palette = paletteFor(framework);
  const scannerA = useRef<THREE.PointLight>(null);
  const scannerB = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (scannerA.current) {
      scannerA.current.position.set(
        Math.sin(t * 0.48) * (ROOM_HALF - 1.2),
        ROOM_HEIGHT - 1,
        Math.cos(t * 0.34) * (ROOM_HALF - 1.2),
      );
      scannerA.current.intensity = 0.55 + Math.sin(t * 2.4) * 0.12;
    }
    if (scannerB.current) {
      scannerB.current.position.set(
        Math.cos(t * 0.36) * (ROOM_HALF - 1.6),
        2.4 + Math.sin(t * 0.7) * 0.35,
        Math.sin(t * 0.52) * (ROOM_HALF - 1.6),
      );
      scannerB.current.intensity = 0.36 + Math.cos(t * 2.1) * 0.08;
    }
  });

  return (
    <group>
      {/* Base ambient — intentionally dim. The room leans on accent
          point lights in corners plus the HDRI environment map to read
          as "lit by neon" rather than "lit by fluorescents". */}
      <ambientLight color={palette.ambient} intensity={0.18} />
      <hemisphereLight color={palette.primary} groundColor={0x000000} intensity={0.08} />
      {/* Soft key from above, no shadows — shadows in low/medium tier are off anyway */}
      <directionalLight position={[0, ROOM_HEIGHT * 1.4, 0]} intensity={0.25} />
      {/* Two corner neon fills (diagonal) — four was too much */}
      {[-1, 1].map(s => (
        <pointLight
          key={s}
          color={palette.primary}
          intensity={1.8}
          distance={ROOM_HEIGHT * 1.4}
          position={[s * (ROOM_HALF - 0.8), ROOM_HEIGHT - 0.6, s * (ROOM_HALF - 0.8)]}
        />
      ))}
      <pointLight
        ref={scannerA}
        color={palette.accent}
        intensity={0.55}
        distance={ROOM_HALF * 1.2}
        position={[0, ROOM_HEIGHT - 1, 0]}
      />
      <pointLight
        ref={scannerB}
        color={palette.primary}
        intensity={0.35}
        distance={ROOM_HALF * 0.9}
        position={[0, 2.4, 0]}
      />
    </group>
  );
}
