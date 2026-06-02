'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { CharacterState } from '@/components/city/v2/character/CharacterController';
import { EYE_HEIGHT, ROOM_HALF, ROOM_HEIGHT } from '../world/grid';

/**
 * Orbit camera that sits behind the player and looks at them — the third-person
 * counterpart to FirstPersonCamera. Uses the same cameraYaw/cameraPitch
 * conventions, so MouseLook orbits it identically. The camera position is
 * clamped inside the room so it can't slip through the walls.
 */
export function ThirdPersonCamera({ state, distance = 3.4 }: { state: CharacterState; distance?: number }) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  useFrame(() => {
    const eyeX = state.position.x;
    const eyeY = EYE_HEIGHT;
    const eyeZ = state.position.z;

    const horiz = Math.cos(state.cameraPitch);
    const dirX = -Math.sin(state.cameraYaw) * horiz;
    const dirY = Math.sin(state.cameraPitch);
    const dirZ = -Math.cos(state.cameraYaw) * horiz;

    // Behind the look direction, lifted a touch.
    let cx = eyeX - dirX * distance;
    let cy = eyeY - dirY * distance + 0.5;
    let cz = eyeZ - dirZ * distance;

    const m = ROOM_HALF - 0.35;
    cx = THREE.MathUtils.clamp(cx, -m, m);
    cz = THREE.MathUtils.clamp(cz, -m, m);
    cy = THREE.MathUtils.clamp(cy, 0.7, ROOM_HEIGHT - 0.2);

    desired.current.set(cx, cy, cz);
    camera.position.lerp(desired.current, 0.18);
    look.current.set(eyeX, eyeY + 0.1, eyeZ);
    camera.lookAt(look.current);
  });

  return null;
}
