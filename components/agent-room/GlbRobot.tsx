'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';

// Official Three.js examples CDN — CC0 rigged model with Idle, Walk,
// Run, Dance, Death, Yes, No, Wave, Punch, ThumbsUp, Sitting, Standing
// animation clips baked in. Stable URL (same repo that ships with every
// three.js release), safe to use without auth or attribution beyond MIT.
const ROBOT_URL = 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb';

interface Props {
  palette: FrameworkPalette;
  snapTrigger?: number;
  framework?: string;
}

// Accessory positions are relative to the robot's head — RobotExpressive
// has its head at roughly y≈2.1, body center y≈1.0, after the default
// export. We scale the model ×1.1 and lift it a touch so it sits on the
// platform correctly.

export function GlbRobot({ palette, snapTrigger = 0, framework = 'openclaw' }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(ROBOT_URL) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { actions, mixer } = useAnimations(gltf.animations, groupRef);
  const lastSnapTrigger = useRef(0);
  const lastSnapTime = useRef(-10);

  // Apply framework tint to every mesh under the clone by multiplying
  // the material's color. RobotExpressive uses MeshStandardMaterial
  // throughout — we clone per-mesh so the original textures stay cached.
  useEffect(() => {
    const tint = new THREE.Color(palette.primary);
    clonedScene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const base = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (!base) return;
        const cloned = (base as THREE.MeshStandardMaterial).clone();
        // Blend original color with palette — 65% palette / 35% original
        // to keep some of the model's white/dark accents readable.
        if ('color' in cloned && (cloned as THREE.MeshStandardMaterial).color) {
          const orig = (cloned as THREE.MeshStandardMaterial).color.clone();
          (cloned as THREE.MeshStandardMaterial).color.lerpColors(orig, tint, 0.65);
        }
        if ('emissive' in cloned) {
          (cloned as THREE.MeshStandardMaterial).emissive = new THREE.Color(palette.dim);
          (cloned as THREE.MeshStandardMaterial).emissiveIntensity = 0.15;
        }
        mesh.material = cloned;
      }
    });
  }, [clonedScene, palette]);

  // Start Idle on mount. RobotExpressive clip names are PascalCase.
  useEffect(() => {
    const idle = actions['Idle'];
    idle?.reset().fadeIn(0.3).play();
    return () => {
      idle?.fadeOut(0.3);
    };
  }, [actions]);

  // On snapTrigger, fire a Wave (one-shot) then return to Idle.
  useEffect(() => {
    if (snapTrigger === lastSnapTrigger.current) return;
    lastSnapTrigger.current = snapTrigger;
    lastSnapTime.current = performance.now() / 1000;
    const idle = actions['Idle'];
    const wave = actions['Wave'];
    if (!wave || !idle) return;
    wave.reset();
    wave.setLoop(THREE.LoopOnce, 1);
    wave.clampWhenFinished = true;
    idle.fadeOut(0.2);
    wave.fadeIn(0.2).play();
    const handler = () => {
      wave.fadeOut(0.3);
      idle.reset().fadeIn(0.3).play();
      mixer.removeEventListener('finished', handler);
    };
    mixer.addEventListener('finished', handler);
    return () => {
      mixer.removeEventListener('finished', handler);
    };
  }, [snapTrigger, actions, mixer]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = 0.0 + Math.sin(t * 0.6) * 0.03;
      groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={[0.55, 0.55, 0.55]}>
      <primitive object={clonedScene} />
      {/* Framework-specific accessories sit above the robot's head */}
      <FrameworkAccessory framework={framework} palette={palette} />
    </group>
  );
}

function FrameworkAccessory({ framework, palette }: { framework: string; palette: FrameworkPalette }) {
  const groupRef = useRef<THREE.Group>(null);
  const primary = useMemo(() => new THREE.MeshBasicMaterial({ color: palette.primary }), [palette]);
  const primaryStd = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: palette.primary,
      metalness: 0.5,
      roughness: 0.4,
      emissive: palette.dim,
      emissiveIntensity: 0.4,
    }),
    [palette],
  );
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: palette.bright }), [palette]);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xc89660, metalness: 0.9, roughness: 0.3 }), []);

  // RobotExpressive head sits at roughly y ≈ 3.3 inside the exported
  // scene; accessories hover a bit above that. The scale of the host
  // group is 0.55 so accessory sizes below are in the un-scaled space.
  const HEAD_Y = 3.9;

  // Gentle idle rotation on the accessory group
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.35;
    }
  });

  if (framework === 'hermes') {
    // Purple halo + 4 floating mini books around the head
    return (
      <group ref={groupRef} position={[0, HEAD_Y, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={primary}>
          <torusGeometry args={[0.95, 0.06, 8, 36]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={glow}>
          <torusGeometry args={[0.72, 0.02, 6, 32]} />
        </mesh>
        {Array.from({ length: 4 }).map((_, i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 1.2, 0.1, Math.sin(a) * 1.2]} rotation={[0, a, 0]}>
              <mesh material={primaryStd}>
                <boxGeometry args={[0.3, 0.08, 0.22]} />
              </mesh>
              <mesh position={[0, 0.05, 0]} material={glow}>
                <boxGeometry args={[0.28, 0.01, 0.2]} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (framework === 'elizaos') {
    // Floating hydra crown — 6 orbs orbiting + trailing blue tentacles
    // that dangle from the head region.
    return (
      <>
        <group ref={groupRef} position={[0, HEAD_Y, 0]}>
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <group key={i} position={[Math.cos(a) * 0.85, Math.sin(a * 2) * 0.1, Math.sin(a) * 0.85]}>
                <mesh material={primaryStd}>
                  <sphereGeometry args={[0.12, 12, 10]} />
                </mesh>
                <mesh material={glow}>
                  <sphereGeometry args={[0.05, 10, 8]} />
                </mesh>
              </group>
            );
          })}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={primary}>
            <torusGeometry args={[0.85, 0.015, 6, 36]} />
          </mesh>
        </group>
        {/* Tentacle strands hanging behind the head */}
        {Array.from({ length: 3 }).map((_, i) => {
          const x = -0.35 + i * 0.35;
          return (
            <group key={`t-${i}`} position={[x, HEAD_Y - 1.5, -0.25]}>
              {Array.from({ length: 4 }).map((_, j) => (
                <mesh key={j} position={[0, -j * 0.22, 0]} material={primaryStd}>
                  <sphereGeometry args={[0.1 - j * 0.015, 10, 8]} />
                </mesh>
              ))}
            </group>
          );
        })}
      </>
    );
  }

  if (framework === 'milady') {
    // Floating pink heart crown + twin hair buns attached to the sides
    return (
      <>
        <group ref={groupRef} position={[0, HEAD_Y, 0]}>
          {/* Main heart */}
          <group position={[0, 0.1, 0]}>
            <mesh rotation={[0, 0, Math.PI / 4]} material={primaryStd}>
              <boxGeometry args={[0.35, 0.35, 0.1]} />
            </mesh>
            <mesh position={[-0.12, 0.12, 0]} material={primaryStd}>
              <sphereGeometry args={[0.18, 14, 12]} />
            </mesh>
            <mesh position={[0.12, 0.12, 0]} material={primaryStd}>
              <sphereGeometry args={[0.18, 14, 12]} />
            </mesh>
          </group>
          {/* Sparkle ring */}
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 1.0, Math.sin(a * 2) * 0.1, Math.sin(a) * 1.0]}
                material={glow}
              >
                <sphereGeometry args={[0.04, 8, 6]} />
              </mesh>
            );
          })}
        </group>
        {/* Side buns */}
        {[-1, 1].map((s) => (
          <mesh
            key={`bun-${s}`}
            position={[s * 0.65, HEAD_Y - 0.45, 0]}
            material={primaryStd}
          >
            <sphereGeometry args={[0.28, 14, 12]} />
          </mesh>
        ))}
      </>
    );
  }

  // OpenClaw default — pincer crown with arms jutting outward like claws
  return (
    <>
      <group ref={groupRef} position={[0, HEAD_Y, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={gold}>
          <torusGeometry args={[0.65, 0.05, 8, 28]} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.65, 0.15, Math.sin(a) * 0.65]}
              rotation={[0, a, 0]}
              material={primaryStd}
            >
              <coneGeometry args={[0.08, 0.3, 6]} />
            </mesh>
          );
        })}
      </group>
      {/* Pincer arms sticking out sideways like side-mounted claws */}
      {[-1, 1].map((s) => (
        <group key={`pincer-${s}`} position={[s * 1.6, HEAD_Y - 1.8, 0.2]} rotation={[0, 0, s * 0.3]}>
          <mesh material={primaryStd}>
            <cylinderGeometry args={[0.08, 0.1, 0.5, 8]} />
          </mesh>
          <mesh position={[0, -0.35, 0]} rotation={[0, 0, s * 0.4]} material={primaryStd}>
            <coneGeometry args={[0.12, 0.5, 8]} />
          </mesh>
          <mesh position={[s * 0.18, -0.3, 0]} rotation={[0, 0, s * 1.2]} material={primaryStd}>
            <coneGeometry args={[0.1, 0.4, 8]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// Tell drei to preload so the first room visit doesn't flash empty
useGLTF.preload(ROBOT_URL);
