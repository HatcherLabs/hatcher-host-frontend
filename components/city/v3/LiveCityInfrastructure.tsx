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
        value: new THREE.Color(timeMode === 'day' ? 0x82b5df : 0x070d20),
      },
      uBottom: {
        value: new THREE.Color(timeMode === 'day' ? 0xd8eadb : 0x1a2548),
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
    const grass = new THREE.Color(timeMode === 'day' ? 0x6f966c : 0x1e2a30);
    const grass2 = new THREE.Color(timeMode === 'day' ? 0x96b878 : 0x293741);
    const dirt = new THREE.Color(timeMode === 'day' ? 0x8d8a73 : 0x373532);
    const rock = new THREE.Color(timeMode === 'day' ? 0x7c9090 : 0x303944);

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
        <group key={road.key} position={[road.x, 0, road.z]}>
          <mesh position={[0, 0, 0]} receiveShadow>
            <boxGeometry args={[road.width, 0.04, road.depth]} />
            <meshLambertMaterial color={0x20282a} />
          </mesh>
          <mesh position={[0, 0.025, 0]} receiveShadow>
            <boxGeometry
              args={[
                road.kind === 'vertical' ? road.width * 0.74 : road.width,
                0.035,
                road.kind === 'horizontal' ? road.depth * 0.74 : road.depth,
              ]}
            />
            <meshLambertMaterial color={0x293434} />
          </mesh>
          <mesh position={[0, 0.054, 0]}>
            <boxGeometry
              args={[
                road.kind === 'vertical' ? 0.08 : road.width,
                0.018,
                road.kind === 'horizontal' ? 0.08 : road.depth,
              ]}
            />
            <meshBasicMaterial
              color={0xbdd6cf}
              transparent
              opacity={0.2}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <RoadCurbs road={road} />
        </group>
      ))}
      <IntersectionNodes grid={grid} />
      <CrosswalkNodes grid={grid} />
      {stripeMarks.map((mark) => (
            <mesh key={mark.key} position={[mark.x, 0.001, mark.z]}>
              <boxGeometry args={[mark.width, 0.045, mark.depth]} />
              <meshBasicMaterial
                color={0x9fb1aa}
                transparent
                opacity={0.12}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
      ))}
    </group>
  );
}

function CrosswalkNodes({ grid }: GridProps) {
  const stripeLength = LIVE_CITY_GUTTER * 0.48;
  const laneOffset = LIVE_CITY_GUTTER * 0.74;
  return (
    <group>
      {grid.nodes.map((node) => (
        <group key={`crosswalk-${node.id}`} position={[node.x, 0.135, node.z]}>
          {[-1, 1].map((side) => (
            <group key={`z-${side}`} position={[0, 0, side * laneOffset]}>
              {[-0.18, 0.18].map((x, index) => (
                <mesh key={index} position={[x, 0, 0]}>
                  <boxGeometry args={[0.055, 0.012, stripeLength]} />
                  <meshBasicMaterial
                    color={0xd9dfda}
                    transparent
                    opacity={0.08}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
              ))}
            </group>
          ))}
          {[-1, 1].map((side) => (
            <group key={`x-${side}`} position={[side * laneOffset, 0, 0]}>
              {[-0.18, 0.18].map((z, index) => (
                <mesh key={index} position={[0, 0, z]}>
                  <boxGeometry args={[stripeLength, 0.012, 0.055]} />
                  <meshBasicMaterial
                    color={0xd9dfda}
                    transparent
                    opacity={0.08}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function RoadCurbs({ road }: { road: { width: number; depth: number; kind: 'vertical' | 'horizontal' } }) {
  const isVertical = road.kind === 'vertical';
  const curbOffset = isVertical ? road.width * 0.45 : road.depth * 0.45;
  const curbLength = isVertical ? road.depth : road.width;
  const curbSize: [number, number, number] = isVertical
    ? [0.08, 0.09, curbLength]
    : [curbLength, 0.09, 0.08];
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={isVertical ? [side * curbOffset, 0.07, 0] : [0, 0.07, side * curbOffset]}
          receiveShadow
        >
          <boxGeometry args={curbSize} />
          <meshLambertMaterial color={0x9da4a7} />
        </mesh>
      ))}
    </group>
  );
}

function IntersectionNodes({ grid }: GridProps) {
  return (
    <group>
      {grid.nodes.map((node) => (
        <group key={node.id} position={[node.x, 0.09, node.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[LIVE_CITY_GUTTER * 0.58, 48]} />
            <meshLambertMaterial color={0x656c70} />
          </mesh>
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[LIVE_CITY_GUTTER * 0.35, LIVE_CITY_GUTTER * 0.42, 56]} />
            <meshBasicMaterial
              color={0xd6b177}
              transparent
              opacity={0.32}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[LIVE_CITY_GUTTER * 0.5, LIVE_CITY_GUTTER * 0.53, 64]} />
            <meshBasicMaterial
              color={0xd5dfd9}
              transparent
              opacity={0.14}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.16, 0.18, 0.12, 16]} />
            <meshLambertMaterial color={0xd8d5cb} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CitySignalBackbone({ grid, timeMode }: InfrastructureProps) {
  const packetRefs = useRef<(THREE.Mesh | null)[]>([]);
  const packetCount = Math.min(18, Math.max(6, grid.Nsb * 3));
  const travelLength = Math.max(20, grid.totalW - LIVE_CITY_GUTTER * 2);
  const glowColor = timeMode === 'night' ? '#9ed5e7' : '#3f7f96';
  const packetA = timeMode === 'night' ? '#9ed5e7' : '#3f7f96';
  const packetB = timeMode === 'night' ? '#d6b177' : '#8a6d45';

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
      material.opacity = 0.18 + Math.sin(t * 3 + index) * 0.08;
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
            opacity={0.2}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function StreetLights({ grid, timeMode }: InfrastructureProps) {
  // Lamps used to sit dead-centre on each intersection node — exactly where the
  // walking agents path through, so they clipped straight through the pole.
  // Tuck each one onto the block corner, clear of the road centerlines.
  const inset = LIVE_CITY_GUTTER / 2 + 0.1;
  return (
    <group>
      {grid.streetXs.flatMap((x, xi) =>
        grid.streetZs.map((z, zi) => {
          // Push toward the inside of the grid so boundary lamps stay on-map.
          const dx = xi < grid.streetXs.length - 1 ? inset : -inset;
          const dz = zi < grid.streetZs.length - 1 ? inset : -inset;
          return (
            <group key={`lamp-${x}-${z}`} position={[x + dx, 0, z + dz]}>
              <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.045, 0.06, 1.5, 8]} />
                <meshLambertMaterial color={0x2a3037} />
              </mesh>
              <mesh position={[0, 1.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.22, 0.018, 8, 24]} />
                <meshBasicMaterial
                  color={timeMode === 'night' ? 0xffe0a8 : 0xd8e5da}
                  transparent
                  opacity={timeMode === 'night' ? 0.72 : 0.46}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[0, 1.54, 0]}>
                <sphereGeometry args={[0.09, 10, 8]} />
                <meshBasicMaterial
                  color={timeMode === 'night' ? 0xffe0a8 : 0xd8e5da}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        }),
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
            <meshLambertMaterial color={0x27323d} />
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
  const day = [0x5f8f58, 0x74a965, 0x8fab60];
  const night = [0x24313a, 0x2f3e46, 0x384653];
  return (timeMode === 'day' ? day : night)[index] ?? 0x74a965;
}
