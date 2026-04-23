'use client';
import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { CATEGORIES } from '@/components/city/types';

// Must match Buildings.layout.ts constants
const DISTRICT_COLS = 5;
const DISTRICT_SIZE = 52;
const DISTRICT_GAP = 14;
const STREET_Y = 0.02; // above ground to avoid z-fighting
const LANE_WIDTH = DISTRICT_GAP - 2;

/**
 * Horizontal + vertical street grid between district pads. Each street
 * is a textured `PlaneGeometry` strip running the full map width or
 * height, so the whole grid renders in 2 extra draw calls on top of
 * the ground. Sidewalks are thin concrete strips flanking horizontal
 * lanes.
 */
export function Streets() {
  const [asphaltDiff, asphaltNorm, asphaltRough, concreteDiff] = useTexture([
    '/assets/3d/textures/asphalt_diff.jpg',
    '/assets/3d/textures/asphalt_norm.jpg',
    '/assets/3d/textures/asphalt_rough.jpg',
    '/assets/3d/textures/concrete_diff.jpg',
  ]);

  const step = DISTRICT_SIZE + DISTRICT_GAP;
  const totalRows = Math.ceil(CATEGORIES.length / DISTRICT_COLS);
  const longEdge = Math.max(DISTRICT_COLS, totalRows) * step + 20;

  useMemo(() => {
    for (const t of [asphaltDiff, asphaltNorm, asphaltRough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(longEdge / 8, 1);
    }
    asphaltDiff.colorSpace = THREE.SRGBColorSpace;
    concreteDiff.wrapS = concreteDiff.wrapT = THREE.RepeatWrapping;
    concreteDiff.repeat.set(longEdge / 4, 1);
    concreteDiff.colorSpace = THREE.SRGBColorSpace;
  }, [asphaltDiff, asphaltNorm, asphaltRough, concreteDiff, longEdge]);

  const horizontal = useMemo(() => {
    const zs: number[] = [];
    for (let r = 0; r <= totalRows; r++) {
      zs.push((r - totalRows / 2) * step - DISTRICT_GAP / 2);
    }
    return zs;
  }, [totalRows, step]);

  const vertical = useMemo(() => {
    const xs: number[] = [];
    for (let c = 0; c <= DISTRICT_COLS; c++) {
      xs.push((c - DISTRICT_COLS / 2) * step - DISTRICT_GAP / 2);
    }
    return xs;
  }, [step]);

  return (
    <group>
      {horizontal.map((z, i) => (
        <mesh
          key={`h-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, STREET_Y, z]}
          receiveShadow
        >
          <planeGeometry args={[longEdge, LANE_WIDTH]} />
          <meshStandardMaterial
            map={asphaltDiff}
            normalMap={asphaltNorm}
            roughnessMap={asphaltRough}
            roughness={0.9}
          />
        </mesh>
      ))}
      {vertical.map((x, i) => (
        <mesh
          key={`v-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, STREET_Y, 0]}
          receiveShadow
        >
          <planeGeometry args={[LANE_WIDTH, longEdge]} />
          <meshStandardMaterial
            map={asphaltDiff}
            normalMap={asphaltNorm}
            roughnessMap={asphaltRough}
            roughness={0.9}
          />
        </mesh>
      ))}
      {/* Thin concrete strips flanking horizontal lanes as sidewalks */}
      {horizontal.map((z, i) => (
        <mesh
          key={`hs-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, STREET_Y + 0.08, z]}
          receiveShadow
        >
          <planeGeometry args={[longEdge, 1.5]} />
          <meshStandardMaterial map={concreteDiff} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}
