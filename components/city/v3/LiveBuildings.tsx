'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  useCityBuildings,
  type BuildingAsset,
} from '@/components/city/v2/world/useCityAssets';
import type { BuildingBase } from '@/components/city/v2/world/Buildings.layout';
import { liveAgentColor } from './LiveCityColors';
import { allKnownBuildingBases, type LiveBuildingLayout } from './liveLayout';

interface Props {
  buildings: LiveBuildingLayout[];
  onBuildingClick?: (agentId: string) => void;
}

const STATUS_EMISSIVE: Record<LiveBuildingLayout['status'], number> = {
  running: 0x34d399,
  sleeping: 0x64748b,
  paused: 0xfbbf24,
  crashed: 0xfb7185,
};

export function LiveBuildings({ buildings, onBuildingClick }: Props) {
  const assets = useCityBuildings();
  const buckets = useMemo(() => {
    const out = {} as Record<BuildingBase, LiveBuildingLayout[]>;
    for (const base of allKnownBuildingBases()) out[base] = [];
    for (const building of buildings) out[building.base].push(building);
    return out;
  }, [buildings]);

  return (
    <group>
      {allKnownBuildingBases().map((base) => {
        const asset = assets[base];
        const bucket = buckets[base];
        if (!asset || bucket.length === 0) return null;
        return (
          <LiveBaseInstances
            key={base}
            asset={asset}
            layouts={bucket}
            onBuildingClick={onBuildingClick}
          />
        );
      })}
      <LiveBuildingColorBands buildings={buildings} />
      <LiveBuildingBeacons buildings={buildings} />
    </group>
  );
}

function LiveBaseInstances({
  asset,
  layouts,
  onBuildingClick,
}: {
  asset: BuildingAsset;
  layouts: LiveBuildingLayout[];
  onBuildingClick?: (agentId: string) => void;
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
  layouts,
  onBuildingClick,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  nativeHeight: number;
  nativeMinY: number;
  layouts: LiveBuildingLayout[];
  onBuildingClick?: (agentId: string) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const instanceGeometry = useMemo(() => {
    const cloned = geometry.clone();
    cloned.deleteAttribute('color');
    return cloned;
  }, [geometry]);

  const clonedMaterial = useMemo(() => {
    const cloneOne = () => {
      const cloned = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x08182a,
        emissiveIntensity: 0.95,
        vertexColors: true,
      });
      cloned.needsUpdate = true;
      return cloned;
    };
    return Array.isArray(material) ? material.map(cloneOne) : cloneOne();
  }, [material]);

  useEffect(() => {
    if (!ref.current) return;
    const obj = new THREE.Object3D();
    const color = new THREE.Color();
    layouts.forEach((layout, index) => {
      const scaleY = layout.height / nativeHeight;
      obj.position.set(layout.x, -nativeMinY * scaleY, layout.z);
      obj.rotation.set(0, layout.rotation, 0);
      obj.scale.set(layout.mine ? 1.08 : 1, scaleY, layout.mine ? 1.08 : 1);
      obj.updateMatrix();
      ref.current!.setMatrixAt(index, obj.matrix);
      color.setHex(liveAgentColor(layout));
      ref.current!.setColorAt(index, color);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    markMaterialsForInstanceColors(ref.current.material);
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

  return (
    <instancedMesh
      ref={ref}
      args={[instanceGeometry, clonedMaterial, layouts.length]}
      receiveShadow
      castShadow
      frustumCulled={false}
      onClick={(event) => {
        if (!onBuildingClick || event.instanceId == null) return;
        const layout = layouts[event.instanceId];
        if (!layout) return;
        event.stopPropagation();
        onBuildingClick(layout.agentId);
      }}
    />
  );
}

function markMaterialsForInstanceColors(
  material: THREE.Material | THREE.Material[],
) {
  const materials = Array.isArray(material) ? material : [material];
  for (const mat of materials) mat.needsUpdate = true;
}

export function statusEmissiveFor(status: LiveBuildingLayout['status']) {
  return STATUS_EMISSIVE[status];
}

function LiveBuildingColorBands({
  buildings,
}: {
  buildings: LiveBuildingLayout[];
}) {
  const buckets = useMemo(() => {
    const grouped = new Map<number, LiveBuildingLayout[]>();
    for (const building of buildings) {
      const color = liveAgentColor(building);
      const bucket = grouped.get(color) ?? [];
      bucket.push(building);
      grouped.set(color, bucket);
    }
    return [...grouped.entries()];
  }, [buildings]);

  return (
    <group>
      {buckets.map(([color, bucket]) => (
        <LiveBuildingColorBandBucket
          key={`building-color-band-${color}`}
          color={color}
          buildings={bucket}
        />
      ))}
    </group>
  );
}

function LiveBuildingColorBandBucket({
  color,
  buildings,
}: {
  color: number;
  buildings: LiveBuildingLayout[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const obj = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!ref.current) return;

    buildings.forEach((building, index) => {
      const forwardX = Math.sin(building.rotation);
      const forwardZ = Math.cos(building.rotation);
      const outward =
        building.tier >= 4 ? 1.72 : building.tier >= 2 ? 1.36 : 1.08;
      const height = Math.min(18, Math.max(3.2, building.height * 0.6));
      const width =
        0.18 +
        building.tier * 0.04 +
        Math.min(0.34, Math.log2(building.agentCount + 1) * 0.05);

      obj.position.set(
        building.x + forwardX * outward,
        height / 2 + 0.18,
        building.z + forwardZ * outward,
      );
      obj.rotation.set(0, building.rotation, 0);
      obj.scale.set(width, height, 0.22);
      obj.updateMatrix();
      ref.current!.setMatrixAt(index, obj.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [buildings, obj]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, buildings.length]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.42}
        roughness={0.5}
        metalness={0.22}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

function LiveBuildingBeacons({
  buildings,
}: {
  buildings: LiveBuildingLayout[];
}) {
  return (
    <group>
      {buildings.map((building) => {
        const color = liveAgentColor(building);
        return (
          <mesh
            key={`${building.agentId}-beacon`}
            position={[
              building.x,
              Math.min(building.height + 0.55, 30),
              building.z,
            ]}
          >
            <boxGeometry
              args={[
                building.mine ? 2.1 : 1.45,
                0.16,
                building.mine ? 2.1 : 1.45,
              ]}
            />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={
                building.status === 'running' || building.mine ? 0.5 : 0.28
              }
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
