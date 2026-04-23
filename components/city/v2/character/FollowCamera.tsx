'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterState } from './CharacterController';

interface Props {
  state: CharacterState;
  /** Horizontal distance from the character. */
  distance?: number;
  /** How smoothly the camera trails its target position. 0..1 */
  lerp?: number;
}

/**
 * Third-person camera orbiting the character. Position is derived
 * from CharacterState.cameraYaw + cameraPitch (driven by MouseLook)
 * instead of the character's walking heading, so the camera stays
 * where the user pointed it while the character walks in any
 * direction.
 */
export function FollowCamera({ state, distance = 12, lerp = 0.15 }: Props) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const pos = useRef(new THREE.Vector3());

  // Snap on mount so the first frame isn't a jarring lerp-in
  useEffect(() => {
    target.current.copy(state.position).setY(1.2);
    computeDesired(state, distance, pos.current);
    camera.position.copy(pos.current);
    camera.lookAt(target.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const wantTarget = new THREE.Vector3(
      state.position.x,
      1.2,
      state.position.z,
    );
    target.current.lerp(wantTarget, lerp);

    const wantPos = new THREE.Vector3();
    computeDesired(state, distance, wantPos);
    pos.current.lerp(wantPos, lerp);

    camera.position.copy(pos.current);
    camera.lookAt(target.current);
  });

  return null;
}

// Camera sits at distance*cos(pitch) behind the yaw direction, lifted
// by distance*sin(pitch). Pitch is clamped in MouseLook so we can't
// dive under the ground or flip over the head.
function computeDesired(
  state: CharacterState,
  distance: number,
  out: THREE.Vector3,
) {
  const horiz = Math.cos(state.cameraPitch) * distance;
  const vert = Math.sin(state.cameraPitch) * distance;
  out.set(
    state.position.x - Math.sin(state.cameraYaw) * horiz,
    state.position.y + 2.2 + vert,
    state.position.z - Math.cos(state.cameraYaw) * horiz,
  );
}
