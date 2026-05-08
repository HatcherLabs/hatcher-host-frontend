'use client';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { liveAgentColor } from './LiveCityColors';
import type { LiveAgentMarkerLayout } from './liveLayout';

interface Props {
  markers: LiveAgentMarkerLayout[];
  onMarkerClick?: (agentId: string) => void;
}

const TRAIL_POINTS = 18;

export function LiveAgentMarkers({ markers, onMarkerClick }: Props) {
  if (markers.length === 0) return null;

  return (
    <group>
      {markers.map((marker, index) => (
        <LiveRobotAgent
          key={marker.agentId}
          marker={marker}
          index={index}
          onMarkerClick={onMarkerClick}
        />
      ))}
    </group>
  );
}

function LiveRobotAgent({
  marker,
  index,
  onMarkerClick,
}: {
  marker: LiveAgentMarkerLayout;
  index: number;
  onMarkerClick?: (agentId: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const color = liveAgentColor(marker);
  const accent = useMemo(() => new THREE.Color(color), [color]);
  const scale = 1.35 + Math.min(0.52, marker.tier * 0.1 + marker.width * 0.22);
  const phase = (marker.rank % 10_000) * 0.001 + index * 0.61;
  const walkRadius = 2.8 + marker.tier * 0.2 + marker.width * 0.9;
  const speed = 0.18 + (marker.rank % 7) * 0.012;
  const trail = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3),
    );
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: marker.mine ? 0.4 : 0.28,
      depthWrite: false,
      toneMapped: false,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    return line;
  }, [color, marker.mine]);

  useEffect(() => {
    return () => {
      trail.geometry.dispose();
      (trail.material as THREE.Material).dispose();
    };
  }, [trail]);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    const t = elapsed * speed + phase;
    const x =
      marker.x +
      Math.cos(t) * walkRadius +
      Math.sin(t * 0.47 + phase) * 0.72;
    const z =
      marker.z +
      Math.sin(t * 0.82) * walkRadius +
      Math.cos(t * 0.39 + phase) * 0.64;
    const dx = -Math.sin(t) * walkRadius;
    const dz = Math.cos(t * 0.82) * walkRadius;
    const bob = Math.sin(elapsed * 6.2 + phase) * 0.08;
    const walk = Math.sin(elapsed * 7.4 + phase);

    if (groupRef.current) {
      groupRef.current.position.set(x, 0.24 + bob, z);
      groupRef.current.rotation.y = Math.atan2(dx, dz);
      groupRef.current.scale.setScalar(scale);
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(elapsed * 1.6 + phase) * 0.18;
    }
    if (leftArmRef.current) leftArmRef.current.rotation.x = walk * 0.48;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -walk * 0.48;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -walk * 0.42;
    if (rightLegRef.current) rightLegRef.current.rotation.x = walk * 0.42;

    const positions = trail.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const lag = i / (TRAIL_POINTS - 1);
      const past = t - lag * 1.9;
      const px =
        marker.x +
        Math.cos(past) * walkRadius +
        Math.sin(past * 0.47 + phase) * 0.72;
      const pz =
        marker.z +
        Math.sin(past * 0.82) * walkRadius +
        Math.cos(past * 0.39 + phase) * 0.64;
      positions.setXYZ(i, px, 0.18 + (1 - lag) * 0.18, pz);
    }
    positions.needsUpdate = true;
  });

  const handlePointer = (event: { stopPropagation: () => void }) => {
    if (!onMarkerClick) return;
    event.stopPropagation();
    onMarkerClick(marker.agentId);
  };

  return (
    <group>
      <primitive object={trail} />
      <group
        ref={groupRef}
        onClick={handlePointer}
        onPointerDown={handlePointer}
      >
        <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.54, 0.72, 0.36]} />
          <meshStandardMaterial
            color={marker.mine ? '#ffc857' : '#d6e3e1'}
            roughness={0.48}
            metalness={0.18}
          />
        </mesh>
        <mesh ref={headRef} position={[0, 1.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.48, 0.38, 0.42]} />
          <meshStandardMaterial
            color="#f0f6f3"
            roughness={0.38}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0, 1.34, 0.225]}>
          <boxGeometry args={[0.34, 0.08, 0.035]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.76}
            roughness={0.26}
            metalness={0.1}
          />
        </mesh>
        <mesh position={[0, 0.88, 0.205]}>
          <boxGeometry args={[0.28, 0.13, 0.035]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.54}
            roughness={0.32}
          />
        </mesh>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.26, 6]} />
          <meshStandardMaterial color="#1b2a31" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.77, 0]}>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.74}
          />
        </mesh>
        <mesh
          ref={leftArmRef}
          position={[-0.38, 0.88, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.16, 0.56, 0.16]} />
          <meshStandardMaterial color="#c2cfca" roughness={0.52} />
        </mesh>
        <mesh
          ref={rightArmRef}
          position={[0.38, 0.88, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.16, 0.56, 0.16]} />
          <meshStandardMaterial color="#c2cfca" roughness={0.52} />
        </mesh>
        <mesh
          ref={leftLegRef}
          position={[-0.16, 0.26, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.16, 0.5, 0.18]} />
          <meshStandardMaterial color="#879590" roughness={0.64} />
        </mesh>
        <mesh
          ref={rightLegRef}
          position={[0.16, 0.26, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.16, 0.5, 0.18]} />
          <meshStandardMaterial color="#879590" roughness={0.64} />
        </mesh>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 20]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.22} />
        </mesh>
      </group>
    </group>
  );
}
