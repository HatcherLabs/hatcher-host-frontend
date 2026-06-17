'use client';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { MutableRefObject } from 'react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { liveAgentColor } from './LiveCityColors';
import { makeLiveAgentLoopPath, sampleLiveAgentPath, type LiveAgentPose } from './liveAgentMotion';
import type { LiveAgentMarkerLayout } from './liveLayout';
import { getGlbAvatarModel } from '@/components/agent-room/v2/stations/avatarModelConfig';
import { CityAvatar } from './CityAvatar';
import { useDispatchStore } from '@/lib/agent-dispatch/store';
import { skinById } from '@/lib/agent-dispatch/config';
import { cityAgentDisplayName } from './cityDisplay';
import { CITY_RENDER_BUDGET } from './cityRenderBudget';

interface Props {
  markers: LiveAgentMarkerLayout[];
  onMarkerClick?: (agentId: string) => void;
  poseRef?: MutableRefObject<Map<string, LiveAgentPose>>;
  realAvatarsEnabled?: boolean;
}

const TRAIL_LEN = 22;
// Cap on how many walkers render their real (rigged GLB) avatar at once. Each
// avatar is a clone + AnimationMixer; the generic robot is cheap. Your own
// agents always get one; the rest fill the budget by layout rank order.
const CITY_AVATAR_BUDGET = 18;

function cityWalkerStatusLabel(status: LiveAgentMarkerLayout['status']): string {
  switch (status) {
    case 'running':
      return 'active';
    case 'sleeping':
      return 'sleeping';
    case 'paused':
      return 'paused';
    case 'crashed':
      return 'offline';
    default:
      return status;
  }
}

export function LiveAgentMarkers({
  markers,
  onMarkerClick,
  poseRef,
  realAvatarsEnabled = true,
}: Props) {
  // Your equipped dispatch skin colors your own walkers (default = the usual gold).
  const equippedSkin = useDispatchStore((s) => s.equippedSkin);
  const mineColor = useMemo(
    () => new THREE.Color(skinById(equippedSkin).color).getHex(),
    [equippedSkin],
  );
  const avatarIds = useMemo(() => {
    const ids = new Set<string>();
    if (!realAvatarsEnabled) return ids;
    const eligible = (m: LiveAgentMarkerLayout) =>
      !!m.avatar && getGlbAvatarModel(m.avatar) !== null;
    // Your own agents first — you want to see them as themselves.
    for (const m of markers) {
      if (m.mine && eligible(m)) ids.add(m.agentId);
    }
    // Then fill remaining budget by layout order (already rank-prioritised).
    for (const m of markers) {
      if (ids.size >= CITY_AVATAR_BUDGET) break;
      if (!ids.has(m.agentId) && eligible(m)) ids.add(m.agentId);
    }
    return ids;
  }, [markers, realAvatarsEnabled]);

  if (markers.length === 0) return null;

  return (
    <group>
      {markers.map((marker) => (
        <LiveRobotAgent
          key={marker.agentId}
          marker={marker}
          onMarkerClick={onMarkerClick}
          poseRef={poseRef}
          useRealAvatar={avatarIds.has(marker.agentId)}
          mineColor={mineColor}
        />
      ))}
    </group>
  );
}

function LiveRobotAgent({
  marker,
  onMarkerClick,
  poseRef,
  useRealAvatar,
  mineColor,
}: {
  marker: LiveAgentMarkerLayout;
  onMarkerClick?: (agentId: string) => void;
  poseRef?: MutableRefObject<Map<string, LiveAgentPose>>;
  useRealAvatar?: boolean;
  mineColor?: number;
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
  const [isHovered, setIsHovered] = useState(false);
  // Your own walkers wear the equipped dispatch skin; everyone else keeps the
  // framework/status palette.
  const color = marker.mine && mineColor != null ? mineColor : liveAgentColor(marker);
  const colorObject = useMemo(() => new THREE.Color(color), [color]);
  const accentHex = useMemo(() => `#${color.toString(16).padStart(6, '0')}`, [color]);
  const path = useMemo(
    () => makeLiveAgentLoopPath(marker.pathNodes, marker.x, marker.z),
    [marker.pathNodes, marker.x, marker.z],
  );
  const trail = useMemo(() => {
    if (!CITY_RENDER_BUDGET.agentTrails) return null;
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
    if (!trail) return;
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
      if (trail) {
        trail.geometry.dispose();
        (trail.material as THREE.Material).dispose();
      }
      poseRegistry?.delete(marker.agentId);
    };
  }, [marker.agentId, poseRef, trail]);

  useFrame(({ clock, camera }, delta) => {
    const elapsed = clock.elapsedTime;
    const travel = elapsed * marker.speed + marker.phase;
    const pose = sampleLiveAgentPath(path, travel);
    poseRef?.current.set(marker.agentId, pose);
    // Distance LOD: past ~70 units, keep the walker moving but drop the motion
    // trail and the small flourishes (the per-frame trail buffer churn is the
    // pricey part). Cheap and invisible at that range.
    const dxCam = pose.x - camera.position.x;
    const dzCam = pose.z - camera.position.z;
    const far = dxCam * dxCam + dzCam * dzCam > 4900;
    if (trail) trail.visible = !far;
    const bob = Math.sin((elapsed + marker.phase) * 18) * 0.025;
    const swing = far ? 0 : Math.sin((elapsed + marker.phase) * 9) * 0.55;

    if (groupRef.current) {
      groupRef.current.position.set(pose.x, bob, pose.z);
      groupRef.current.rotation.y = pose.heading;
      // Pop slightly on hover so the pointer target reads as interactive.
      const targetScale = isHovered ? 1.16 : 1;
      const s = groupRef.current.scale.x;
      groupRef.current.scale.setScalar(s + (targetScale - s) * 0.2);
    }
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;

    if (!far) {
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

      if (trail) {
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
      }
    }

    if (delta > 0.2 && groupRef.current) {
      groupRef.current.position.set(pose.x, bob, pose.z);
    }
  });

  const handlePointer = (event: { stopPropagation: () => void }) => {
    if (!onMarkerClick) return;
    event.stopPropagation();
    onMarkerClick(marker.agentId);
  };

  const handlePointerOver = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    setIsHovered(true);
    if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    setIsHovered(false);
    if (typeof document !== 'undefined') document.body.style.cursor = '';
  };

  // Don't leave a stuck pointer cursor if the walker unmounts mid-hover.
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') document.body.style.cursor = '';
    };
  }, []);

  return (
    <group>
      {trail && <primitive object={trail} />}
      <group
        ref={groupRef}
        onClick={handlePointer}
        onPointerDown={handlePointer}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {isHovered && (
          <Html
            position={[0, 1.55, 0]}
            center
            distanceFactor={9}
            zIndexRange={[40, 0]}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <div
              style={{
                whiteSpace: 'nowrap',
                transform: 'translateY(-100%)',
                borderRadius: 8,
                border: `1px solid ${accentHex}`,
                background: 'rgba(10,12,18,0.92)',
                padding: '4px 9px',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 12,
                fontWeight: 600,
                color: '#f3f6fb',
                boxShadow: `0 6px 20px ${accentHex}55`,
              }}
            >
              <span>{cityAgentDisplayName(marker)}</span>
              <span style={{ color: accentHex, marginLeft: 8, fontWeight: 700 }}>
                {cityWalkerStatusLabel(marker.status)}
              </span>
            </div>
          </Html>
        )}
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
        {!useRealAvatar && (
          <>
            <mesh
              position={[0, 0.4, 0]}
              scale={[0.72, 0.92, 0.62]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[0.36, 22, 16]} />
              <meshLambertMaterial color={0xdedbd2} />
            </mesh>
            <mesh position={[0, 0.42, 0.205]} scale={[1, 0.42, 0.12]}>
              <sphereGeometry args={[0.19, 18, 10]} />
              <meshLambertMaterial
                color={0x070b12}
                emissive={colorObject}
                emissiveIntensity={0.28}
              />
            </mesh>
            <mesh position={[-0.06, 0.43, 0.23]}>
              <sphereGeometry args={[0.032, 10, 8]} />
              <meshBasicMaterial color={colorObject} toneMapped={false} />
            </mesh>
            <mesh position={[0.06, 0.43, 0.23]}>
              <sphereGeometry args={[0.032, 10, 8]} />
              <meshBasicMaterial color={colorObject} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.74, 0]} scale={[0.76, 0.42, 0.68]} castShadow receiveShadow>
              <sphereGeometry args={[0.32, 22, 12]} />
              <meshLambertMaterial color={0xf0ede4} />
            </mesh>
            <mesh position={[0, 0.62, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.26, 0.012, 8, 36]} />
              <meshBasicMaterial
                color={0xd6b177}
                transparent
                opacity={0.82}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, 0.69, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.1, 0.01, 8, 24]} />
              <meshBasicMaterial
                color={colorObject}
                transparent
                opacity={0.72}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={tipRef} position={[0, 1.07, 0]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshBasicMaterial color={colorObject} toneMapped={false} />
            </mesh>
            <mesh
              ref={leftArmRef}
              position={[-0.28, 0.43, 0.02]}
              rotation={[0, 0, -0.22]}
              castShadow
              receiveShadow
            >
              <capsuleGeometry args={[0.04, 0.19, 4, 8]} />
              <meshLambertMaterial color={0x9ea7b4} />
            </mesh>
            <mesh
              ref={rightArmRef}
              position={[0.28, 0.43, 0.02]}
              rotation={[0, 0, 0.22]}
              castShadow
              receiveShadow
            >
              <capsuleGeometry args={[0.04, 0.19, 4, 8]} />
              <meshLambertMaterial color={0x9ea7b4} />
            </mesh>
            <mesh ref={leftLegRef} position={[-0.09, 0.12, 0]} castShadow receiveShadow>
              <capsuleGeometry args={[0.045, 0.12, 4, 8]} />
              <meshLambertMaterial color={0x5f6874} />
            </mesh>
            <mesh ref={rightLegRef} position={[0.09, 0.12, 0]} castShadow receiveShadow>
              <capsuleGeometry args={[0.045, 0.12, 4, 8]} />
              <meshLambertMaterial color={0x5f6874} />
            </mesh>
          </>
        )}
        {/* Floating identity light — kept above both the generic robot and the
            real avatar so framework colour still reads at a glance. */}
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
        {useRealAvatar && marker.avatar && (
          <Suspense fallback={null}>
            <CityAvatar variant={marker.avatar} phase={marker.phase} />
          </Suspense>
        )}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 14]} />
          <meshBasicMaterial color={0x000000} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
