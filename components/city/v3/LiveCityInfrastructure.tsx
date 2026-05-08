'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import {
  LIVE_CITY_BLOCKS,
  LIVE_CITY_ROADS,
  type LiveCityBlock,
} from './liveLayout';

const ROAD_COLOR = {
  cyan: '#19d6ff',
  emerald: '#10f0a8',
  amber: '#ffd24a',
} as const;

export function LiveCityInfrastructure() {
  const { cityGridLines, terrainGridLines } = useMemo(() => {
    const cityLines: Array<{
      key: string;
      x: number;
      z: number;
      width: number;
      depth: number;
    }> = [];
    for (let i = -8; i <= 8; i++) {
      cityLines.push({
        key: `x-${i}`,
        x: i * 12,
        z: 8,
        width: 0.08,
        depth: 158,
      });
      cityLines.push({
        key: `z-${i}`,
        x: 0,
        z: i * 12 + 8,
        width: 184,
        depth: 0.08,
      });
    }
    const terrainLines: typeof cityLines = [];
    for (let i = -10; i <= 10; i++) {
      terrainLines.push({
        key: `terrain-x-${i}`,
        x: i * 24,
        z: 8,
        width: 0.1,
        depth: 420,
      });
      terrainLines.push({
        key: `terrain-z-${i}`,
        x: 0,
        z: i * 24 + 8,
        width: 520,
        depth: 0.1,
      });
    }
    return { cityGridLines: cityLines, terrainGridLines: terrainLines };
  }, []);

  return (
    <group>
      <mesh position={[0, -3.45, 8]} receiveShadow>
        <boxGeometry args={[520, 2.1, 430]} />
        <meshStandardMaterial
          color="#030609"
          roughness={0.9}
          metalness={0.08}
          emissive="#020810"
          emissiveIntensity={0.22}
        />
      </mesh>

      {terrainGridLines.map((line) => (
        <mesh
          key={line.key}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[line.x, -2.34, line.z]}
        >
          <planeGeometry args={[line.width, line.depth]} />
          <meshBasicMaterial
            color="#0a6f8a"
            transparent
            opacity={0.13}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      <mesh position={[0, -1.2, 8]} receiveShadow>
        <boxGeometry args={[205, 2.4, 176]} />
        <meshStandardMaterial
          color="#070a12"
          roughness={0.82}
          metalness={0.22}
          emissive="#031220"
          emissiveIntensity={0.28}
        />
      </mesh>

      {cityGridLines.map((line) => (
        <mesh
          key={line.key}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[line.x, 0.012, line.z]}
        >
          <planeGeometry args={[line.width, line.depth]} />
          <meshBasicMaterial
            color="#0b86a8"
            transparent
            opacity={0.26}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {LIVE_CITY_ROADS.map(({ key, ...road }) => (
        <Road key={key} {...road} />
      ))}

      {LIVE_CITY_BLOCKS.map((block) => (
        <CityBlockPad key={block.id} block={block} />
      ))}

      <CoreHub />
      <OuterBeacons />
      <FoundationPiers />
    </group>
  );
}

function Road({
  x,
  z,
  width,
  depth,
  color,
}: {
  x: number;
  z: number;
  width: number;
  depth: number;
  color: keyof typeof ROAD_COLOR;
}) {
  const neon = ROAD_COLOR[color];
  const horizontal = width > depth;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#07131d"
          roughness={0.72}
          metalness={0.18}
          emissive="#031f30"
          emissiveIntensity={0.34}
        />
      </mesh>
      <NeonStrip
        x={x}
        z={z + (horizontal ? depth / 2 - 0.35 : 0)}
        width={horizontal ? width : 0.14}
        depth={horizontal ? 0.14 : depth}
        color={neon}
      />
      <NeonStrip
        x={x + (horizontal ? 0 : width / 2 - 0.35)}
        z={z}
        width={horizontal ? width : 0.14}
        depth={horizontal ? 0.14 : depth}
        color={neon}
      />
      <NeonStrip
        x={x - (horizontal ? 0 : width / 2 - 0.35)}
        z={z - (horizontal ? depth / 2 - 0.35 : 0)}
        width={horizontal ? width : 0.14}
        depth={horizontal ? 0.14 : depth}
        color={neon}
      />
    </group>
  );
}

function NeonStrip({
  x,
  z,
  width,
  depth,
  color,
}: {
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.052, z]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.62}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function CityBlockPad({ block }: { block: LiveCityBlock }) {
  const core = block.accent === 'core';
  const color = core
    ? '#0b1728'
    : block.accent === 'inner'
      ? '#08131f'
      : '#070d16';
  const neon = core
    ? '#3de8ff'
    : block.accent === 'inner'
      ? '#11d6a8'
      : '#5966ff';

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[block.x, 0.075, block.z]}
      >
        <planeGeometry args={[block.padWidth, block.padDepth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.62}
          metalness={0.24}
          emissive={core ? '#092a3a' : '#061521'}
          emissiveIntensity={core ? 0.5 : 0.28}
        />
      </mesh>
      <NeonStrip
        x={block.x}
        z={block.z - block.padDepth / 2}
        width={block.padWidth}
        depth={0.16}
        color={neon}
      />
      <NeonStrip
        x={block.x}
        z={block.z + block.padDepth / 2}
        width={block.padWidth}
        depth={0.16}
        color={neon}
      />
      <NeonStrip
        x={block.x - block.padWidth / 2}
        z={block.z}
        width={0.16}
        depth={block.padDepth}
        color={neon}
      />
      <NeonStrip
        x={block.x + block.padWidth / 2}
        z={block.z}
        width={0.16}
        depth={block.padDepth}
        color={neon}
      />
    </group>
  );
}

function CoreHub() {
  return (
    <group position={[0, 0, -2]}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[9, 11.5, 0.8, 6]} />
        <meshStandardMaterial
          color="#081526"
          roughness={0.42}
          metalness={0.5}
          emissive="#08384d"
          emissiveIntensity={0.7}
        />
      </mesh>
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[1.2, 2.4, 16, 6]} />
        <meshStandardMaterial
          color="#0e2235"
          roughness={0.38}
          metalness={0.48}
          emissive="#12d6ff"
          emissiveIntensity={0.65}
        />
      </mesh>
      <mesh position={[0, 18.5, 0]}>
        <octahedronGeometry args={[2.8, 0]} />
        <meshBasicMaterial
          color="#2ff6ff"
          transparent
          opacity={0.86}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[12, 12.45, 72]} />
        <meshBasicMaterial
          color="#2ff6ff"
          transparent
          opacity={0.56}
          depthWrite={false}
          toneMapped={false}
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
          <mesh position={[0, y / 2, 0]}>
            <boxGeometry args={[1.2, y, 1.2]} />
            <meshStandardMaterial
              color="#0b1724"
              roughness={0.52}
              metalness={0.38}
              emissive={index % 2 ? '#0bd9a5' : '#0aa6e8'}
              emissiveIntensity={0.55}
            />
          </mesh>
          <mesh position={[0, y + 1.8, 0]}>
            <sphereGeometry args={[1.15, 12, 8]} />
            <meshBasicMaterial
              color={index % 2 ? '#10f0a8' : '#2fd3ff'}
              transparent
              opacity={0.8}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FoundationPiers() {
  const piers = [
    [-96, -75],
    [-48, -75],
    [0, -75],
    [48, -75],
    [96, -75],
    [-96, 91],
    [-48, 91],
    [0, 91],
    [48, 91],
    [96, 91],
    [-96, -32],
    [-96, 32],
    [96, -32],
    [96, 32],
  ] as const;

  return (
    <group>
      {piers.map(([x, z], index) => (
        <group key={`${x}-${z}`} position={[x, -4.6, z]}>
          <mesh>
            <boxGeometry args={[2.4, 4.2, 2.4]} />
            <meshStandardMaterial
              color="#09111b"
              roughness={0.58}
              metalness={0.36}
              emissive={index % 2 ? '#063a3e' : '#052948'}
              emissiveIntensity={0.42}
            />
          </mesh>
          <mesh position={[0, 2.25, 0]}>
            <boxGeometry args={[3.1, 0.18, 3.1]} />
            <meshBasicMaterial
              color={index % 2 ? '#10f0a8' : '#19d6ff'}
              transparent
              opacity={0.42}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
