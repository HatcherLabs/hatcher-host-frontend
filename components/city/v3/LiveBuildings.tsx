'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FRAMEWORK_COLORS } from '@/components/city/types';
import {
  useCityBuildings,
  type BuildingAsset,
} from '@/components/city/v2/world/useCityAssets';
import type { BuildingBase } from '@/components/city/v2/world/Buildings.layout';
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

  const clonedMaterial = useMemo(() => {
    const cloneOne = (mat: THREE.Material) => {
      const cloned = mat.clone() as THREE.MeshStandardMaterial;
      if ('vertexColors' in cloned) cloned.vertexColors = true;
      if (cloned.emissive instanceof THREE.Color) {
        cloned.emissive.set(0x102033);
        cloned.emissiveIntensity = 0.55;
      }
      cloned.needsUpdate = true;
      return cloned;
    };
    return Array.isArray(material) ? material.map(cloneOne) : cloneOne(material);
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
      color.setHex(layout.mine ? 0xffd24a : FRAMEWORK_COLORS[layout.framework]);
      if (layout.status === 'crashed') color.setHex(0xfb7185);
      ref.current!.setColorAt(index, color);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [layouts, nativeHeight, nativeMinY]);

  useEffect(() => {
    return () => {
      const materials = Array.isArray(clonedMaterial) ? clonedMaterial : [clonedMaterial];
      for (const mat of materials) mat.dispose();
    };
  }, [clonedMaterial]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, clonedMaterial, layouts.length]}
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

export function statusEmissiveFor(status: LiveBuildingLayout['status']) {
  return STATUS_EMISSIVE[status];
}
