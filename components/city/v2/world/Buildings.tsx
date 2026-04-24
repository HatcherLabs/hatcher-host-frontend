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
  /** Fires when a building is clicked in the 3D scene. The agent's
   *  id is used by the parent to look up a full CityAgent for the
   *  popup card. */
  onBuildingClick?: (agentId: string) => void;
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
export function Buildings({ agents, onBuildingClick }: Props) {
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
          <BaseInstances
            key={base}
            asset={asset}
            layouts={list}
            onBuildingClick={onBuildingClick}
          />
        );
      })}
    </group>
  );
}

function BaseInstances({
  asset,
  layouts,
  onBuildingClick,
}: {
  asset: BuildingAsset;
  layouts: BuildingLayout[];
  onBuildingClick?: (agentId: string) => void;
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
          onBuildingClick={onBuildingClick}
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
  onBuildingClick,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  layouts: BuildingLayout[];
  nativeHeight: number;
  nativeMinY: number;
  onBuildingClick?: (agentId: string) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = layouts.length;

  // Apply a subtle framework-colored emissive to the cloned material
  // so Bloom picks up the cyber tint without drowning the structural
  // detail. Material names that look like windows get a brighter
  // emissive so they read as lit windows at night without any extra
  // geometry. Only runs once per material; per-instance colour
  // multiplier still comes from instanceColor below.
  useMemo(() => {
    const std = material as THREE.MeshStandardMaterial & {
      emissive?: THREE.Color;
      emissiveIntensity?: number;
      name?: string;
    };
    if ('emissive' in std && std.emissive instanceof THREE.Color) {
      const n = (std.name ?? '').toLowerCase();
      // Tight regex: Quaternius buildings ship with a "Light" material
      // that is beige structural paint, NOT lit windows. Including
      // `light` in the window heuristic lit up three-quarters of the
      // city (see review B1 on commit ff5142a). Windows are
      // consistently named `Windows` or `Glass`.
      const looksLikeWindow = /window|glass|neon|emissive/.test(n);
      if (looksLikeWindow) {
        std.emissive.set(0xfff4c8);
        std.emissiveIntensity = 1.6;
      } else {
        std.emissive.set(0x223355);
        std.emissiveIntensity = 0.25;
      }
      std.needsUpdate = true;
    }
  }, [material]);

  useEffect(() => {
    if (!ref.current) return;
    const obj = new THREE.Object3D();
    const color = new THREE.Color();
    const goldHex = 0xffd24a;
    layouts.forEach((l, i) => {
      const scaleY = l.height / nativeHeight;
      obj.position.set(l.x, -nativeMinY * scaleY, l.z);
      obj.rotation.set(0, l.rotation, 0);
      obj.scale.set(1, scaleY, 1);
      obj.updateMatrix();
      ref.current!.setMatrixAt(i, obj.matrix);
      // "mine" agents get a warm gold tint so the owner can spot their
      // agents at a glance without having to click through the whole
      // district. Normal agents keep the framework colour.
      color.setHex(l.mine ? goldHex : FRAMEWORK_COLORS[l.framework]);
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
      // InstancedMesh derives its bounding sphere from the TEMPLATE
      // geometry, not from actual instance positions. With buildings
      // scattered over a 500+u world from a template sitting at the
      // origin, the camera's frustum test wrongly culls the whole
      // mesh as soon as the viewer walks ~100u away from the template
      // — the effect the user sees is "buildings disappear mid-walk".
      // ~64 InstancedMesh × 700 instances is cheap enough to draw
      // unconditionally; skip frustum culling.
      frustumCulled={false}
      onClick={(e) => {
        if (!onBuildingClick) return;
        const id = e.instanceId;
        if (id == null) return;
        const layout = layouts[id];
        if (!layout) return;
        e.stopPropagation();
        onBuildingClick(layout.agentId);
      }}
    />
  );
}
