'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterState } from './CharacterController';

interface Props {
  state: CharacterState;
  /** Horizontal distance behind the character. */
  distance?: number;
  /** Height above the character. */
  height?: number;
  /** 0..1 — higher = snappier follow. */
  lerp?: number;
}

/**
 * Third-person camera that trails the character. Reads heading from
 * the shared `CharacterState` ref so the camera stays behind the
 * character's current facing direction. Mouse drag is NOT handled here
 * — OrbitControls is unmounted while in walk mode.
 */
export function FollowCamera({
  state,
  distance = 10,
  height = 6,
  lerp = 0.12,
}: Props) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const pos = useRef(new THREE.Vector3());

  // Snap on mount so the first frame isn't a jarring lerp-in
  useEffect(() => {
    target.current.copy(state.position).setY(1.2);
    const back = new THREE.Vector3(
      Math.sin(state.heading + Math.PI),
      0,
      Math.cos(state.heading + Math.PI),
    );
    pos.current
      .copy(state.position)
      .addScaledVector(back, distance)
      .setY(height);
    camera.position.copy(pos.current);
    camera.lookAt(target.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    // Desired target = character head height
    const wantTarget = new THREE.Vector3(
      state.position.x,
      1.2,
      state.position.z,
    );
    target.current.lerp(wantTarget, lerp);

    // Desired camera position = distance behind character heading
    const back = new THREE.Vector3(
      Math.sin(state.heading + Math.PI),
      0,
      Math.cos(state.heading + Math.PI),
    );
    const wantPos = new THREE.Vector3()
      .copy(state.position)
      .addScaledVector(back, distance);
    wantPos.y = height;
    pos.current.lerp(wantPos, lerp);

    camera.position.copy(pos.current);
    camera.lookAt(target.current);
  });

  return null;
}
