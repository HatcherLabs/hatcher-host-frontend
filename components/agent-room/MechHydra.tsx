'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';

interface Props {
  palette: FrameworkPalette;
  snapTrigger?: number;
}

/**
 * ElizaOS avatar — floating oracle orb with swaying tentacle-heads.
 * Reads as "social nexus / many-headed conversational AI". Blue palette.
 */
export function MechHydra({ palette, snapTrigger = 0 }: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const mainEyeRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreRef = useRef<THREE.MeshBasicMaterial>(null);
  const tentacleRefs = useRef<Array<THREE.Group | null>>([]);
  const tentacleHeads = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const lastTriggerRef = useRef(0);
  const lastSnapRef = useRef(-10);

  const materials = useMemo(
    () => ({
      orb: new THREE.MeshStandardMaterial({
        color: 0x1a2340,
        metalness: 0.25,
        roughness: 0.55,
        emissive: palette.dim,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.85,
      }),
      orbGlass: new THREE.MeshPhysicalMaterial({
        color: 0x2a3860,
        metalness: 0.2,
        roughness: 0.15,
        transmission: 0.5,
        thickness: 0.5,
        emissive: palette.primary,
        emissiveIntensity: 0.15,
      }),
      tentacle: new THREE.MeshStandardMaterial({
        color: 0x2a3b68,
        metalness: 0.5,
        roughness: 0.4,
        emissive: palette.dim,
        emissiveIntensity: 0.35,
      }),
      tentacleDark: new THREE.MeshStandardMaterial({
        color: 0x141a2e,
        metalness: 0.7,
        roughness: 0.3,
      }),
      primary: new THREE.MeshBasicMaterial({ color: palette.primary }),
      glow: new THREE.MeshBasicMaterial({ color: palette.bright }),
      metal: new THREE.MeshStandardMaterial({ color: 0x3a4660, metalness: 0.9, roughness: 0.25 }),
    }),
    [palette],
  );

  const TENTACLE_COUNT = 5;
  const SEGMENTS_PER = 6;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (rootRef.current) {
      rootRef.current.position.y = 0.35 + Math.sin(t * 0.5) * 0.18;
      rootRef.current.rotation.y = Math.sin(t * 0.18) * 0.15;
    }

    if (snapTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = snapTrigger;
      lastSnapRef.current = performance.now() / 1000;
    }
    const dt = performance.now() / 1000 - lastSnapRef.current;
    const snapBoost = dt < 0.5 ? 2.2 - (dt / 0.5) * 1.5 : 1;

    // animate tentacles
    for (let i = 0; i < TENTACLE_COUNT; i++) {
      const group = tentacleRefs.current[i];
      if (!group) continue;
      const phase = (i / TENTACLE_COUNT) * Math.PI * 2;
      group.rotation.x = -0.4 + Math.sin(t * 0.9 + phase) * 0.18;
      group.rotation.z = Math.cos(t * 0.7 + phase) * 0.15;
      // brighten heads during snap
      const headMat = tentacleHeads.current[i];
      if (headMat) {
        const baseL = 0.55;
        const l = Math.min(0.95, baseL * (0.6 + Math.sin(t * 2.3 + phase) * 0.15 + snapBoost * 0.3));
        const hsl = { h: 0, s: 0, l: 0 };
        new THREE.Color(palette.bright).getHSL(hsl);
        headMat.color.setHSL(hsl.h, hsl.s, l);
      }
    }

    if (coreRef.current) {
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(palette.primary).getHSL(hsl);
      coreRef.current.color.setHSL(
        hsl.h,
        hsl.s,
        hsl.l + Math.sin(t * 1.8) * 0.1 + (snapBoost - 1) * 0.1,
      );
    }
    if (mainEyeRef.current) {
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(palette.bright).getHSL(hsl);
      mainEyeRef.current.color.setHSL(
        hsl.h,
        hsl.s,
        Math.min(0.95, hsl.l * (0.8 + snapBoost * 0.4)),
      );
    }
  });

  const renderTentacle = (index: number) => {
    const angle = (index / TENTACLE_COUNT) * Math.PI * 2;
    const baseX = Math.cos(angle) * 0.55;
    const baseZ = Math.sin(angle) * 0.55;
    const segments: React.ReactNode[] = [];
    for (let s = 0; s < SEGMENTS_PER; s++) {
      const sy = -s * 0.22;
      const radius = 0.15 - s * 0.015;
      segments.push(
        <mesh
          key={`seg-${s}`}
          position={[0, sy, 0]}
          material={s % 2 === 0 ? materials.tentacle : materials.tentacleDark}
        >
          <sphereGeometry args={[radius, 14, 10]} />
        </mesh>,
      );
    }
    // head at tip
    const headY = -SEGMENTS_PER * 0.22 - 0.12;
    return (
      <group
        key={index}
        ref={(el) => {
          tentacleRefs.current[index] = el;
        }}
        position={[baseX, 0, baseZ]}
      >
        {segments}
        <mesh position={[0, headY, 0]} material={materials.tentacle}>
          <sphereGeometry args={[0.18, 16, 12]} />
        </mesh>
        {/* head eye — small glowing orb */}
        <mesh position={[0, headY + 0.08, 0.15]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshBasicMaterial
            ref={(m) => {
              tentacleHeads.current[index] = m;
            }}
            color={palette.bright}
          />
        </mesh>
        {/* fin on side of head */}
        <mesh
          position={[0, headY + 0.03, -0.12]}
          rotation={[0.5, 0, 0]}
          material={materials.tentacleDark}
        >
          <coneGeometry args={[0.08, 0.18, 6]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={rootRef}>
      {/* main orb body */}
      <mesh position={[0, 1.25, 0]} material={materials.orbGlass}>
        <sphereGeometry args={[0.7, 32, 24]} />
      </mesh>
      <mesh position={[0, 1.25, 0]} material={materials.orb}>
        <sphereGeometry args={[0.72, 32, 24]} />
      </mesh>

      {/* glowing inner core */}
      <mesh position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.28, 20, 14]} />
        <meshBasicMaterial ref={coreRef} color={palette.primary} />
      </mesh>

      {/* central cyclops-style eye slit */}
      <mesh position={[0, 1.3, 0.62]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.15, 14, 10]} />
        <meshBasicMaterial ref={mainEyeRef} color={palette.bright} />
      </mesh>
      <mesh position={[0, 1.3, 0.72]} material={materials.tentacleDark}>
        <torusGeometry args={[0.18, 0.022, 8, 20]} />
      </mesh>

      {/* crown halo of small orbs rotating slow */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={`crown-${i}`}
            position={[Math.cos(a) * 0.95, 1.9, Math.sin(a) * 0.95]}
            material={i % 2 === 0 ? materials.primary : materials.glow}
          >
            <sphereGeometry args={[0.06, 10, 8]} />
          </mesh>
        );
      })}
      {/* halo ring */}
      <mesh position={[0, 1.9, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.primary}>
        <torusGeometry args={[0.95, 0.01, 6, 48]} />
      </mesh>

      {/* tentacle cluster base ring */}
      <mesh position={[0, 0.68, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.metal}>
        <torusGeometry args={[0.6, 0.04, 8, 28]} />
      </mesh>

      {/* tentacles attach at y≈0.6, hanging below */}
      <group position={[0, 0.55, 0]}>
        {Array.from({ length: TENTACLE_COUNT }).map((_, i) => renderTentacle(i))}
      </group>

      {/* emissive rune under the orb */}
      <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.primary}>
        <torusGeometry args={[0.32, 0.02, 6, 36]} />
      </mesh>
      <mesh position={[0, 0.74, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.glow}>
        <torusGeometry args={[0.18, 0.012, 6, 28]} />
      </mesh>
    </group>
  );
}
