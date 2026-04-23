'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityAgent } from '@/components/city/types';
import { FRAMEWORK_COLORS } from '@/components/city/types';
import {
  layoutBuildingsV2,
  BUILDING_BASES,
  type BuildingBase,
  type BuildingLayout,
} from './Buildings.layout';
import { useCityBuildings, type BuildingAsset } from './useCityAssets';

interface Props {
  agents: CityAgent[];
}

/**
 * One `InstancedMesh` per (base, primitive) pair. Quaternius buildings
 * ship with 6-9 primitives per base (one material each), so an 8-base
 * inventory yields ~72 InstancedMeshes — still ~100× cheaper than
 * rendering each agent as its own mesh group.
 *
 * Per instance:
 *   - matrix4 (position, rotation, scale) driven by `Buildings.layout`
 *   - framework tint via `instanceColor` (multiplied by the base
 *     material in-shader, which keeps structural detail like window
 *     frames visible through the tint)
 */
export function Buildings({ agents }: Props) {
  const assets = useCityBuildings();

  // Stable hash of agent identity + visual-relevant fields. Avoids
  // re-laying-out when CityClient's 20s poll returns byte-identical
  // data (which still creates a fresh array reference).
  const layoutKey = useMemo(
    () =>
      agents
        .map((a) => `${a.id}:${a.framework}:${a.category}:${a.tier}`)
        .join('|'),
    [agents],
  );
  const layouts = useMemo(() => layoutBuildingsV2(agents), [layoutKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const buckets = useMemo(() => {
    const b = {} as Record<BuildingBase, BuildingLayout[]>;
    for (const base of BUILDING_BASES) b[base] = [];
    for (const l of layouts) b[l.base].push(l);
    return b;
  }, [layouts]);

  return (
    <group>
      {BUILDING_BASES.map((base) => {
        const asset = assets[base];
        const list = buckets[base];
        if (!asset || list.length === 0) return null;
        return (
          <BaseInstances key={base} asset={asset} layouts={list} />
        );
      })}
    </group>
  );
}

function BaseInstances({
  asset,
  layouts,
}: {
  asset: BuildingAsset;
  layouts: BuildingLayout[];
}) {
  return (
    <group>
      {asset.primitives.map((prim, i) => (
        <PrimitiveInstance
          key={i}
          geometry={prim.geometry}
          material={prim.material}
          layouts={layouts}
          nativeHeight={asset.nativeHeight}
          nativeMinY={asset.minY}
        />
      ))}
    </group>
  );
}

function PrimitiveInstance({
  geometry,
  material,
  layouts,
  nativeHeight,
  nativeMinY,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  layouts: BuildingLayout[];
  nativeHeight: number;
  nativeMinY: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = layouts.length;

  useEffect(() => {
    if (!ref.current) return;
    const obj = new THREE.Object3D();
    const color = new THREE.Color();
    layouts.forEach((l, i) => {
      const scaleY = l.height / nativeHeight;
      // Shift up by -minY*scaleY so the foundation sits on the ground
      // plane regardless of where the source mesh's origin is.
      obj.position.set(l.x, -nativeMinY * scaleY, l.z);
      obj.rotation.set(0, l.rotation, 0);
      obj.scale.set(1, scaleY, 1);
      obj.updateMatrix();
      ref.current!.setMatrixAt(i, obj.matrix);
      color.setHex(FRAMEWORK_COLORS[l.framework]);
      ref.current!.setColorAt(i, color);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [layouts, nativeHeight, nativeMinY]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, count]}
      castShadow
      receiveShadow
    />
  );
}
