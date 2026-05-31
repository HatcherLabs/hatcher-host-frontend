'use client';
import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { liveAgentColor } from './LiveCityColors';
import { makeLiveAgentLoopPath, sampleLiveAgentPath, type LiveAgentPose } from './liveAgentMotion';
import type { LiveAgentMarkerLayout } from './liveLayout';

interface Props {
  markers: LiveAgentMarkerLayout[];
  onMarkerClick?: (agentId: string) => void;
  poseRef?: MutableRefObject<Map<string, LiveAgentPose>>;
}

const TRAIL_LEN = 22;

export function LiveAgentMarkers({ markers, onMarkerClick, poseRef }: Props) {
  if (markers.length === 0) return null;

  return (
    <group>
      {markers.map((marker) => (
        <LiveRobotAgent
          key={marker.agentId}
          marker={marker}
          onMarkerClick={onMarkerClick}
          poseRef={poseRef}
        />
      ))}
    </group>
  );
}

function LiveRobotAgent({
  marker,
  onMarkerClick,
  poseRef,
}: {
  marker: LiveAgentMarkerLayout;
  onMarkerClick?: (agentId: string) => void;
  poseRef?: MutableRefObject<Map<string, LiveAgentPose>>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const tipRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const scannerRef = useRef<THREE.Group>(null);
  const color = liveAgentColor(marker);
  const colorObject = useMemo(() => new THREE.Color(color), [color]);
  const path = useMemo(
    () => makeLiveAgentLoopPath(marker.pathNodes, marker.x, marker.z),
    [marker.pathNodes, marker.x, marker.z],
  );
  const trail = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3),
    );
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3));
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      toneMapped: false,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    return line;
  }, []);

  useEffect(() => {
    const positions = trail.geometry.attributes.position as THREE.BufferAttribute;
    const colors = trail.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < TRAIL_LEN; i++) {
      positions.setXYZ(i, marker.x, 0.55, marker.z);
      colors.setXYZ(i, colorObject.r, colorObject.g, colorObject.b);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }, [colorObject, marker.x, marker.z, trail]);

  useEffect(() => {
    const poseRegistry = poseRef?.current;
    return () => {
      trail.geometry.dispose();
      (trail.material as THREE.Material).dispose();
      poseRegistry?.delete(marker.agentId);
    };
  }, [marker.agentId, poseRef, trail]);

  useFrame(({ clock }, delta) => {
    const elapsed = clock.elapsedTime;
    const travel = elapsed * marker.speed + marker.phase;
    const pose = sampleLiveAgentPath(path, travel);
    poseRef?.current.set(marker.agentId, pose);
    const bob = Math.sin((elapsed + marker.phase) * 18) * 0.025;
    const swing = Math.sin((elapsed + marker.phase) * 9) * 0.55;

    if (groupRef.current) {
      groupRef.current.position.set(pose.x, bob, pose.z);
      groupRef.current.rotation.y = pose.heading;
    }
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;
    if (tipRef.current) {
      const pulse = 1 + Math.sin((elapsed + marker.phase) * 11.7) * 0.25;
      tipRef.current.scale.set(pulse, pulse, pulse);
    }
    if (haloRef.current) {
      const haloPulse = 1 + Math.sin((elapsed + marker.phase) * 2.5) * 0.08;
      haloRef.current.scale.set(haloPulse, haloPulse, haloPulse);
      haloRef.current.rotation.z = elapsed * 0.7 + marker.phase;
    }
    if (scannerRef.current) {
      scannerRef.current.rotation.y = elapsed * 1.35 + marker.phase * 0.4;
    }
    if (beaconRef.current) {
      const lift = Math.sin((elapsed + marker.phase) * 2.2) * 0.08;
      const pulse = 0.46 + Math.sin((elapsed + marker.phase) * 4.4) * 0.16;
      beaconRef.current.position.y = 1.22 + lift;
      const material = beaconRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = pulse;
    }

    const positions = trail.geometry.attributes.position as THREE.BufferAttribute;
    const colors = trail.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = TRAIL_LEN - 1; i > 0; i--) {
      positions.setXYZ(i, positions.getX(i - 1), positions.getY(i - 1), positions.getZ(i - 1));
    }
    positions.setXYZ(0, pose.x, 0.55, pose.z);
    for (let i = 0; i < TRAIL_LEN; i++) {
      const fade = 1 - i / TRAIL_LEN;
      colors.setXYZ(i, colorObject.r * fade, colorObject.g * fade, colorObject.b * fade);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;

    if (delta > 0.2 && groupRef.current) {
      groupRef.current.position.set(pose.x, bob, pose.z);
    }
  });

  const handlePointer = (event: { stopPropagation: () => void }) => {
    if (!onMarkerClick) return;
    event.stopPropagation();
    onMarkerClick(marker.agentId);
  };

  return (
    <group>
      <primitive object={trail} />
      <group ref={groupRef} onClick={handlePointer} onPointerDown={handlePointer}>
        <group ref={haloRef} position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.48, 0.54, 36]} />
            <meshBasicMaterial
              color={colorObject}
              transparent
              opacity={0.32}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <ringGeometry args={[0.68, 0.705, 36]} />
            <meshBasicMaterial
              color={colorObject}
              transparent
              opacity={0.16}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
        <group ref={scannerRef} position={[0, 0.58, 0]}>
          <mesh position={[0, 0.02, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08, 0.11, 18]} />
            <meshBasicMaterial
              color={colorObject}
              transparent
              opacity={0.38}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.02, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08, 0.11, 18]} />
            <meshBasicMaterial
              color={colorObject}
              transparent
              opacity={0.24}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[1.45, 1.65, 1.45]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.42, 0.26]} />
          <meshLambertMaterial color={0xc7cdd8} />
        </mesh>
        <mesh position={[0, 0.46, 0.135]}>
          <boxGeometry args={[0.18, 0.12, 0.02]} />
          <meshLambertMaterial color={0x0a0e16} emissive={colorObject} emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.26, 0.22, 0.22]} />
          <meshLambertMaterial color={0xc7cdd8} />
        </mesh>
        <mesh position={[0, 0.79, 0.111]}>
          <boxGeometry args={[0.22, 0.07, 0.02]} />
          <meshLambertMaterial color={0x05080f} emissive={colorObject} emissiveIntensity={1.1} />
        </mesh>
        <mesh position={[0, 0.97, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.18, 5]} />
          <meshLambertMaterial color={0x2a3040} />
        </mesh>
        <mesh ref={tipRef} position={[0, 1.07, 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color={colorObject} toneMapped={false} />
        </mesh>
        <mesh ref={beaconRef} position={[0, 1.22, 0]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshBasicMaterial
            color={colorObject}
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={leftArmRef} position={[-0.21, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.07, 0.22, 0.1]} />
          <meshLambertMaterial color={0x3a4254} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.21, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.07, 0.22, 0.1]} />
          <meshLambertMaterial color={0x3a4254} />
        </mesh>
        <mesh ref={leftLegRef} position={[-0.08, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.09, 0.18, 0.1]} />
          <meshLambertMaterial color={0x2a3040} />
        </mesh>
        <mesh ref={rightLegRef} position={[0.08, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.09, 0.18, 0.1]} />
          <meshLambertMaterial color={0x2a3040} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 14]} />
          <meshBasicMaterial color={0x000000} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
