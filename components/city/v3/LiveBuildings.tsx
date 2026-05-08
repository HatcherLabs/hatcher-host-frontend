'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  useCityBuildings,
  type BuildingAsset,
} from '@/components/city/v2/world/useCityAssets';
import type { BuildingBase } from '@/components/city/v2/world/Buildings.layout';
import { liveAgentColor } from './LiveCityColors';
import type { LiveBuildingLayout } from './liveLayout';

interface Props {
  buildings: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}

export function LiveBuildings({ buildings, onBuildingClick }: Props) {
  const assets = useCityBuildings();
  const buckets = useMemo(() => {
    const out = new Map<
      string,
      { base: BuildingBase; color: number; layouts: LiveBuildingLayout[] }
    >();
    for (const building of buildings) {
      const color = liveAgentColor(building);
      const key = `${building.base}:${color}`;
      const bucket = out.get(key) ?? {
        base: building.base,
        color,
        layouts: [],
      };
      bucket.layouts.push(building);
      out.set(key, bucket);
    }
    return [...out.values()];
  }, [buildings]);

  return (
    <group>
      {buckets.map((bucket) => {
        const asset = assets[bucket.base];
        if (!asset || bucket.layouts.length === 0) return null;
        return (
          <LiveBaseInstances
            key={`${bucket.base}-${bucket.color}`}
            asset={asset}
            color={bucket.color}
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
  asset,
  color,
  layouts,
  onBuildingClick,
}: {
  asset: BuildingAsset;
  color: number;
  layouts: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}) {
  return (
    <group>
      {asset.primitives.map((primitive, index) => (
        <LivePrimitiveInstances
          key={index}
          geometry={primitive.geometry}
          material={primitive.material}
          nativeHeight={asset.nativeHeight}
          nativeMinY={asset.minY}
          color={color}
          layouts={layouts}
          onBuildingClick={onBuildingClick}
        />
      ))}
    </group>
  );
}

function LivePrimitiveInstances({
  geometry,
  material,
  nativeHeight,
  nativeMinY,
  color,
  layouts,
  onBuildingClick,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  nativeHeight: number;
  nativeMinY: number;
  color: number;
  layouts: LiveBuildingLayout[];
  onBuildingClick?: (building: LiveBuildingLayout) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const instanceGeometry = useMemo(() => {
    const cloned = geometry.clone();
    cloned.deleteAttribute('color');
    return cloned;
  }, [geometry]);

  const clonedMaterial = useMemo(() => {
    const cloneOne = () => {
      const cloned = new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
      });
      cloned.needsUpdate = true;
      return cloned;
    };
    return Array.isArray(material) ? material.map(cloneOne) : cloneOne();
  }, [color, material]);

  useEffect(() => {
    if (!ref.current) return;
    const obj = new THREE.Object3D();
    layouts.forEach((layout, index) => {
      const scaleY = layout.height / nativeHeight;
      obj.position.set(layout.x, -nativeMinY * scaleY, layout.z);
      obj.rotation.set(0, layout.rotation, 0);
      obj.scale.set(layout.mine ? 1.08 : 1, scaleY, layout.mine ? 1.08 : 1);
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
        2.9 +
        Math.min(2.2, building.tier * 0.36) +
        Math.min(1.8, Math.log2(building.agentCount + 1) * 0.3);
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
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  );
}
