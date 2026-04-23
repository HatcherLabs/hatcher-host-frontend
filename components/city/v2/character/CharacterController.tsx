'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD_HALF } from '../world/grid';

export interface CharacterState {
  position: THREE.Vector3;
  heading: number; // radians, used to face the character mesh
  // Camera orbit controlled by the mouse. Decoupled from character
  // heading so you can look one way while walking another.
  cameraYaw: number;   // radians, 0 = camera behind +z character (looks +x default)
  cameraPitch: number; // radians, 0 = horizontal, + = above character
}

interface Props {
  state: CharacterState;
  speed?: number;
  /** External analog vector, usually the mobile virtual joystick.
   *  Range (-1..1, -1..1). Keyboard and analog stack — whichever is
   *  larger on each axis wins. */
  analog?: { x: number; y: number };
}

/**
 * Kinematic walking controller — reads WASD/Arrows + Shift from the
 * window, drives movement camera-relative (so W = forward regardless
 * of the character's current facing). Writes into a shared
 * CharacterState ref shared with FollowCamera.
 *
 * Strafe math note: "camera right" in Three.js right-handed Y-up
 * (forward=-z default) is +x, computed as cross(forward, up). The
 * shortcut that works for any forward on the x/z plane is
 *     right = ( -forward.z, 0,  forward.x )
 * NOT ( forward.z, 0, -forward.x ). A previous version had the sign
 * flipped, which made A/D feel swapped.
 */
export function CharacterController({ state, speed = 12, analog }: Props) {
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
    const ax = analog?.x ?? 0;
    const ay = analog?.y ?? 0;
    const hasKey = forward || back || left || right;
    const hasAnalog = Math.abs(ax) > 0.05 || Math.abs(ay) > 0.05;
    if (!hasKey && !hasAnalog) return;

    // Camera forward projected to the ground plane.
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    // Right vector — see the doc comment on this component for why.
    const camRight = new THREE.Vector3(-camDir.z, 0, camDir.x);

    const move = new THREE.Vector3();
    if (forward) move.add(camDir);
    if (back) move.addScaledVector(camDir, -1);
    if (right) move.add(camRight);
    if (left) move.addScaledVector(camRight, -1);
    // Analog joystick: x = strafe, y = forward/back (y inverted
    // because touch Y grows downward on screen).
    if (hasAnalog) {
      move.addScaledVector(camDir, -ay);
      move.addScaledVector(camRight, ax);
    }

    if (move.lengthSq() === 0) return;
    move.normalize();

    const stepDist = (sprint ? speed * 1.8 : speed) * dt;
    state.position.addScaledVector(move, stepDist);
    // Clamp so the character can't walk off the map. Derived from the
    // grid extent so it scales automatically with DISTRICT_SIZE tweaks.
    const r = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
    if (r > WORLD_HALF) {
      state.position.x *= WORLD_HALF / r;
      state.position.z *= WORLD_HALF / r;
    }
    state.heading = Math.atan2(move.x, move.z);
  });

  return null;
}

/**
 * Mouse-drag-to-look — read mouse deltas while the primary button is
 * held and apply them to CharacterState.cameraYaw/cameraPitch. Pitch
 * clamped so you can't flip over the top. No pointer lock — a drag
 * feels less intrusive for a survey-to-walk toggle.
 */
export function MouseLook({
  state,
  domElement,
  sensitivity = 0.0035,
}: {
  state: CharacterState;
  domElement?: HTMLElement | null;
  sensitivity?: number;
}) {
  const dragging = useRef(false);
  useEffect(() => {
    const el = domElement ?? window;
    const down = (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.button !== 0) return;
      dragging.current = true;
    };
    const up = () => {
      dragging.current = false;
    };
    const move = (e: Event) => {
      if (!dragging.current) return;
      const pe = e as PointerEvent;
      state.cameraYaw -= pe.movementX * sensitivity;
      state.cameraPitch = Math.max(
        -0.45,
        Math.min(0.95, state.cameraPitch - pe.movementY * sensitivity),
      );
    };
    el.addEventListener('pointerdown', down as EventListener);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move as EventListener);
    return () => {
      el.removeEventListener('pointerdown', down as EventListener);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move as EventListener);
    };
  }, [state, domElement, sensitivity]);
  return null;
}

/** Visible avatar for the character. Emissive capsule placeholder —
 *  framework robot lands in a later commit. */
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
