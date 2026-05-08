'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  useCityBuildings,
  type BuildingAsset,
} from '@/components/city/v2/world/useCityAssets';
import type { BuildingBase } from '@/components/city/v2/world/Buildings.layout';
import type { LiveBuildingLayout } from './liveLayout';

interface Props {
  buildings: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}

export function LiveBuildings({ buildings, onBuildingClick }: Props) {
  const assets = useCityBuildings();
  const buckets = useMemo(() => {
    const out = new Map<BuildingBase, LiveBuildingLayout[]>();
    for (const building of buildings) {
      const bucket = out.get(building.base) ?? [];
      bucket.push(building);
      out.set(building.base, bucket);
    }
    return [...out.entries()].map(([base, layouts]) => ({ base, layouts }));
  }, [buildings]);

  return (
    <group>
      {buckets.map((bucket) => {
        const asset = assets[bucket.base];
        if (!asset || bucket.layouts.length === 0) return null;
        return (
          <LiveBaseInstances
            key={bucket.base}
            base={bucket.base}
            asset={asset}
            layouts={bucket.layouts}
            onBuildingClick={onBuildingClick}
          />
        );
      })}
      <LiveBuildingClickTargets
        buildings={buildings}
        onBuildingClick={onBuildingClick}
      />
    </group>
  );
}

function LiveBaseInstances({
  base,
  asset,
  layouts,
  onBuildingClick,
}: {
  base: BuildingBase;
  asset: BuildingAsset;
  layouts: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}) {
  return (
    <group>
      <LiveBuildingPodiums
        layouts={layouts}
        onBuildingClick={onBuildingClick}
      />
      {asset.primitives.map((primitive, index) => (
        <LivePrimitiveInstances
          key={index}
          base={base}
          geometry={primitive.geometry}
          material={primitive.material}
          nativeHeight={asset.nativeHeight}
          nativeMinY={asset.minY}
          layouts={layouts}
          onBuildingClick={onBuildingClick}
        />
      ))}
    </group>
  );
}

function LivePrimitiveInstances({
  base,
  geometry,
  material,
  nativeHeight,
  nativeMinY,
  layouts,
  onBuildingClick,
}: {
  base: BuildingBase;
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  nativeHeight: number;
  nativeMinY: number;
  layouts: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const instanceGeometry = useMemo(() => geometry.clone(), [geometry]);

  const clonedMaterial = useMemo(() => {
    return Array.isArray(material)
      ? material.map((source) => normalizeBuildingMaterial(source, base))
      : normalizeBuildingMaterial(material, base);
  }, [base, material]);

  useEffect(() => {
    if (!ref.current) return;
    const obj = new THREE.Object3D();
    layouts.forEach((layout, index) => {
      const scaleY = layout.height / nativeHeight;
      obj.position.set(layout.x, -nativeMinY * scaleY, layout.z);
      obj.rotation.set(0, layout.rotation, 0);
      const footprintScale =
        1.34 +
        Math.min(0.58, layout.tier * 0.14) +
        Math.min(0.28, Math.log2(layout.agentCount + 1) * 0.08);
      obj.scale.set(footprintScale, scaleY, footprintScale);
      obj.updateMatrix();
      ref.current!.setMatrixAt(index, obj.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [layouts, nativeHeight, nativeMinY]);

  useEffect(() => {
    return () => {
      const materials = Array.isArray(clonedMaterial)
        ? clonedMaterial
        : [clonedMaterial];
      for (const mat of materials) mat.dispose();
    };
  }, [clonedMaterial]);

  useEffect(() => {
    return () => {
      instanceGeometry.dispose();
    };
  }, [instanceGeometry]);

  const handleBuildingPointer = (event: {
    instanceId?: number;
    stopPropagation: () => void;
  }) => {
    if (!onBuildingClick || event.instanceId == null) return;
    const layout = layouts[event.instanceId];
    if (!layout) return;
    event.stopPropagation();
    onBuildingClick(layout);
  };

  return (
    <instancedMesh
      ref={ref}
      args={[instanceGeometry, clonedMaterial, layouts.length]}
      receiveShadow
      castShadow
      frustumCulled={false}
      onClick={handleBuildingPointer}
      onPointerDown={handleBuildingPointer}
    />
  );
}

const BUILDING_MATERIAL_COLORS: Record<BuildingBase, THREE.Color> = {
  'small-building-a': new THREE.Color('#8c9188'),
  'small-building-b': new THREE.Color('#9a927f'),
  'small-building-c': new THREE.Color('#7f8a86'),
  'medium-building-a': new THREE.Color('#7f8789'),
  'medium-building-b': new THREE.Color('#8b8478'),
  'skyscraper-a': new THREE.Color('#7d8b92'),
  'skyscraper-b': new THREE.Color('#8a8d90'),
  'skyscraper-c': new THREE.Color('#74838b'),
};

function normalizeBuildingMaterial(
  source: THREE.Material,
  base: BuildingBase,
): THREE.Material {
  const neutralColor =
    BUILDING_MATERIAL_COLORS[base] ?? new THREE.Color('#858b86');
  const cloned = source.clone();
  cloned.transparent = false;
  cloned.opacity = 1;
  cloned.depthWrite = true;
  cloned.toneMapped = true;

  if (cloned instanceof THREE.MeshStandardMaterial) {
    cloned.color.lerp(neutralColor, 0.68);
    cloned.roughness = Math.max(0.58, cloned.roughness);
    cloned.metalness = Math.min(0.28, cloned.metalness);
    cloned.emissiveIntensity = 0;
  } else if (cloned instanceof THREE.MeshBasicMaterial) {
    const standard = new THREE.MeshStandardMaterial({
      color: cloned.color.clone().lerp(neutralColor, 0.78),
      map: cloned.map,
      roughness: 0.72,
      metalness: 0.08,
    });
    cloned.dispose();
    standard.needsUpdate = true;
    return standard;
  }

  cloned.needsUpdate = true;
  return cloned;
}

function LiveBuildingPodiums({
  layouts,
  onBuildingClick,
}: {
  layouts: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const obj = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!ref.current) return;

    layouts.forEach((layout, index) => {
      const footprint =
        3.6 +
        Math.min(2.6, layout.tier * 0.48) +
        Math.min(1.8, Math.log2(layout.agentCount + 1) * 0.28);
      obj.position.set(layout.x, 0.16, layout.z);
      obj.rotation.set(0, layout.rotation, 0);
      obj.scale.set(footprint, 0.32, footprint);
      obj.updateMatrix();
      ref.current!.setMatrixAt(index, obj.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [layouts, obj]);

  const handlePointer = (event: {
    instanceId?: number;
    stopPropagation: () => void;
  }) => {
    if (!onBuildingClick || event.instanceId == null) return;
    const building = layouts[event.instanceId];
    if (!building) return;
    event.stopPropagation();
    onBuildingClick(building);
  };

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, layouts.length]}
      receiveShadow
      frustumCulled={false}
      onClick={handlePointer}
      onPointerDown={handlePointer}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#20282b" roughness={0.86} metalness={0.06} />
    </instancedMesh>
  );
}

function LiveBuildingClickTargets({
  buildings,
  onBuildingClick,
}: {
  buildings: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const obj = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!ref.current) return;

    buildings.forEach((building, index) => {
      const footprint =
        5.2 +
        Math.min(3.8, building.tier * 0.78) +
        Math.min(2.8, Math.log2(building.agentCount + 1) * 0.42);
      obj.position.set(
        building.x,
        Math.max(1.6, building.height / 2),
        building.z,
      );
      obj.rotation.set(0, building.rotation, 0);
      obj.scale.set(footprint, Math.max(3.2, building.height), footprint);
      obj.updateMatrix();
      ref.current!.setMatrixAt(index, obj.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [buildings, obj]);

  const handleBuildingPointer = (event: {
    instanceId?: number;
    stopPropagation: () => void;
  }) => {
    if (!onBuildingClick || event.instanceId == null) return;
    const building = buildings[event.instanceId];
    if (!building) return;
    event.stopPropagation();
    onBuildingClick(building);
  };

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, buildings.length]}
      frustumCulled={false}
      onClick={handleBuildingPointer}
      onPointerDown={handleBuildingPointer}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
    </instancedMesh>
  );
}
