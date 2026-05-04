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
  const lastPosition = useRef(new THREE.Vector3());
  const bobPhase = useRef(0);

  // Snap on mount so the first frame isn't a jarring lerp-in
  useEffect(() => {
    target.current.copy(state.position).setY(1.2);
    computeDesired(state, distance, pos.current);
    camera.position.copy(pos.current);
    camera.lookAt(target.current);
    lastPosition.current.copy(state.position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock }, dt) => {
    const movement = state.position.distanceTo(lastPosition.current);
    const speed = dt > 0 ? movement / dt : 0;
    const walk = THREE.MathUtils.clamp(speed / 16, 0, 1);
    bobPhase.current += dt * (walk > 0.02 ? THREE.MathUtils.lerp(5.5, 9, walk) : 1.2);
    lastPosition.current.copy(state.position);

    const forward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
    const lookAhead = walk * 1.2;
    const bob = Math.sin(bobPhase.current * 2) * 0.16 * walk;
    const breathe = Math.sin(clock.getElapsedTime() * 0.9) * 0.025;

    const wantTarget = new THREE.Vector3(
      state.position.x + forward.x * lookAhead,
      1.25 + bob * 0.35 + breathe,
      state.position.z + forward.z * lookAhead,
    );
    target.current.lerp(wantTarget, lerp);

    const wantPos = new THREE.Vector3();
    computeDesired(state, distance, wantPos);
    wantPos.y += bob + breathe;
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
