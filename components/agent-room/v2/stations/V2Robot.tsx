'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { FrameworkPalette } from '../three-palette';

const ROBOT_URL = 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb';

interface Props {
  palette: FrameworkPalette;
  /** When true, switch from Idle to a head-nod loop so the robot visibly
   *  "talks" while the LLM streams its reply. Cross-fade is 0.3s. */
  isStreaming?: boolean;
}

/**
 * Slimmer robot avatar for /room — same base model as GlbRobot but
 * without the framework accessories (halo / books / tentacles / crown).
 * In first-person the accessories spin around the head and read as
 * "extra disconnected hands" from up close, so we drop them for the
 * cockpit experience. Also uses a gentler emissive tint so bloom can
 * be cranked lower without losing framework identity.
 */
export function V2Robot({ palette, isStreaming }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(ROBOT_URL) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };
  // Naive .clone(true) shares skeleton bones with the original scene,
  // so bone transforms driven by useAnimations animate the ORIGINAL
  // skeleton while our SkinnedMesh copies still reference frozen bones
  // — arms and head appear to float in T-pose, disconnected from the
  // body. SkeletonUtils.clone rebuilds the bone hierarchy per-instance.
  const clonedScene = useMemo(() => SkeletonUtils.clone(gltf.scene) as THREE.Group, [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, groupRef);

  useEffect(() => {
    const tint = new THREE.Color(palette.primary);
    clonedScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const base = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!base) return;
      const cloned = (base as THREE.MeshStandardMaterial).clone();
      if ('color' in cloned && (cloned as THREE.MeshStandardMaterial).color) {
        const orig = (cloned as THREE.MeshStandardMaterial).color.clone();
        // Gentler tint (50%) vs GlbRobot's 65% — keeps the robot's
        // white/grey detail readable in dim first-person lighting.
        (cloned as THREE.MeshStandardMaterial).color.lerpColors(orig, tint, 0.5);
      }
      if ('emissive' in cloned) {
        (cloned as THREE.MeshStandardMaterial).emissive = new THREE.Color(palette.dim);
        (cloned as THREE.MeshStandardMaterial).emissiveIntensity = 0.04;
      }
      mesh.material = cloned;
    });
  }, [clonedScene, palette]);

  useEffect(() => {
    const idle = actions['Idle'];
    idle?.reset().fadeIn(0.3).play();
    return () => { idle?.fadeOut(0.3); };
  }, [actions]);

  // Cross-fade to a "talking" clip while the LLM streams. RobotExpressive
  // ships a few expressive clips; 'Yes' is a repeatable head-nod that
  // reads as "active, responding" without being goofy like Wave/Dance.
  useEffect(() => {
    const idle = actions['Idle'];
    const talk = actions['Yes'];
    if (!idle || !talk) return;
    if (isStreaming) {
      talk.reset();
      (talk as THREE.AnimationAction & { loop?: THREE.AnimationActionLoopStyles }).loop = THREE.LoopRepeat;
      talk.clampWhenFinished = false;
      idle.fadeOut(0.25);
      talk.fadeIn(0.25).play();
    } else {
      talk.fadeOut(0.3);
      idle.reset().fadeIn(0.3).play();
    }
  }, [isStreaming, actions]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.02;
    groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.08;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload(ROBOT_URL);
