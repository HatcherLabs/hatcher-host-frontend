'use client';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { paletteFor } from '../colors';
import { ROOM_SIZE, ROOM_HEIGHT } from './grid';

interface Props { framework: string; count?: number; }

export function Atmosphere({ framework, count = 120 }: Props) {
  const palette = paletteFor(framework);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * ROOM_SIZE * 0.95;
      arr[i * 3 + 1] = Math.random() * (ROOM_HEIGHT - 0.5);
      arr[i * 3 + 2] = (Math.random() - 0.5) * ROOM_SIZE * 0.95;
    }
    return arr;
  }, [count]);

  const ref = useRef<THREE.Points>(null);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += dt * 0.15;
      if (arr[i * 3 + 1] > ROOM_HEIGHT - 0.3) arr[i * 3 + 1] = 0;
    }
    attr.needsUpdate = true;
  });

  return (
    <>
      <fog attach="fog" args={[palette.fog, 6, 22]} />
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.04} color={palette.accent} transparent opacity={0.45} depthWrite={false} />
      </points>
    </>
  );
}
