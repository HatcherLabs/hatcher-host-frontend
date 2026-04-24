'use client';
import { Suspense, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  /** Path under /public/models/agent-room-v2/. */
  url: string;
  /** World scale applied to the loaded GLB (Kenney kits are small). */
  scale?: number;
  /** Optional Y offset so the mesh sits on the floor. */
  yOffset?: number;
  /** Emissive tint blended over the model's materials. */
  emissive?: string;
  /** Strength of the emissive blend (0–2). Raised when the station is
   *  near the player so the model "lights up" on approach. */
  emissiveIntensity?: number;
  /** Target colour blended into material base colour (0 = unchanged,
   *  1 = fully tinted). Defaults to no tint. */
  tint?: string;
  tintAmount?: number;
}

function KenneyModelInner({
  url,
  scale = 1,
  yOffset = 0,
  emissive,
  emissiveIntensity = 0,
  tint,
  tintAmount = 0,
}: Props) {
  const gltf = useGLTF(`/models/agent-room-v2/${url}`) as unknown as {
    scene: THREE.Group;
  };
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

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
    <primitive
      object={clonedScene}
      position={[0, yOffset, 0]}
      scale={[scale, scale, scale]}
    />
  );
}

/**
 * Wraps KenneyModelInner in Suspense so the scene keeps rendering while
 * the GLB streams in. No fallback — an empty station is preferable to a
 * loading spinner here.
 */
export function KenneyModel(props: Props) {
  return (
    <Suspense fallback={null}>
      <KenneyModelInner {...props} />
    </Suspense>
  );
}

// Preload all six models used by the room so the first approach doesn't
// stall while the GLB is fetched.
useGLTF.preload('/models/agent-room-v2/desk_computer.glb');
useGLTF.preload('/models/agent-room-v2/desk_computer_corner.glb');
useGLTF.preload('/models/agent-room-v2/desk_computer_screen.glb');
useGLTF.preload('/models/agent-room-v2/machine_generator.glb');
useGLTF.preload('/models/agent-room-v2/bookcase.glb');
useGLTF.preload('/models/agent-room-v2/cabinet_drawers.glb');
