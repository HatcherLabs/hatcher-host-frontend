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

// In the room the avatar sits inside the agentAvatar station, which is rotated
// by Math.PI (see world/layout.ts). config.rotationY is tuned relative to THAT
// frame, so reusing it alone made every city walker face backward. Add the
// station rotation back so the avatar's front points along travel (+Z local),
// matching the generic robot.
const ROOM_STATION_ROTATION_Y = Math.PI;

// Per-variant fine-tuning on top of the uniform station correction, for any
// model whose room orientation isn't a clean 180° (e.g. faces sideways).
// Keyed by variant id; value is extra Y rotation in radians.
const CITY_AVATAR_ROTATION_OVERRIDE: Record<string, number> = {};

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
 *
 * Many avatars (drones, mechs, some imports) ship with NO animation clips. For
 * those we drive procedural locomotion so they don't slide along frozen: a walk
 * hop + waddle for grounded models, a gentle float for hover models. `phase`
 * (per-agent) desyncs the motion so a crowd doesn't move in lockstep.
 */
export function CityAvatar({ variant, phase = 0 }: { variant: string; phase?: number }) {
  const config = getGlbAvatarModel(variant);
  const url = config?.url ?? '';
  const gltf = useGLTF(url);
  const hover = config?.hover === true;
  const baseY = hover ? 0.55 : 0;

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
    clone.rotation.y =
      (config.rotationY ?? 0) +
      ROOM_STATION_ROTATION_Y +
      (CITY_AVATAR_ROTATION_OVERRIDE[variant] ?? 0);

    const group = new THREE.Group();
    group.add(clone);
    return group;
  }, [gltf.scene, config, variant]);

  const mixer = useMemo(() => (root ? new THREE.AnimationMixer(root) : null), [root]);
  // True once a real clip is playing — gates the procedural fallback off.
  const hasClip = useMemo(
    () => (root ? pickWalkClip(gltf.animations, config?.clip) !== null : false),
    [root, gltf.animations, config?.clip],
  );

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

  useFrame(({ clock }, delta) => {
    if (hasClip) {
      mixer?.update(delta);
      return;
    }
    if (!root) return;
    const t = clock.elapsedTime + phase;
    if (hover) {
      // Drones / floaters: bob in place + slow yaw drift.
      root.position.y = baseY + Math.sin(t * 1.6) * 0.12;
      root.rotation.y = Math.sin(t * 0.6) * 0.25;
    } else {
      // Grounded static models: fake a walk cadence so they read as moving.
      root.position.y = baseY + Math.abs(Math.sin(t * 6.2)) * 0.07;
      root.rotation.z = Math.sin(t * 6.2) * 0.05;
    }
  });

  if (!root) return null;
  return <primitive object={root} />;
}
