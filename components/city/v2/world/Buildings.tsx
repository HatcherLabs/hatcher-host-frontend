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
import { useCityBuildings } from './useCityAssets';

interface Props {
  agents: CityAgent[];
}

/**
 * One InstancedMesh per base building mesh. Agents are bucketed by the
 * base their layout math assigns, so a 2000-agent city renders in ~8
 * draw calls instead of 2000.
 *
 * Per-instance:
 *   - position / rotation / scale via Matrix4
 *   - framework tint via instanceColor attribute
 */
export function Buildings({ agents }: Props) {
  const meshes = useCityBuildings();
  const layouts = useMemo(() => layoutBuildingsV2(agents), [agents]);

  const buckets = useMemo(() => {
    const b = {} as Record<BuildingBase, BuildingLayout[]>;
    for (const base of BUILDING_BASES) b[base] = [];
    for (const l of layouts) b[l.base].push(l);
    return b;
  }, [layouts]);

  return (
    <group>
      {BUILDING_BASES.map((base) => {
        const mesh = meshes[base];
        const list = buckets[base];
        if (!mesh || list.length === 0) return null;
        return <BuildingsInstance key={base} source={mesh} layouts={list} />;
      })}
    </group>
  );
}

function BuildingsInstance({
  source,
  layouts,
}: {
  source: THREE.Mesh;
  layouts: BuildingLayout[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = layouts.length;

  // Clone the source material once so we don't mutate the cached GLB.
  const material = useMemo(() => {
    if (Array.isArray(source.material)) {
      return source.material.map((m) => m.clone()) as THREE.Material[];
    }
    return (source.material as THREE.Material).clone();
  }, [source.material]);

  // Write the instance matrix + color attributes whenever layouts or
  // the ref change. useEffect runs AFTER the ref is attached, which
  // avoids the useMemo-before-ref race.
  useEffect(() => {
    if (!ref.current) return;
    const obj = new THREE.Object3D();
    const color = new THREE.Color();
    layouts.forEach((l, i) => {
      obj.position.set(l.x, 0, l.z);
      obj.rotation.set(0, l.rotation, 0);
      // Quaternius meshes sit at roughly unit height; scale Y to target.
      obj.scale.set(1, l.height / 3, 1);
      obj.updateMatrix();
      ref.current!.setMatrixAt(i, obj.matrix);
      color.setHex(FRAMEWORK_COLORS[l.framework]);
      ref.current!.setColorAt(i, color);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [layouts]);

  return (
    <instancedMesh
      ref={ref}
      args={[source.geometry, material as THREE.Material, count]}
      castShadow
      receiveShadow
    />
  );
}
