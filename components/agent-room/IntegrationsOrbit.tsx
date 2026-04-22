'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';
import type { RoomIntegration } from './types';

interface Props {
  palette: FrameworkPalette;
  integrations: RoomIntegration[];
}

export function IntegrationsOrbit({ palette, integrations }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.2;
  });

  const lineGeometries = useMemo(() => {
    return integrations.map((intg, i) => {
      if (!intg.active) return null;
      const angle = (i / integrations.length) * Math.PI * 2;
      const x = Math.cos(angle) * 3.0;
      const z = Math.sin(angle) * 3.0;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array([x, 0, z, 0, 0, 0]), 3),
      );
      return geo;
    });
  }, [integrations]);

  return (
    <group ref={groupRef} position={[0, 1.4, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.0, 0.008, 8, 96]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.22} />
      </mesh>
      {integrations.map((intg, i) => {
        const angle = (i / integrations.length) * Math.PI * 2;
        const x = Math.cos(angle) * 3.0;
        const z = Math.sin(angle) * 3.0;
        const color = intg.active ? parseInt(intg.colorHex.replace('#', '0x'), 16) : 0x20232a;
        const emissive = intg.active ? color : 0x000000;
        const geo = lineGeometries[i];
        return (
          <group key={intg.key}>
            <mesh position={[x, 0, z]}>
              <boxGeometry args={[0.36, 0.36, 0.36]} />
              <meshStandardMaterial
                color={color}
                metalness={0.5}
                roughness={0.4}
                emissive={emissive}
                emissiveIntensity={intg.active ? 0.4 : 0}
              />
            </mesh>
            {geo ? (
              <primitive object={new THREE.Line(geo, new THREE.LineBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.38 }))} />
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
