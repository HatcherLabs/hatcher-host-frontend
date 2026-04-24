'use client';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  /** Path under /public/models/agent-room-v2/. */
  url: string;
  /** Target world-space height in metres. The loaded GLB's bounding
   *  box is measured and uniformly scaled to match this height, then
   *  offset so its bottom sits at y=0 regardless of the source pivot.
   *  This makes Kenney + Quaternius + Mixamo models drop in cleanly. */
  targetHeight?: number;
  /** Horizontal offset in world space (after scaling) — used when the
   *  model's X/Z pivot isn't centred. Usually leave 0. */
  offset?: [number, number, number];
  /** Rotate the model before scaling. Y rotation — applied in addition
   *  to whatever the parent <group> already has. */
  rotationY?: number;
  /** Emissive tint blended over the model's materials. */
  emissive?: string;
  /** Strength of the emissive blend (0–2). Raised when the station is
   *  near the player so the model "lights up" on approach. */
  emissiveIntensity?: number;
  /** Base colour tint blend (0 = unchanged, 1 = fully tinted). */
  tint?: string;
  tintAmount?: number;
}

function KenneyModelInner({
  url,
  targetHeight = 1.5,
  offset = [0, 0, 0],
  rotationY = 0,
  emissive,
  emissiveIntensity = 0,
  tint,
  tintAmount = 0,
}: Props) {
  const gltf = useGLTF(`/models/agent-room-v2/${url}`) as unknown as {
    scene: THREE.Group;
  };
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const outerRef = useRef<THREE.Group>(null);

  // Measure the bounding box and compute scale + pivot offset so the
  // model's base ends up at y=0 and its height matches targetHeight.
  const { scale, yAlign } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = size.y > 0 ? targetHeight / size.y : 1;
    // After scaling by s, the model's minY is at box.min.y * s. Push it
    // up so minY = 0 (sits on the floor).
    const y = -box.min.y * s;
    return { scale: s, yAlign: y };
  }, [clonedScene, targetHeight]);

  useEffect(() => {
    const emissiveColor = emissive ? new THREE.Color(emissive) : null;
    const tintColor = tint && tintAmount > 0 ? new THREE.Color(tint) : null;
    clonedScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const base = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!base) return;
      const mat = (base as THREE.MeshStandardMaterial).clone();
      if (tintColor && 'color' in mat) {
        const orig = mat.color.clone();
        mat.color.lerpColors(orig, tintColor, tintAmount);
      }
      if (emissiveColor && 'emissive' in mat) {
        mat.emissive = emissiveColor;
        mat.emissiveIntensity = emissiveIntensity;
      }
      mat.needsUpdate = true;
      mesh.material = mat;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [clonedScene, emissive, emissiveIntensity, tint, tintAmount]);

  return (
    <group
      ref={outerRef}
      position={[offset[0], offset[1] + yAlign, offset[2]]}
      rotation={[0, rotationY, 0]}
      scale={[scale, scale, scale]}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

export function KenneyModel(props: Props) {
  return (
    <Suspense fallback={null}>
      <KenneyModelInner {...props} />
    </Suspense>
  );
}

useGLTF.preload('/models/agent-room-v2/desk_computer.glb');
useGLTF.preload('/models/agent-room-v2/desk_computer_corner.glb');
useGLTF.preload('/models/agent-room-v2/desk_computer_screen.glb');
useGLTF.preload('/models/agent-room-v2/machine_generator.glb');
useGLTF.preload('/models/agent-room-v2/bookcase.glb');
useGLTF.preload('/models/agent-room-v2/cabinet_drawers.glb');
