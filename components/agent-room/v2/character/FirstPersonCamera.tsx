'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterState } from '@/components/city/v2/character/CharacterController';
import { EYE_HEIGHT } from '../world/grid';

interface Props {
  state: CharacterState;
  /** How fast the camera chases the player position. 0..1 */
  lerp?: number;
}

/**
 * First-person camera locked to the character's head. Position follows
 * the character instantly (lerp=1 by default) so the view feels
 * responsive — no parallax between your body and the camera. Direction
 * is driven by CharacterState.cameraYaw/cameraPitch, same as
 * FollowCamera, so MouseLook keeps working unchanged.
 *
 * Unlike FollowCamera this stays INSIDE the room — the camera is never
 * placed behind the character and therefore can't slip through walls.
 */
export function FirstPersonCamera({ state, lerp = 1 }: Props) {
  const { camera } = useThree();
  const eye = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());

  useEffect(() => {
    eye.current.set(state.position.x, EYE_HEIGHT, state.position.z);
    camera.position.copy(eye.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const wantEye = new THREE.Vector3(
      state.position.x,
      EYE_HEIGHT,
      state.position.z,
    );
    if (lerp >= 1) {
      eye.current.copy(wantEye);
    } else {
      eye.current.lerp(wantEye, lerp);
    }

    // Look direction from yaw/pitch — same sign conventions as
    // FollowCamera so mouse deltas feel identical across modes.
    const horiz = Math.cos(state.cameraPitch);
    const dirX = -Math.sin(state.cameraYaw) * horiz;
    const dirY = Math.sin(state.cameraPitch);
    const dirZ = -Math.cos(state.cameraYaw) * horiz;

    target.current.set(
      eye.current.x + dirX,
      eye.current.y + dirY,
      eye.current.z + dirZ,
    );

    camera.position.copy(eye.current);
    camera.lookAt(target.current);
  });

  return null;
}
