'use client';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  createSeededRng,
  LIVE_CITY_GUTTER,
  LIVE_CITY_SUPER_W,
  LIVE_CITY_TILE,
  type LiveCityGrid,
  type LiveCityTimeMode,
} from './liveCityHandoff';
import {
  createTreeRingSpecs,
  hashUnit,
  TERRAIN_SEGMENTS,
  TERRAIN_SIZE,
  terrainHeightAt,
} from './liveCityEnvironment';

interface InfrastructureProps {
  grid: LiveCityGrid;
  timeMode: LiveCityTimeMode;
}

interface GridProps {
  grid: LiveCityGrid;
}

export function LiveCityInfrastructure({ grid, timeMode }: InfrastructureProps) {
  return (
    <group>
      <SkyDome timeMode={timeMode} />
      <Stars timeMode={timeMode} />
      <Terrain grid={grid} timeMode={timeMode} />
      <MountainRing timeMode={timeMode} />
      <StreetGrid grid={grid} />
      <CitySignalBackbone grid={grid} timeMode={timeMode} />
      <StreetLights grid={grid} timeMode={timeMode} />
      <TreeRing grid={grid} timeMode={timeMode} />
    </group>
  );
}

function SkyDome({ timeMode }: { timeMode: LiveCityTimeMode }) {
  const uniforms = useMemo(
    () => ({
      uTop: {
        value: new THREE.Color(timeMode === 'day' ? 0x78a9df : 0x070d20),
      },
      uBottom: {
        value: new THREE.Color(timeMode === 'day' ? 0xe5edf4 : 0x1a2548),
      },
      uOffset: { value: timeMode === 'day' ? 0 : 0.05 },
      uExp: { value: timeMode === 'day' ? 0.72 : 0.5 },
    }),
    [timeMode],
  );

  return (
    <mesh>
      <sphereGeometry args={[900, 32, 18]} />
      <shaderMaterial
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vWorld;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `}
        fragmentShader={`
          uniform vec3 uTop;
          uniform vec3 uBottom;
          uniform float uOffset;
          uniform float uExp;
          varying vec3 vWorld;
          void main() {
            float h = normalize(vWorld).y;
            float t = pow(max(h + uOffset, 0.0), uExp);
            vec3 col = mix(uBottom, uTop, clamp(t, 0.0, 1.0));
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function Stars({ timeMode }: { timeMode: LiveCityTimeMode }) {
  const geometry = useMemo(() => {
    const rng = createSeededRng(321_903);
    const starCount = 600;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = rng();
      const v = rng() * 0.85 + 0.05;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(1 - v);
      const radius = 800;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const points = new THREE.BufferGeometry();
    points.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return points;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#ffffff"
        size={1.6}
        sizeAttenuation={false}
        transparent
        opacity={timeMode === 'night' ? 0.85 : 0}
      />
    </points>
  );
}

function Terrain({ grid, timeMode }: InfrastructureProps) {
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      TERRAIN_SEGMENTS,
      TERRAIN_SEGMENTS,
    );
    terrain.rotateX(-Math.PI / 2);
    const positions = terrain.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);
    const grass = new THREE.Color(timeMode === 'day' ? 0x7dbb72 : 0x314a31);
    const grass2 = new THREE.Color(timeMode === 'day' ? 0x95ca86 : 0x3f5d3c);
    const dirt = new THREE.Color(timeMode === 'day' ? 0x8b805c : 0x514b37);
    const rock = new THREE.Color(timeMode === 'day' ? 0x6d7588 : 0x343847);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const height = terrainHeightAt(x, z, grid.half);
      positions.setY(i, height);

      const color =
        height < 0.4
          ? grass.clone().lerp(grass2, hashUnit(`terrain-grass-${i}`) * 0.5)
          : height < 2.5
            ? grass2.clone().lerp(dirt, Math.min(1, height / 3))
            : dirt.clone().lerp(rock, Math.min(1, (height - 2) / 4));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrain.computeVertexNormals();
    return terrain;
  }, [grid.half, timeMode]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={[0, -0.05, 0]} receiveShadow>
      <meshLambertMaterial vertexColors flatShading />
    </mesh>
  );
}

function StreetGrid({ grid }: GridProps) {
  const stripeMarks = useMemo(() => {
    const marks: Array<{
      key: string;
      x: number;
      z: number;
      width: number;
      depth: number;
    }> = [];

    for (const z of grid.streetZs) {
      for (let superBlock = 0; superBlock < grid.Nsb; superBlock++) {
        for (let dash = 0; dash < 3; dash++) {
          marks.push({
            key: `h-${z}-${superBlock}-${dash}`,
            x:
              -grid.half +
              LIVE_CITY_GUTTER +
              superBlock * LIVE_CITY_TILE +
              (dash + 0.5) * (LIVE_CITY_SUPER_W / 3) -
              0.6,
            z,
            width: 1.2,
            depth: 0.07,
          });
        }
      }
    }

    for (const x of grid.streetXs) {
      for (let superBlock = 0; superBlock < grid.Nsb; superBlock++) {
        for (let dash = 0; dash < 3; dash++) {
          marks.push({
            key: `v-${x}-${superBlock}-${dash}`,
            x,
            z:
              -grid.half +
              LIVE_CITY_GUTTER +
              superBlock * LIVE_CITY_TILE +
              (dash + 0.5) * (LIVE_CITY_SUPER_W / 3) -
              0.6,
            width: 0.07,
            depth: 1.2,
          });
        }
      }
    }

    return marks;
  }, [grid]);

  return (
    <group>
      {grid.roads.map((road) => (
        <mesh key={road.key} position={[road.x, 0, road.z]} receiveShadow>
          <boxGeometry args={[road.width, 0.04, road.depth]} />
          <meshLambertMaterial color={0x1a2130} />
        </mesh>
      ))}
      {stripeMarks.map((mark) => (
        <mesh key={mark.key} position={[mark.x, 0.001, mark.z]}>
          <boxGeometry args={[mark.width, 0.045, mark.depth]} />
          <meshBasicMaterial color={0xcfd8ea} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function CitySignalBackbone({ grid, timeMode }: InfrastructureProps) {
  const packetRefs = useRef<(THREE.Mesh | null)[]>([]);
  const packetCount = Math.min(18, Math.max(6, grid.Nsb * 3));
  const travelLength = Math.max(20, grid.totalW - LIVE_CITY_GUTTER * 2);
  const glowColor = timeMode === 'night' ? '#65e7ff' : '#0b5f47';
  const packetA = timeMode === 'night' ? '#65e7ff' : '#0f766e';
  const packetB = timeMode === 'night' ? '#39ff88' : '#047857';

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    packetRefs.current.forEach((packet, index) => {
      if (!packet) return;
      const lane = index % 2 === 0 ? -0.55 : 0.55;
      const forward = index % 3 !== 0;
      const phase = (t * 0.075 + index / packetCount) % 1;
      packet.position.x = forward
        ? -travelLength / 2 + phase * travelLength
        : travelLength / 2 - phase * travelLength;
      packet.position.z = lane;
      const material = packet.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(t * 3 + index) * 0.12;
    });
  });

  return (
    <group position={[0, 0.035, 0]}>
      <mesh>
        <boxGeometry args={[travelLength, 0.012, 0.09]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={timeMode === 'night' ? 0.18 : 0.1}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[travelLength, 0.012, 0.09]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={timeMode === 'night' ? 0.14 : 0.08}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: packetCount }, (_, index) => (
        <mesh
          key={index}
          ref={(packet) => {
            packetRefs.current[index] = packet;
          }}
          position={[0, 0.018, index % 2 === 0 ? -0.55 : 0.55]}
        >
          <boxGeometry args={[1.4, 0.025, 0.13]} />
          <meshBasicMaterial
            color={index % 2 ? packetA : packetB}
            transparent
            opacity={0.34}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function StreetLights({ grid, timeMode }: InfrastructureProps) {
  return (
    <group>
      {grid.streetXs.flatMap((x) =>
        grid.streetZs.map((z) => (
          <group key={`lamp-${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.05, 0.05, 1.6, 5]} />
              <meshLambertMaterial color={0x2a2f3d} />
            </mesh>
            <mesh position={[0, 1.6, 0]}>
              <sphereGeometry args={[0.11, 6, 5]} />
              <meshBasicMaterial color={timeMode === 'night' ? 0xffe0a8 : 0x8b9096} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

function TreeRing({ grid, timeMode }: InfrastructureProps) {
  const trees = useMemo(() => createTreeRingSpecs(grid.half), [grid.half]);

  return (
    <group>
      {trees.map((tree) => (
        <group
          key={tree.key}
          position={[tree.x, tree.height, tree.z]}
          rotation={[0, tree.rotation, 0]}
          scale={[tree.scale, tree.scale, tree.scale]}
        >
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.22, 1.2, 5]} />
            <meshLambertMaterial color={0x4a3624} />
          </mesh>
          <mesh position={[0, tree.cone ? 1.9 : 1.6, 0]} castShadow receiveShadow>
            {tree.cone ? (
              <coneGeometry args={[0.9, 2.2, 6]} />
            ) : (
              <icosahedronGeometry args={[1, 0]} />
            )}
            <meshLambertMaterial color={foliageColor(tree.materialIndex, timeMode)} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MountainRing({ timeMode }: { timeMode: LiveCityTimeMode }) {
  const mountains = useMemo(() => {
    const rng = createSeededRng(91_204);
    const ringRadius = 600;
    const peakCount = 90;
    return Array.from({ length: peakCount }, (_, index) => {
      const angle = (index / peakCount) * Math.PI * 2 + rng() * 0.04;
      const radius = ringRadius + rng() * 80;
      return {
        key: `mountain-${index}`,
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        height: 30 + rng() * 70,
        width: 60 + rng() * 60,
        rotation: rng() * Math.PI,
      };
    });
  }, []);

  return (
    <group>
      {mountains.map((mountain) => (
        <mesh
          key={mountain.key}
          position={[mountain.x, mountain.height / 2 - 5, mountain.z]}
          rotation={[0, mountain.rotation, 0]}
          receiveShadow
        >
          <coneGeometry args={[mountain.width, mountain.height, 4]} />
          <meshLambertMaterial color={timeMode === 'day' ? 0x8ea2c5 : 0x202840} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function foliageColor(index: number, timeMode: LiveCityTimeMode): number {
  const day = [0x4f8a46, 0x62a152, 0x88ad45];
  const night = [0x2f5630, 0x3d6739, 0x566f32];
  return (timeMode === 'day' ? day : night)[index] ?? 0x62a152;
}
