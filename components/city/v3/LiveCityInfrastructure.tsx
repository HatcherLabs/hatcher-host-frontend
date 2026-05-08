'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export function LiveCityInfrastructure() {
  return (
    <group>
      <SkyDome />
      <GreenHorizon />

      <mesh position={[0, -0.55, 8]} receiveShadow>
        <boxGeometry args={[620, 0.5, 520]} />
        <meshStandardMaterial
          color="#2f6c4c"
          roughness={0.94}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[0, -0.2, 8]} receiveShadow>
        <boxGeometry args={[214, 0.42, 184]} />
        <meshStandardMaterial
          color="#111923"
          roughness={0.76}
          metalness={0.18}
          emissive="#020506"
          emissiveIntensity={0.04}
        />
      </mesh>

      <mesh position={[0, 0.025, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[205, 175]} />
        <meshStandardMaterial
          color="#172333"
          roughness={0.86}
          metalness={0.14}
        />
      </mesh>

      <CoreHub />
      <OuterBeacons />
      <TreeLine />
    </group>
  );
}

function SkyDome() {
  return (
    <mesh>
      <sphereGeometry args={[430, 32, 16]} />
      <meshBasicMaterial color="#8fd3ea" side={THREE.BackSide} />
    </mesh>
  );
}

function GreenHorizon() {
  const hills = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const row = Math.floor(index / 2);
        return {
          key: `hill-${index}`,
          x: side * (115 + row * 15),
          z: -96 + row * 22,
          width: 48 + (index % 5) * 9,
          height: 10 + (index % 4) * 3,
          depth: 18 + (index % 3) * 8,
        };
      }),
    [],
  );

  return (
    <group>
      <mesh position={[0, -0.62, -118]} receiveShadow>
        <boxGeometry args={[340, 0.7, 44]} />
        <meshStandardMaterial color="#366f4f" roughness={0.96} />
      </mesh>
      {hills.map((hill) => (
        <mesh
          key={hill.key}
          position={[hill.x, hill.height / 2 - 0.58, hill.z]}
          receiveShadow
        >
          <boxGeometry args={[hill.width, hill.height, hill.depth]} />
          <meshStandardMaterial color="#244e3a" roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

function CoreHub() {
  return (
    <group position={[0, 0, -2]}>
      <mesh position={[0, 0.36, 0]} receiveShadow>
        <cylinderGeometry args={[8.4, 10.8, 0.72, 8]} />
        <meshStandardMaterial
          color="#182636"
          roughness={0.52}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 7.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 2.25, 14.4, 8]} />
        <meshStandardMaterial
          color="#23394d"
          roughness={0.48}
          metalness={0.34}
          emissive="#0a2733"
          emissiveIntensity={0.16}
        />
      </mesh>
      <mesh position={[0, 16.3, 0]}>
        <octahedronGeometry args={[2.25, 0]} />
        <meshStandardMaterial
          color="#47d7c6"
          roughness={0.34}
          metalness={0.2}
          emissive="#102b2a"
          emissiveIntensity={0.28}
        />
      </mesh>
    </group>
  );
}

function OuterBeacons() {
  const beacons = [
    [-78, 8, -54],
    [78, 8, -50],
    [-70, 7, 64],
    [70, 7, 68],
  ] as const;

  return (
    <group>
      {beacons.map(([x, y, z], index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, y / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, y, 1.2]} />
            <meshStandardMaterial
              color="#213242"
              roughness={0.58}
              metalness={0.24}
            />
          </mesh>
          <mesh position={[0, y + 1.8, 0]}>
            <sphereGeometry args={[1.08, 12, 8]} />
            <meshStandardMaterial
              color={index % 2 ? '#21b991' : '#43b6d9'}
              roughness={0.42}
              metalness={0.16}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function TreeLine() {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const trees = useMemo(() => {
    const positions: Array<{ x: number; z: number; height: number }> = [];
    for (let i = 0; i < 96; i++) {
      const side = i % 4;
      const t = i / 95;
      const jitter = Math.sin(i * 12.9898) * 3.4;
      if (side === 0)
        positions.push({
          x: -126,
          z: -84 + t * 176 + jitter,
          height: 4 + (i % 5) * 0.5,
        });
      if (side === 1)
        positions.push({
          x: 126,
          z: -84 + t * 176 - jitter,
          height: 4.4 + (i % 4) * 0.55,
        });
      if (side === 2)
        positions.push({
          x: -112 + t * 224 + jitter,
          z: -102,
          height: 4.2 + (i % 6) * 0.45,
        });
      if (side === 3)
        positions.push({
          x: -112 + t * 224 - jitter,
          z: 104,
          height: 3.9 + (i % 5) * 0.48,
        });
    }
    return positions;
  }, []);
  const obj = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!trunkRef.current || !crownRef.current) return;

    trees.forEach((tree, index) => {
      obj.position.set(tree.x, tree.height * 0.24, tree.z);
      obj.scale.set(0.42, tree.height * 0.48, 0.42);
      obj.updateMatrix();
      trunkRef.current!.setMatrixAt(index, obj.matrix);

      obj.position.set(tree.x, tree.height * 0.82, tree.z);
      obj.scale.set(tree.height * 0.32, tree.height * 0.52, tree.height * 0.32);
      obj.updateMatrix();
      crownRef.current!.setMatrixAt(index, obj.matrix);
    });

    trunkRef.current.instanceMatrix.needsUpdate = true;
    crownRef.current.instanceMatrix.needsUpdate = true;
  }, [obj, trees]);

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, trees.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#5b4732" roughness={0.92} />
      </instancedMesh>
      <instancedMesh
        ref={crownRef}
        args={[undefined, undefined, trees.length]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#1f6b45" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}
