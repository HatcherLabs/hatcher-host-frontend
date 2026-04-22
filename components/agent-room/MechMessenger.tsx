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
 * Hermes avatar — hooded messenger with floating books, wing halo,
 * and a glowing amulet core. Designed to read as "librarian-oracle
 * delivering messages", matching the Hermes framework metaphor.
 */
export function MechMessenger({ palette, snapTrigger = 0 }: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftBookRef = useRef<THREE.Group>(null);
  const rightBookRef = useRef<THREE.Group>(null);
  const hoodEyeRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Group>(null);
  const amuletRef = useRef<THREE.MeshBasicMaterial>(null);
  const lastTriggerRef = useRef(0);
  const lastSnapRef = useRef(-10);

  const materials = useMemo(
    () => ({
      robe: new THREE.MeshStandardMaterial({
        color: 0x1a1126,
        metalness: 0.15,
        roughness: 0.85,
        emissive: 0x120820,
        emissiveIntensity: 0.25,
      }),
      robeAccent: new THREE.MeshStandardMaterial({
        color: palette.dim,
        metalness: 0.55,
        roughness: 0.45,
        emissive: palette.primary,
        emissiveIntensity: 0.35,
      }),
      hood: new THREE.MeshStandardMaterial({ color: 0x0a0614, metalness: 0.3, roughness: 0.6 }),
      gold: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, metalness: 0.85, roughness: 0.35 }),
      glow: new THREE.MeshBasicMaterial({ color: palette.bright }),
      primary: new THREE.MeshBasicMaterial({ color: palette.primary }),
      book: new THREE.MeshStandardMaterial({
        color: 0x2e1538,
        metalness: 0.25,
        roughness: 0.6,
        emissive: palette.dim,
        emissiveIntensity: 0.4,
      }),
      wing: new THREE.MeshStandardMaterial({
        color: 0x2a1838,
        metalness: 0.55,
        roughness: 0.35,
        emissive: palette.dim,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    }),
    [palette],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (rootRef.current) {
      rootRef.current.position.y = 0.18 + Math.sin(t * 0.55) * 0.12;
      rootRef.current.rotation.y = Math.sin(t * 0.2) * 0.12;
    }
    if (haloRef.current) {
      haloRef.current.rotation.z = t * 0.35;
    }

    if (snapTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = snapTrigger;
      lastSnapRef.current = performance.now() / 1000;
    }
    const dt = performance.now() / 1000 - lastSnapRef.current;
    let armLift = 0;
    let bookScale = 1;
    let eyeBoost = 1;
    if (dt < 0.45) {
      // dispatch — raise arms + pulse books + brighten eye
      const k = dt / 0.45;
      armLift = Math.sin(k * Math.PI) * 0.6;
      bookScale = 1 + Math.sin(k * Math.PI) * 0.35;
      eyeBoost = 2.4 - k * 1.4;
    } else {
      // idle sway
      armLift = Math.sin(t * 1.1) * 0.05;
      bookScale = 1 + Math.sin(t * 1.3) * 0.04;
      eyeBoost = 1 + Math.sin(t * 2.4) * 0.12;
    }
    if (leftArmRef.current) leftArmRef.current.rotation.x = -0.3 - armLift;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -0.3 - armLift;
    if (leftBookRef.current) {
      leftBookRef.current.scale.setScalar(bookScale);
      leftBookRef.current.rotation.y = t * 0.6;
    }
    if (rightBookRef.current) {
      rightBookRef.current.scale.setScalar(bookScale);
      rightBookRef.current.rotation.y = -t * 0.6 + 0.5;
    }
    if (hoodEyeRef.current) {
      const s = 0.85 + 0.15 * Math.sin(t * 2);
      hoodEyeRef.current.scale.set(s, s * 0.45, s);
      (hoodEyeRef.current.material as THREE.MeshBasicMaterial).color.setRGB(
        Math.min(1, (((palette.bright >> 16) & 0xff) / 255) * eyeBoost),
        Math.min(1, (((palette.bright >> 8) & 0xff) / 255) * eyeBoost),
        Math.min(1, ((palette.bright & 0xff) / 255) * eyeBoost),
      );
    }
    if (amuletRef.current) {
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(palette.primary).getHSL(hsl);
      amuletRef.current.color.setHSL(hsl.h, hsl.s, hsl.l + Math.sin(t * 1.8) * 0.12);
    }
  });

  const renderArm = (side: -1 | 1) => {
    const ref = side === -1 ? leftArmRef : rightArmRef;
    const bookRef = side === -1 ? leftBookRef : rightBookRef;
    return (
      <group ref={ref} position={[side * 0.45, 0.95, 0.05]} rotation={[-0.3, 0, 0]}>
        {/* upper sleeve */}
        <mesh position={[side * 0.12, -0.2, 0]} rotation={[0, 0, side * -0.4]} material={materials.robe}>
          <cylinderGeometry args={[0.14, 0.11, 0.55, 12]} />
        </mesh>
        {/* cuff */}
        <mesh position={[side * 0.28, -0.44, 0.06]} rotation={[0, 0, side * -0.6]} material={materials.robeAccent}>
          <torusGeometry args={[0.11, 0.025, 6, 16]} />
        </mesh>
        {/* hand - open palm */}
        <mesh position={[side * 0.32, -0.52, 0.16]} rotation={[0, 0, 0]} material={materials.hood}>
          <sphereGeometry args={[0.08, 12, 8]} />
        </mesh>
        {/* floating book */}
        <group ref={bookRef} position={[side * 0.42, -0.56, 0.28]}>
          <mesh material={materials.book}>
            <boxGeometry args={[0.22, 0.04, 0.16]} />
          </mesh>
          <mesh material={materials.primary}>
            <boxGeometry args={[0.24, 0.01, 0.18]} />
          </mesh>
          {/* page glow strip */}
          <mesh position={[0, 0.025, 0]} material={materials.glow}>
            <boxGeometry args={[0.2, 0.004, 0.14]} />
          </mesh>
        </group>
      </group>
    );
  };

  return (
    <group ref={rootRef}>
      {/* floating base mist — short cylinder fading out */}
      <mesh position={[0, -0.15, 0]} material={materials.robe}>
        <cylinderGeometry args={[0.5, 0.92, 0.3, 20]} />
      </mesh>

      {/* robe — tall truncated cone */}
      <mesh position={[0, 0.55, 0]} material={materials.robe}>
        <cylinderGeometry args={[0.38, 0.82, 1.6, 20]} />
      </mesh>

      {/* robe trim — purple band near bottom */}
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.primary}>
        <torusGeometry args={[0.88, 0.015, 8, 32]} />
      </mesh>

      {/* chest amulet — pendant */}
      <mesh position={[0, 0.7, 0.38]} material={materials.gold}>
        <torusGeometry args={[0.09, 0.02, 10, 22]} />
      </mesh>
      <mesh position={[0, 0.7, 0.38]}>
        <cylinderGeometry args={[0.065, 0.065, 0.015, 18]} />
        <meshBasicMaterial ref={amuletRef} color={palette.primary} />
      </mesh>

      {/* shoulders — flared spans */}
      {[-1, 1].map((s) => (
        <mesh
          key={`shoulder-${s}`}
          position={[s * 0.42, 1.15, -0.02]}
          rotation={[0, 0, s * 0.55]}
          material={materials.robe}
        >
          <cylinderGeometry args={[0.1, 0.16, 0.22, 10]} />
        </mesh>
      ))}

      {renderArm(-1)}
      {renderArm(1)}

      {/* collar ring */}
      <mesh position={[0, 1.32, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.robeAccent}>
        <torusGeometry args={[0.28, 0.04, 8, 24]} />
      </mesh>

      {/* neck */}
      <mesh position={[0, 1.45, 0]} material={materials.hood}>
        <cylinderGeometry args={[0.14, 0.16, 0.18, 10]} />
      </mesh>

      {/* hood — teardrop from sphere */}
      <mesh position={[0, 1.78, -0.04]} scale={[1.05, 1.25, 1.0]} material={materials.hood}>
        <sphereGeometry args={[0.38, 24, 16]} />
      </mesh>

      {/* hood tip — peaked */}
      <mesh position={[0, 2.3, -0.18]} rotation={[0.7, 0, 0]} material={materials.hood}>
        <coneGeometry args={[0.16, 0.4, 10]} />
      </mesh>

      {/* hood front trim — purple arch */}
      <mesh position={[0, 1.78, 0.33]} rotation={[0, 0, 0]} material={materials.robeAccent}>
        <torusGeometry args={[0.28, 0.018, 8, 18, Math.PI]} />
      </mesh>

      {/* glowing eye slit inside hood */}
      <mesh
        ref={hoodEyeRef}
        position={[0, 1.75, 0.24]}
        rotation={[0, 0, 0]}
        material={materials.glow}
      >
        <sphereGeometry args={[0.1, 14, 10]} />
      </mesh>

      {/* wing halo behind — 6 tall fins radial around back */}
      <group ref={haloRef} position={[0, 1.4, -0.45]} rotation={[0.2, 0, 0]}>
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.65, Math.sin(angle) * 0.65, 0]}
              rotation={[0, 0, angle + Math.PI / 2]}
              material={materials.wing}
            >
              <coneGeometry args={[0.1, 0.9, 4]} />
            </mesh>
          );
        })}
        {/* halo core ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.primary}>
          <torusGeometry args={[0.75, 0.015, 6, 48]} />
        </mesh>
      </group>

      {/* floating scroll on the ground below — lore vibe */}
      <mesh position={[0.3, 0.05, 0.5]} rotation={[0.3, 0.4, 0]} material={materials.book}>
        <cylinderGeometry args={[0.05, 0.05, 0.42, 10]} />
      </mesh>
      <mesh position={[-0.4, 0.04, 0.35]} rotation={[0.2, -0.6, 0]} material={materials.book}>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 10]} />
      </mesh>
    </group>
  );
}
