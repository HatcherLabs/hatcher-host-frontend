'use client';
import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import {
  DISTRICT_COLS,
  DISTRICT_ROWS,
  DISTRICT_STEP,
  DISTRICT_GAP,
} from './grid';

const STREET_Y = 0.02;
const LANE_WIDTH = DISTRICT_GAP - 2;

/**
 * Horizontal + vertical street grid between district pads. Each street
 * is a textured `PlaneGeometry` strip running the full map width or
 * height, so the whole grid renders in 2 extra draw calls on top of
 * the ground. Sidewalks are thin concrete strips flanking horizontal
 * lanes.
 */
export function Streets() {
  const [asphaltDiffBase, asphaltNormBase, asphaltRoughBase, concreteDiffBase] =
    useTexture([
      '/assets/3d/textures/asphalt_diff.jpg',
      '/assets/3d/textures/asphalt_norm.jpg',
      '/assets/3d/textures/asphalt_rough.jpg',
      '/assets/3d/textures/concrete_diff.jpg',
    ]);

  const step = DISTRICT_STEP;
  const totalRows = DISTRICT_ROWS;
  const longEdge = Math.max(DISTRICT_COLS, totalRows) * step + 20;
  const neonMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x5df7ff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  // Clone shared textures before mutating repeat/wrap — Ground uses
  // the same asphalt cache with a different repeat, and mutating the
  // shared instance would leak config between the two.
  const { asphaltDiff, asphaltNorm, asphaltRough, concreteDiff } = useMemo(() => {
    const ad = asphaltDiffBase.clone();
    const an = asphaltNormBase.clone();
    const ar = asphaltRoughBase.clone();
    const cd = concreteDiffBase.clone();
    for (const t of [ad, an, ar]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(longEdge / 8, 1);
      t.needsUpdate = true;
    }
    ad.colorSpace = THREE.SRGBColorSpace;
    cd.wrapS = cd.wrapT = THREE.RepeatWrapping;
    cd.repeat.set(longEdge / 4, 1);
    cd.colorSpace = THREE.SRGBColorSpace;
    cd.needsUpdate = true;
    return { asphaltDiff: ad, asphaltNorm: an, asphaltRough: ar, concreteDiff: cd };
  }, [asphaltDiffBase, asphaltNormBase, asphaltRoughBase, concreteDiffBase, longEdge]);

  // Street centrelines sit at gap-CENTRES between district pads (and
  // at the perimeter, half a step outside the outermost rows/cols).
  // With DISTRICT_COLS=5 and pad centres at (col-2)*step, the gaps
  // sit at (col-1.5)*step → so for a street index r ∈ 0..ROWS, the
  // formula is (r - ROWS/2) * step. The earlier `- DISTRICT_GAP/2`
  // term was a thinko that shifted every street by half a gap, which
  // made each pad appear offset by +8 in x and +8 in z (visible as a
  // black band on the top + left of every district pad).
  const horizontal = useMemo(() => {
    const zs: number[] = [];
    for (let r = 0; r <= totalRows; r++) {
      zs.push((r - totalRows / 2) * step);
    }
    return zs;
  }, [totalRows, step]);

  const vertical = useMemo(() => {
    const xs: number[] = [];
    for (let c = 0; c <= DISTRICT_COLS; c++) {
      xs.push((c - DISTRICT_COLS / 2) * step);
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
      {horizontal.map((z, i) => (
        <group key={`hneon-${i}`}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, STREET_Y + 0.11, z + side * 2.95]}
              material={neonMat}
            >
              <planeGeometry args={[longEdge, 0.1]} />
            </mesh>
          ))}
        </group>
      ))}
      {vertical.map((x, i) => (
        <group key={`vneon-${i}`}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[x + side * 2.95, STREET_Y + 0.12, 0]}
              material={neonMat}
            >
              <planeGeometry args={[0.1, longEdge]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
