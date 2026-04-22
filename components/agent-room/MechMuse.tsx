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
 * Milady avatar — chibi creator muse with floating palette, brush,
 * and heart-emblem core. Pink palette, playful silhouette.
 */
export function MechMuse({ palette, snapTrigger = 0 }: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const hairLeftRef = useRef<THREE.Group>(null);
  const hairRightRef = useRef<THREE.Group>(null);
  const paletteRef = useRef<THREE.Group>(null);
  const heartRef = useRef<THREE.MeshBasicMaterial>(null);
  const brushTipRef = useRef<THREE.MeshBasicMaterial>(null);
  const brushArmRef = useRef<THREE.Group>(null);
  const lastTriggerRef = useRef(0);
  const lastSnapRef = useRef(-10);

  const materials = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({
        color: 0xf4e3ec,
        metalness: 0.1,
        roughness: 0.5,
        emissive: 0x120910,
        emissiveIntensity: 0.1,
      }),
      skirt: new THREE.MeshStandardMaterial({
        color: palette.primary,
        metalness: 0.25,
        roughness: 0.35,
        emissive: palette.dim,
        emissiveIntensity: 0.3,
      }),
      skirtDark: new THREE.MeshStandardMaterial({
        color: palette.dim,
        metalness: 0.35,
        roughness: 0.35,
      }),
      hair: new THREE.MeshStandardMaterial({
        color: 0x6b2538,
        metalness: 0.35,
        roughness: 0.45,
      }),
      hairHi: new THREE.MeshStandardMaterial({
        color: 0x8a3750,
        metalness: 0.4,
        roughness: 0.4,
        emissive: 0x220810,
        emissiveIntensity: 0.2,
      }),
      palette: new THREE.MeshStandardMaterial({
        color: 0x2a1a22,
        metalness: 0.6,
        roughness: 0.3,
      }),
      brushHandle: new THREE.MeshStandardMaterial({
        color: 0x5a3b2a,
        metalness: 0.4,
        roughness: 0.5,
      }),
      primary: new THREE.MeshBasicMaterial({ color: palette.primary }),
      glow: new THREE.MeshBasicMaterial({ color: palette.bright }),
      gold: new THREE.MeshStandardMaterial({ color: 0xc89660, metalness: 0.9, roughness: 0.3 }),
      eye: new THREE.MeshBasicMaterial({ color: 0x281020 }),
    }),
    [palette],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (rootRef.current) {
      rootRef.current.position.y = 0.08 + Math.sin(t * 0.65) * 0.07;
      rootRef.current.rotation.y = Math.sin(t * 0.22) * 0.14;
    }
    if (hairLeftRef.current) hairLeftRef.current.rotation.z = 0.15 + Math.sin(t * 1.4) * 0.08;
    if (hairRightRef.current) hairRightRef.current.rotation.z = -0.15 - Math.sin(t * 1.4 + 0.3) * 0.08;
    if (paletteRef.current) {
      paletteRef.current.rotation.y = t * 0.4;
      paletteRef.current.position.y = 1.55 + Math.sin(t * 0.9) * 0.08;
    }

    if (snapTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = snapTrigger;
      lastSnapRef.current = performance.now() / 1000;
    }
    const dt = performance.now() / 1000 - lastSnapRef.current;
    let brushBoost = 1;
    let heartBoost = 1;
    let armLift = 0;
    if (dt < 0.5) {
      const k = dt / 0.5;
      brushBoost = 1 + Math.sin(k * Math.PI) * 2.2;
      heartBoost = 1 + Math.sin(k * Math.PI) * 1.3;
      armLift = Math.sin(k * Math.PI) * 0.6;
    } else {
      heartBoost = 0.9 + Math.sin(t * 1.6) * 0.15;
      armLift = Math.sin(t * 1.1) * 0.05;
    }
    if (brushTipRef.current) {
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(palette.bright).getHSL(hsl);
      brushTipRef.current.color.setHSL(hsl.h, hsl.s, Math.min(0.95, hsl.l * brushBoost));
    }
    if (heartRef.current) {
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(palette.primary).getHSL(hsl);
      heartRef.current.color.setHSL(hsl.h, hsl.s, Math.min(0.9, hsl.l * heartBoost));
    }
    if (brushArmRef.current) brushArmRef.current.rotation.x = -0.4 - armLift;
  });

  return (
    <group ref={rootRef}>
      {/* skirt / dress cone */}
      <mesh position={[0, 0.55, 0]} material={materials.skirt}>
        <coneGeometry args={[0.82, 1.0, 16, 1, true]} />
      </mesh>
      {/* skirt dark inner */}
      <mesh position={[0, 0.52, 0]} material={materials.skirtDark}>
        <coneGeometry args={[0.78, 0.96, 16, 1, true]} />
      </mesh>
      {/* skirt trim */}
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.glow}>
        <torusGeometry args={[0.82, 0.015, 6, 32]} />
      </mesh>

      {/* torso — rounded cylinder */}
      <mesh position={[0, 1.18, 0]} material={materials.body}>
        <sphereGeometry args={[0.38, 22, 14]} />
      </mesh>

      {/* heart pendant */}
      <group position={[0, 1.22, 0.36]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.12, 0.12, 0.04]} />
          <meshBasicMaterial ref={heartRef} color={palette.primary} />
        </mesh>
        <mesh position={[-0.045, 0.045, 0]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshBasicMaterial color={palette.primary} />
        </mesh>
        <mesh position={[0.045, 0.045, 0]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshBasicMaterial color={palette.primary} />
        </mesh>
      </group>

      {/* collar / choker */}
      <mesh position={[0, 1.42, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.gold}>
        <torusGeometry args={[0.2, 0.025, 8, 20]} />
      </mesh>

      {/* head */}
      <mesh position={[0, 1.72, 0]} scale={[1, 1.05, 1]} material={materials.body}>
        <sphereGeometry args={[0.42, 28, 20]} />
      </mesh>

      {/* hair cap back */}
      <mesh position={[0, 1.82, -0.1]} scale={[1.1, 1, 1]} material={materials.hair}>
        <sphereGeometry args={[0.42, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>

      {/* hair bangs */}
      <mesh position={[0, 1.98, 0.3]} rotation={[0.6, 0, 0]} material={materials.hair}>
        <coneGeometry args={[0.3, 0.32, 8]} />
      </mesh>

      {/* side pigtails */}
      <group ref={hairLeftRef} position={[-0.38, 1.7, 0]}>
        <mesh material={materials.hair}>
          <sphereGeometry args={[0.15, 14, 10]} />
        </mesh>
        <mesh position={[0, -0.3, 0]} material={materials.hairHi}>
          <cylinderGeometry args={[0.13, 0.06, 0.55, 12]} />
        </mesh>
        <mesh position={[0, -0.6, 0]} material={materials.hair}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
      </group>
      <group ref={hairRightRef} position={[0.38, 1.7, 0]}>
        <mesh material={materials.hair}>
          <sphereGeometry args={[0.15, 14, 10]} />
        </mesh>
        <mesh position={[0, -0.3, 0]} material={materials.hairHi}>
          <cylinderGeometry args={[0.13, 0.06, 0.55, 12]} />
        </mesh>
        <mesh position={[0, -0.6, 0]} material={materials.hair}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
      </group>

      {/* ribbons on buns */}
      {[-1, 1].map((side) => (
        <mesh
          key={`ribbon-${side}`}
          position={[side * 0.38, 1.88, 0]}
          rotation={[0, 0, side * 0.3]}
          material={materials.primary}
        >
          <torusGeometry args={[0.1, 0.02, 6, 10]} />
        </mesh>
      ))}

      {/* eyes */}
      {[-0.15, 0.15].map((x, i) => (
        <mesh key={`eye-${i}`} position={[x, 1.72, 0.38]} material={materials.eye}>
          <sphereGeometry args={[0.05, 10, 8]} />
        </mesh>
      ))}
      {/* eye highlights */}
      {[-0.13, 0.17].map((x, i) => (
        <mesh key={`hl-${i}`} position={[x, 1.75, 0.43]} material={materials.glow}>
          <sphereGeometry args={[0.015, 8, 6]} />
        </mesh>
      ))}

      {/* left arm — idle */}
      <group position={[-0.4, 1.25, 0]} rotation={[-0.15, 0, 0.4]}>
        <mesh position={[0, -0.22, 0]} rotation={[0, 0, 0.4]} material={materials.body}>
          <cylinderGeometry args={[0.07, 0.05, 0.45, 10]} />
        </mesh>
        <mesh position={[-0.12, -0.46, 0]} material={materials.body}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
      </group>

      {/* right arm — holds the brush, animates on tool-call */}
      <group ref={brushArmRef} position={[0.38, 1.25, 0.05]} rotation={[-0.4, 0, 0]}>
        <mesh position={[0, -0.22, 0]} rotation={[0, 0, -0.3]} material={materials.body}>
          <cylinderGeometry args={[0.07, 0.05, 0.45, 10]} />
        </mesh>
        <mesh position={[0.04, -0.46, 0.05]} material={materials.body}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
        {/* brush handle */}
        <mesh position={[0.06, -0.55, 0.2]} rotation={[0.9, 0, -0.25]} material={materials.brushHandle}>
          <cylinderGeometry args={[0.02, 0.02, 0.55, 8]} />
        </mesh>
        <mesh position={[0.09, -0.62, 0.38]} material={materials.gold}>
          <cylinderGeometry args={[0.028, 0.026, 0.06, 8]} />
        </mesh>
        {/* brush tip (glows on tool-call) */}
        <mesh position={[0.12, -0.66, 0.46]} rotation={[0.9, 0, -0.25]}>
          <coneGeometry args={[0.05, 0.12, 8]} />
          <meshBasicMaterial ref={brushTipRef} color={palette.bright} />
        </mesh>
      </group>

      {/* floating palette disc behind */}
      <group ref={paletteRef} position={[0, 1.55, -0.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.palette}>
          <torusGeometry args={[0.35, 0.04, 10, 32]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.palette}>
          <cylinderGeometry args={[0.35, 0.35, 0.025, 32]} />
        </mesh>
        {/* paint blobs on palette */}
        {[
          { r: 0.22, a: 0.2, color: 0xff6ec7 },
          { r: 0.22, a: 1.6, color: 0xffc1e2 },
          { r: 0.22, a: 3.3, color: 0xffe0f0 },
          { r: 0.22, a: 4.9, color: 0xff3d8c },
        ].map((blob, i) => (
          <mesh
            key={i}
            position={[Math.cos(blob.a) * blob.r, 0.04, Math.sin(blob.a) * blob.r]}
          >
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshBasicMaterial color={blob.color} />
          </mesh>
        ))}
      </group>

      {/* small sparkles around the palette */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={`spark-${i}`}
            position={[Math.cos(a) * 1.1, 1.55, -0.6 + Math.sin(a) * 0.6]}
            material={materials.glow}
          >
            <sphereGeometry args={[0.02, 6, 6]} />
          </mesh>
        );
      })}
    </group>
  );
}
