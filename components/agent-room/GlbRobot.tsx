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
  const primary = useMemo(() => new THREE.MeshBasicMaterial({ color: palette.primary }), [palette]);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xc89660, metalness: 0.9, roughness: 0.3 }), []);

  // RobotExpressive head sits roughly at local y ≈ 3.3 inside the
  // exported scene — we hover the accessory a bit above that.
  const HEAD_Y = 3.9;

  if (framework === 'hermes') {
    // Halo ring
    return (
      <group position={[0, HEAD_Y, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={primary}>
          <torusGeometry args={[0.8, 0.05, 8, 32]} />
        </mesh>
      </group>
    );
  }
  if (framework === 'elizaos') {
    // Crown of 5 small orbs
    return (
      <group position={[0, HEAD_Y, 0]}>
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7]} material={primary}>
              <sphereGeometry args={[0.1, 10, 8]} />
            </mesh>
          );
        })}
      </group>
    );
  }
  if (framework === 'milady') {
    // Heart above head
    return (
      <group position={[0, HEAD_Y, 0]}>
        <mesh rotation={[0, 0, Math.PI / 4]} material={primary}>
          <boxGeometry args={[0.25, 0.25, 0.08]} />
        </mesh>
        <mesh position={[-0.09, 0.09, 0]} material={primary}>
          <sphereGeometry args={[0.13, 12, 10]} />
        </mesh>
        <mesh position={[0.09, 0.09, 0]} material={primary}>
          <sphereGeometry args={[0.13, 12, 10]} />
        </mesh>
      </group>
    );
  }
  // openclaw default — small crown of pincer spikes
  return (
    <group position={[0, HEAD_Y, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={gold}>
        <torusGeometry args={[0.55, 0.04, 8, 24]} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.55, 0.15, Math.sin(a) * 0.55]}
            rotation={[0, a, 0]}
            material={primary}
          >
            <coneGeometry args={[0.07, 0.22, 6]} />
          </mesh>
        );
      })}
    </group>
  );
}

// Tell drei to preload so the first room visit doesn't flash empty
useGLTF.preload(ROBOT_URL);
