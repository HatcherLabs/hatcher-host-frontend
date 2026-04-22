'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';

interface Props {
  palette: FrameworkPalette;
  count?: number;
}

export function Sparkles({ palette, count = 40 }: Props) {
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 1] = 2.5 + Math.random() * 1.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [count]);
  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    const arr = geometry.attributes.position!.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1]! += dt * 0.2;
      if (arr[i * 3 + 1]! > 4.5) arr[i * 3 + 1] = 2.2;
    }
    geometry.attributes.position!.needsUpdate = true;
    if (materialRef.current) materialRef.current.opacity = 0.55 + Math.sin(t * 3) * 0.2;
  });
  return (
    <points geometry={geometry}>
      <pointsMaterial ref={materialRef} color={palette.bright} size={0.04} transparent opacity={0.9} />
    </points>
  );
}
