'use client';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { getGlbAvatarModel } from '@/components/agent-room/v2/stations/AgentBody';

// City walkers are miniatures next to the buildings — render every avatar at a
// consistent walker height regardless of its room (human-scale) target.
const CITY_AVATAR_HEIGHT = 1.06;

function pickWalkClip(
  animations: THREE.AnimationClip[],
  preferred: string | number | undefined,
): THREE.AnimationClip | null {
  if (!animations.length) return null;
  // A real walk/run cycle reads best while gliding along the path; fall back to
  // the model's configured idle clip, then to anything.
  const moving = animations.find((c) => /walk|run|move/i.test(c.name));
  if (moving) return moving;
  if (typeof preferred === 'string') {
    return THREE.AnimationClip.findByName(animations, preferred) ?? animations[0]!;
  }
  if (typeof preferred === 'number') return animations[preferred] ?? animations[0]!;
  return animations[0]!;
}

/**
 * Renders an agent's real chosen avatar (rigged GLB) as a city walker body.
 * Suspends while the model loads — callers wrap it in <Suspense> with a generic
 * robot fallback. drei's useGLTF caches by URL, so N walkers sharing a model
 * download it once; per-walker cost is a clone + AnimationMixer.
 */
export function CityAvatar({ variant }: { variant: string }) {
  const config = getGlbAvatarModel(variant);
  const url = config?.url ?? '';
  const gltf = useGLTF(url);

  const root = useMemo(() => {
    if (!config) return null;
    const clone =
      config.cloneMode === 'scene'
        ? (gltf.scene.clone(true) as THREE.Group)
        : (cloneSkeleton(gltf.scene) as THREE.Group);

    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });

    if (config.rotationX) clone.rotation.x = config.rotationX;
    if (config.rotationZ) clone.rotation.z = config.rotationZ;

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const scale = CITY_AVATAR_HEIGHT / Math.max(size.y, 0.001);
    clone.scale.setScalar(scale);

    const scaled = new THREE.Box3().setFromObject(clone);
    const center = scaled.getCenter(new THREE.Vector3());
    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= scaled.min.y; // feet on the ground
    if (config.offset) {
      clone.position.x += config.offset[0];
      clone.position.y += config.offset[1];
      clone.position.z += config.offset[2];
    }
    if (config.rotationY) clone.rotation.y = config.rotationY;

    const group = new THREE.Group();
    group.add(clone);
    return group;
  }, [gltf.scene, config]);

  const mixer = useMemo(() => (root ? new THREE.AnimationMixer(root) : null), [root]);

  useEffect(() => {
    if (!mixer || !root) return;
    const clip = pickWalkClip(gltf.animations, config?.clip);
    if (clip) {
      mixer.clipAction(clip).reset().fadeIn(0.2).play();
    }
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    };
  }, [mixer, root, gltf.animations, config?.clip]);

  useFrame((_, delta) => {
    mixer?.update(delta);
  });

  if (!root) return null;
  return <primitive object={root} />;
}
