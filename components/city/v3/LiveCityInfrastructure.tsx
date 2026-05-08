'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  LIVE_CITY_BLOCKS,
  LIVE_CITY_BOUNDS,
  LIVE_CITY_ROADS,
} from './liveLayout';

export function LiveCityInfrastructure() {
  return (
    <group>
      <SkyDome />
      <GreenHorizon />

      <mesh position={[0, -0.58, LIVE_CITY_BOUNDS.centerZ]} receiveShadow>
        <boxGeometry args={[760, 0.5, 560]} />
        <meshStandardMaterial
          color="#28724d"
          roughness={0.94}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[0, -0.2, LIVE_CITY_BOUNDS.centerZ]} receiveShadow>
        <boxGeometry
          args={[LIVE_CITY_BOUNDS.width + 18, 0.42, LIVE_CITY_BOUNDS.depth + 16]}
        />
        <meshStandardMaterial
          color="#172126"
          roughness={0.86}
          metalness={0.08}
        />
      </mesh>

      <mesh
        position={[0, 0.018, LIVE_CITY_BOUNDS.centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[LIVE_CITY_BOUNDS.width, LIVE_CITY_BOUNDS.depth]} />
        <meshStandardMaterial
          color="#273135"
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>

      <CityBlocks />
      <StreetGrid />
      <CityFurniture />
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
      Array.from({ length: 24 }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const row = Math.floor(index / 2);
        return {
          key: `hill-${index}`,
          x: side * (165 + row * 18),
          z: -138 + row * 23,
          width: 58 + (index % 5) * 11,
          height: 8 + (index % 4) * 2.5,
          depth: 20 + (index % 3) * 8,
        };
      }),
    [],
  );

  return (
    <group>
      <mesh position={[0, -0.62, -158]} receiveShadow>
        <boxGeometry args={[520, 0.7, 54]} />
        <meshStandardMaterial color="#3c845f" roughness={0.96} />
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

function CityBlocks() {
  return (
    <group>
      {LIVE_CITY_BLOCKS.map((block) => (
        <group key={block.id} position={[block.x, 0.062, block.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[block.padWidth, block.padDepth]} />
            <meshStandardMaterial
              color={
                block.accent === 'core'
                  ? '#303c40'
                  : block.accent === 'inner'
                    ? '#2b3639'
                    : '#263033'
              }
              roughness={0.92}
              metalness={0.03}
            />
          </mesh>
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[block.padWidth + 1.1, block.padDepth + 1.1]} />
            <meshBasicMaterial color="#3b4547" transparent opacity={0.32} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function StreetGrid() {
  return (
    <group>
      {LIVE_CITY_ROADS.map((road) => (
        <mesh
          key={road.key}
          position={[road.x, 0.082, road.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[road.width, road.depth]} />
          <meshStandardMaterial
            color="#10181c"
            roughness={0.88}
            metalness={0.03}
          />
        </mesh>
      ))}
      <LaneMarks />
    </group>
  );
}

function LaneMarks() {
  const marks = useMemo(() => {
    const out: Array<{
      key: string;
      x: number;
      z: number;
      width: number;
      depth: number;
    }> = [];

    for (const road of LIVE_CITY_ROADS) {
      const count = road.kind === 'vertical' ? 24 : 28;
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count - 0.5;
        if (road.kind === 'vertical') {
          out.push({
            key: `${road.key}-mark-${i}`,
            x: road.x,
            z: road.z + t * (road.depth - 18),
            width: 0.34,
            depth: 3.6,
          });
        } else {
          out.push({
            key: `${road.key}-mark-${i}`,
            x: road.x + t * (road.width - 18),
            z: road.z,
            width: 3.6,
            depth: 0.34,
          });
        }
      }
    }

    return out;
  }, []);

  return (
    <group>
      {marks.map((mark) => (
        <mesh
          key={mark.key}
          position={[mark.x, 0.091, mark.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[mark.width, mark.depth]} />
          <meshBasicMaterial color="#c8d1c9" transparent opacity={0.34} />
        </mesh>
      ))}
    </group>
  );
}

function OuterBeacons() {
  const beacons = [
    [-166, 6.5, -132],
    [166, 6.5, -132],
    [-166, 6.5, 148],
    [166, 6.5, 148],
  ] as const;

  return (
    <group>
      {beacons.map(([x, y, z]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, y / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, y, 1.1]} />
            <meshStandardMaterial
              color="#202b2d"
              roughness={0.72}
              metalness={0.12}
            />
          </mesh>
          <mesh position={[0, y + 0.9, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.82, 12, 8]} />
            <meshStandardMaterial
              color="#7d938d"
              roughness={0.62}
              metalness={0.1}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CityGateways() {
  return (
    <group>
      <mesh position={[0, 0.24, -142]} receiveShadow>
        <boxGeometry args={[54, 0.48, 5.5]} />
        <meshStandardMaterial
          color="#202b2d"
          roughness={0.84}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, 0.24, 158]} receiveShadow>
        <boxGeometry args={[54, 0.48, 5.5]} />
        <meshStandardMaterial
          color="#202b2d"
          roughness={0.84}
          metalness={0.08}
        />
      </mesh>
    </group>
  );
}

function CityFurniture() {
  return (
    <group>
      <OuterBeacons />
      <CityGateways />
    </group>
  );
}

function TreeLine() {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const trees = useMemo(() => {
    const positions: Array<{ x: number; z: number; height: number }> = [];
    for (let i = 0; i < 140; i++) {
      const side = i % 4;
      const t = i / 139;
      const jitter = Math.sin(i * 12.9898) * 4.8;
      if (side === 0)
        positions.push({
          x: -206,
          z: -142 + t * 306 + jitter,
          height: 4 + (i % 5) * 0.5,
        });
      if (side === 1)
        positions.push({
          x: 206,
          z: -142 + t * 306 - jitter,
          height: 4.4 + (i % 4) * 0.55,
        });
      if (side === 2)
        positions.push({
          x: -178 + t * 356 + jitter,
          z: -170,
          height: 4.2 + (i % 6) * 0.45,
        });
      if (side === 3)
        positions.push({
          x: -178 + t * 356 - jitter,
          z: 184,
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
