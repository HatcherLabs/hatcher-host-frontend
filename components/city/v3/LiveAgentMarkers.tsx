'use client';
import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { liveAgentColor, liveAgentGlowColor } from './LiveCityColors';
import type { LiveAgentMarkerLayout } from './liveLayout';

interface Props {
  markers: LiveAgentMarkerLayout[];
  onMarkerClick?: (agentId: string) => void;
}

export function LiveAgentMarkers({ markers, onMarkerClick }: Props) {
  const buckets = useMemo(() => {
    const out = new Map<
      string,
      {
        color: number;
        glowColor: number;
        markers: LiveAgentMarkerLayout[];
      }
    >();

    for (const marker of markers) {
      const color = liveAgentColor(marker);
      const glowColor = liveAgentGlowColor(marker);
      const key = `${color}:${glowColor}`;
      const bucket = out.get(key) ?? { color, glowColor, markers: [] };
      bucket.markers.push(marker);
      out.set(key, bucket);
    }

    return [...out.entries()];
  }, [markers]);

  if (markers.length === 0) return null;

  return (
    <group>
      {buckets.map(([key, bucket]) => (
        <LiveAgentMarkerBucket
          key={key}
          color={bucket.color}
          glowColor={bucket.glowColor}
          markers={bucket.markers}
          onMarkerClick={onMarkerClick}
        />
      ))}
    </group>
  );
}

function LiveAgentMarkerBucket({
  markers,
  color,
  glowColor,
  onMarkerClick,
}: {
  markers: LiveAgentMarkerLayout[];
  color: number;
  glowColor: number;
  onMarkerClick?: (agentId: string) => void;
}) {
  const towerRef = useRef<THREE.InstancedMesh>(null);
  const capRef = useRef<THREE.InstancedMesh>(null);
  const obj = useMemo(() => new THREE.Object3D(), []);

  const writeMatrices = useCallback(
    (elapsed: number) => {
      if (!towerRef.current || !capRef.current) return;

      markers.forEach((marker, index) => {
        const phase = (marker.rank % 10_000) * 0.001 + index * 0.53;
        const speed = 0.2 + (marker.rank % 9) * 0.008;
        const radius = 0.95 + marker.tier * 0.14 + marker.width * 0.42;
        const walkX = marker.x + Math.cos(elapsed * speed + phase) * radius;
        const walkZ =
          marker.z + Math.sin(elapsed * speed * 0.82 + phase * 1.31) * radius;
        const bob = Math.sin(elapsed * speed * 5 + phase) * 0.08;

        obj.rotation.set(0, elapsed * speed + phase, 0);
        obj.position.set(walkX, marker.height / 2 + 0.06 + bob, walkZ);
        obj.scale.set(marker.width, marker.height, marker.width);
        obj.updateMatrix();
        towerRef.current!.setMatrixAt(index, obj.matrix);

        obj.rotation.set(0, 0, 0);
        obj.position.set(walkX, marker.height + 0.34 + bob, walkZ);
        obj.scale.set(
          marker.width * 0.42,
          marker.width * 0.42,
          marker.width * 0.42,
        );
        obj.updateMatrix();
        capRef.current!.setMatrixAt(index, obj.matrix);
      });

      towerRef.current.instanceMatrix.needsUpdate = true;
      capRef.current.instanceMatrix.needsUpdate = true;
    },
    [markers, obj],
  );

  useEffect(() => {
    writeMatrices(0);
  }, [writeMatrices]);

  useFrame(({ clock }) => {
    writeMatrices(clock.elapsedTime);
  });

  const click = (event: {
    instanceId?: number;
    stopPropagation: () => void;
  }) => {
    if (!onMarkerClick || event.instanceId == null) return;
    const marker = markers[event.instanceId];
    if (!marker) return;
    event.stopPropagation();
    onMarkerClick(marker.agentId);
  };

  return (
    <group>
      <instancedMesh
        key={`agent-marker-towers-${markers.length}`}
        ref={towerRef}
        args={[undefined, undefined, markers.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
        onClick={click}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        key={`agent-marker-caps-${markers.length}`}
        ref={capRef}
        args={[undefined, undefined, markers.length]}
        frustumCulled={false}
        onClick={click}
      >
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.86}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
