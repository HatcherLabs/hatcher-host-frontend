'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';

interface Props {
  palette: FrameworkPalette;
  snapTrigger?: number;
}

export function MechLobster({ palette, snapTrigger = 0 }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const leftTopFinger = useRef<THREE.Group>(null);
  const rightTopFinger = useRef<THREE.Group>(null);
  const antLRef = useRef<THREE.Group>(null);
  const antRRef = useRef<THREE.Group>(null);
  const lastSnapTime = useRef(-10);
  const lastSnapTrigger = useRef(0);

  const materials = useMemo(
    () => ({
      shell: new THREE.MeshStandardMaterial({
        color: 0x6a6f86,
        metalness: 0.78,
        roughness: 0.32,
        emissive: 0x1a1520,
        emissiveIntensity: 0.22,
      }),
      shellDeep: new THREE.MeshStandardMaterial({ color: 0x3e4254, metalness: 0.85, roughness: 0.42 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x54586a, metalness: 0.9, roughness: 0.28 }),
      joint: new THREE.MeshStandardMaterial({ color: 0x12141a, metalness: 0.95, roughness: 0.18 }),
      copper: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, metalness: 0.85, roughness: 0.36 }),
      glow: new THREE.MeshBasicMaterial({ color: palette.bright }),
      primary: new THREE.MeshBasicMaterial({ color: palette.primary }),
    }),
    [palette],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.04;
      groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.08;
    }
    if (snapTrigger !== lastSnapTrigger.current) {
      lastSnapTrigger.current = snapTrigger;
      lastSnapTime.current = performance.now() / 1000;
    }
    const dt = performance.now() / 1000 - lastSnapTime.current;
    let open: number;
    if (dt < 0.4) open = 0.9;
    else if (dt < 0.55) open = 0.9 - ((dt - 0.4) / 0.15) * 0.8;
    else open = 0.15 + Math.sin(t * 1.2 + 1) * 0.05;
    if (leftTopFinger.current) leftTopFinger.current.rotation.x = -open;
    if (rightTopFinger.current) rightTopFinger.current.rotation.x = -open;
    if (antLRef.current) antLRef.current.rotation.z = Math.sin(t * 2.1) * 0.12;
    if (antRRef.current) antRRef.current.rotation.z = -Math.sin(t * 2.1 + 0.3) * 0.12;
  });

  const renderClaw = (side: -1 | 1, key: string) => (
    <group key={key} position={[side * 0.85, 0.85, 1.0]} rotation={[0, side * 0.35, 0]}>
      <mesh position={[side * 0.48, 0, 0]} rotation={[0, 0, (side * Math.PI) / 2]} material={materials.shell}>
        <cylinderGeometry args={[0.13, 0.17, 0.9, 10]} />
      </mesh>
      <mesh
        position={[side * 0.48, 0.15, 0]}
        rotation={[0, 0, (side * Math.PI) / 2]}
        material={materials.copper}
      >
        <cylinderGeometry args={[0.04, 0.04, 0.85, 8]} />
      </mesh>
      <mesh position={[side * 0.95, 0, 0]} material={materials.joint}>
        <sphereGeometry args={[0.17, 14, 10]} />
      </mesh>
      <mesh position={[side * 0.95, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.primary}>
        <torusGeometry args={[0.18, 0.02, 6, 18]} />
      </mesh>
      <group position={[side * 0.95, 0, 0]}>
        <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={materials.shell}>
          <cylinderGeometry args={[0.16, 0.13, 0.95, 10]} />
        </mesh>
        <mesh position={[0, 0.13, 0.5]} material={materials.copper}>
          <boxGeometry args={[0.04, 0.04, 0.9]} />
        </mesh>
        <mesh position={[0, 0, 1.05]} material={materials.shellDeep}>
          <sphereGeometry args={[0.22, 16, 12]} />
        </mesh>
        <group ref={side === -1 ? leftTopFinger : rightTopFinger} position={[0, 0.12, 1.05]}>
          <mesh position={[0, 0.12, 0.45]} rotation={[Math.PI / 2, 0, 0]} material={materials.shell}>
            <coneGeometry args={[0.12, 0.78, 8]} />
          </mesh>
          <mesh position={[0, 0.12, 0.88]} rotation={[Math.PI / 2, 0, 0]} material={materials.primary}>
            <coneGeometry args={[0.07, 0.18, 6]} />
          </mesh>
          {[0, 1, 2].map((j) => (
            <mesh
              key={j}
              position={[0, 0.04, 0.25 + j * 0.18]}
              rotation={[Math.PI, 0, 0]}
              material={materials.joint}
            >
              <coneGeometry args={[0.04, 0.1, 4]} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, -0.12, 1.5]} rotation={[Math.PI / 2, 0, 0]} material={materials.shell}>
          <coneGeometry args={[0.12, 0.78, 8]} />
        </mesh>
        <mesh position={[0, -0.12, 1.85]} rotation={[Math.PI / 2, 0, 0]} material={materials.primary}>
          <coneGeometry args={[0.07, 0.18, 6]} />
        </mesh>
        {[0, 1, 2].map((j) => (
          <mesh key={j} position={[0, -0.1, 1.3 + j * 0.18]} material={materials.joint}>
            <coneGeometry args={[0.04, 0.1, 4]} />
          </mesh>
        ))}
        <mesh position={[0, 0, 1.3]} material={materials.glow}>
          <boxGeometry args={[0.04, 0.03, 0.6]} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group ref={groupRef}>
      {/* tail segments */}
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={`seg-${i}`}>
          <mesh
            position={[0, 0.55 - i * 0.04, -0.3 - i * 0.45]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1, 0.75, 1]}
            material={i % 2 === 0 ? materials.shell : materials.shellDeep}
          >
            <sphereGeometry args={[0.56 - i * 0.08, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
          </mesh>
          <mesh
            position={[0, 0.58 - i * 0.04, -0.25 - i * 0.45]}
            rotation={[-Math.PI / 2, 0, Math.PI]}
            material={materials.primary}
          >
            <torusGeometry args={[0.48 - i * 0.08, 0.02, 6, 20, Math.PI]} />
          </mesh>
        </group>
      ))}
      {[-1, 0, 1].map((i) => (
        <mesh
          key={`fan-${i}`}
          position={[i * 0.22, 0.46, -2.6]}
          rotation={[Math.PI / 2, 0, i * 0.5]}
          material={materials.shellDeep}
        >
          <coneGeometry args={[0.18, 0.55, 6]} />
        </mesh>
      ))}
      {/* body */}
      <mesh position={[0, 0.7, 0.3]} scale={[1, 0.75, 1.3]} material={materials.shell}>
        <sphereGeometry args={[0.9, 32, 20]} />
      </mesh>
      <mesh position={[0, 1.13, 0.25]} rotation={[Math.PI / 2, 0, 0]} material={materials.primary}>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 18]} />
      </mesh>
      <mesh position={[0, 1.14, 0.25]} rotation={[Math.PI / 2, 0, 0]} material={materials.copper}>
        <torusGeometry args={[0.22, 0.025, 8, 24]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={`panel-${i}`}
          position={[0, 0.7 + i * 0.08, 0.3]}
          rotation={[Math.PI / 2, 0, 0]}
          material={materials.copper}
        >
          <torusGeometry args={[0.82 - i * 0.05, 0.008, 4, 32, Math.PI]} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`spike-${i}`}
          position={[0, 1.3 - i * 0.04, 0.6 - i * 0.3]}
          rotation={[-0.15, 0, 0]}
          material={materials.joint}
        >
          <coneGeometry args={[0.06, 0.22, 5]} />
        </mesh>
      ))}
      {/* head */}
      <mesh position={[0, 0.9, 1.4]} scale={[1, 0.9, 1.1]} material={materials.shell}>
        <sphereGeometry args={[0.52, 24, 16]} />
      </mesh>
      <mesh position={[0, 1.06, 1.85]} material={materials.primary}>
        <boxGeometry args={[0.72, 0.08, 0.06]} />
      </mesh>
      <mesh position={[0, 1.0, 1.85]} rotation={[Math.PI / 2 + 0.1, 0, 0]} material={materials.joint}>
        <coneGeometry args={[0.08, 0.38, 6]} />
      </mesh>
      {[-0.28, 0.28].map((x, i) => (
        <mesh key={`eye-${i}`} position={[x, 1.15, 1.6]} material={materials.glow}>
          <sphereGeometry args={[0.1, 12, 8]} />
        </mesh>
      ))}
      <group ref={antLRef} position={[-0.2, 1.1, 1.8]} rotation={[-0.3, 0, 0]}>
        <mesh position={[0, 1.0, 0]} rotation={[0, 0, -0.5]} material={materials.primary}>
          <cylinderGeometry args={[0.01, 0.025, 2.0, 6]} />
        </mesh>
      </group>
      <group ref={antRRef} position={[0.2, 1.1, 1.8]} rotation={[-0.3, 0, 0]}>
        <mesh position={[0, 1.0, 0]} rotation={[0, 0, 0.5]} material={materials.primary}>
          <cylinderGeometry args={[0.01, 0.025, 2.0, 6]} />
        </mesh>
      </group>
      {/* walking legs — 4 pairs */}
      {[0, 1, 2, 3].flatMap((pair) =>
        [-1, 1].map((side) => (
          <group
            key={`leg-${pair}-${side}`}
            position={[side * 0.65, 0.6, -0.4 + pair * 0.4]}
            rotation={[0, 0, side * 0.4]}
          >
            <mesh position={[0, -0.25, 0]} material={materials.steel}>
              <cylinderGeometry args={[0.08, 0.06, 0.5, 8]} />
            </mesh>
            <mesh position={[side * 0.22, -0.64, 0]} rotation={[0, 0, side * 0.8]} material={materials.steel}>
              <cylinderGeometry args={[0.05, 0.03, 0.45, 6]} />
            </mesh>
            <mesh position={[side * 0.48, -0.9, 0]} material={materials.shellDeep}>
              <sphereGeometry args={[0.05, 8, 6]} />
            </mesh>
          </group>
        )),
      )}
      {/* big claws */}
      {renderClaw(-1, 'claw-l')}
      {renderClaw(1, 'claw-r')}
    </group>
  );
}
