'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  count?: number;
  radius?: number;
  color?: number;
}

/**
 * Far-field starfield — static points on a large sphere with a subtle
 * per-star twinkle via custom alpha attribute + sin offset. Renders
 * behind everything (depthWrite off, large distance).
 */
export function Starfield({ count = 700, radius = 60, color = 0xffffff }: Props) {
  const matRef = useRef<THREE.PointsMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Distribute on a sphere shell, biased toward upper hemisphere so
      // the viewer-below-horizon area isn't as busy.
      const u = Math.random();
      const v = Math.random() * 0.85 + 0.1; // keep out of the far floor
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.cos(phi) + 15;
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 0.4 + Math.random() * 1.1;
      phases[i] = Math.random() * Math.PI * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (matRef.current) {
      // Pulse overall star brightness gently
      matRef.current.opacity = 0.55 + Math.sin(clock.getElapsedTime() * 0.7) * 0.08;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={matRef}
        color={color}
        size={0.35}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
