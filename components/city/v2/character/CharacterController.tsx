'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface CharacterState {
  position: THREE.Vector3;
  heading: number; // radians, 0 = +x
}

interface Props {
  state: CharacterState;
  speed?: number; // units / second
}

/**
 * Kinematic walking controller — reads WASD + Shift from the window
 * and writes into a shared `CharacterState` ref so both the character
 * mesh and FollowCamera can read from the same source without
 * prop-drilling or state broadcasts.
 *
 * Movement is camera-relative: W moves the character in the direction
 * the camera is facing (projected to the ground plane), A/D strafe,
 * S backpedals. Shift doubles speed. No jump, no collision — buildings
 * just pass through for this first pass. Rapier integration lands in a
 * later commit if we need proper collision.
 */
export function CharacterController({ state, speed = 12 }: Props) {
  const { camera } = useThree();
  const keys = useRef({
    forward: false,
    back: false,
    left: false,
    right: false,
    sprint: false,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.back = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.sprint = true;
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.back = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.sprint = false;
          break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, dt) => {
    const { forward, back, left, right, sprint } = keys.current;
    if (!forward && !back && !left && !right) return;

    // Camera-forward projected to ground plane
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const camRight = new THREE.Vector3(camDir.z, 0, -camDir.x);

    const move = new THREE.Vector3();
    if (forward) move.add(camDir);
    if (back) move.addScaledVector(camDir, -1);
    if (right) move.add(camRight);
    if (left) move.addScaledVector(camRight, -1);

    if (move.lengthSq() === 0) return;
    move.normalize();

    const stepDist = (sprint ? speed * 1.8 : speed) * dt;
    state.position.addScaledVector(move, stepDist);
    // Clamp to a 270u radius so the character can't walk off the map
    const r = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
    const MAX = 270;
    if (r > MAX) {
      state.position.x *= MAX / r;
      state.position.z *= MAX / r;
    }
    state.heading = Math.atan2(move.x, move.z);
  });

  return null;
}

/**
 * Visible avatar for the character. A simple emissive capsule for
 * now — later phases swap this for a Meshy-generated framework robot.
 */
export function CharacterMesh({ state }: { state: CharacterState }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.copy(state.position);
    ref.current.position.y = 0.9;
    ref.current.rotation.y = state.heading;
  });
  return (
    <mesh ref={ref} castShadow>
      <capsuleGeometry args={[0.45, 1.0, 4, 10]} />
      <meshStandardMaterial
        color={0xfff7d8}
        emissive={0xfff7d8}
        emissiveIntensity={0.9}
        roughness={0.35}
        metalness={0.3}
      />
    </mesh>
  );
}
