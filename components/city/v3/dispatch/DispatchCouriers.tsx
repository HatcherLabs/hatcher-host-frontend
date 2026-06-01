'use client';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDispatchStore } from '@/lib/agent-dispatch/store';
import { skinById, type ActiveDispatch } from '@/lib/agent-dispatch/config';
import { sampleLiveAgentPath } from '../liveAgentMotion';

const COLLECT_RADIUS = 2.4;
const VFX_POOL = 6;
const VFX_MS = 650;

let sharedSoftTexture: THREE.Texture | null = null;
function softTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  if (!sharedSoftTexture) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    sharedSoftTexture = new THREE.CanvasTexture(c);
    sharedSoftTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return sharedSoftTexture;
}

/** All in-flight dispatch couriers + their collectibles. Reads the store. */
export function DispatchCouriers() {
  const dispatches = useDispatchStore((s) => s.dispatches);
  const equippedSkin = useDispatchStore((s) => s.equippedSkin);
  const skinColor = useMemo(() => skinById(equippedSkin).color, [equippedSkin]);

  return (
    <group>
      {dispatches.map((d) => (
        <Courier key={d.id} dispatch={d} color={skinColor} />
      ))}
    </group>
  );
}

function Courier({ dispatch, color }: { dispatch: ActiveDispatch; color: string }) {
  const collectPacket = useDispatchStore((s) => s.collectPacket);
  const completeDispatch = useDispatchStore((s) => s.completeDispatch);

  const groupRef = useRef<THREE.Group>(null);
  const packetRefs = useRef<(THREE.Mesh | null)[]>([]);
  const vfxRefs = useRef<(THREE.Mesh | null)[]>([]);
  const vfxBorn = useRef<number[]>(Array(VFX_POOL).fill(0));
  const vfxNext = useRef(0);
  const doneRef = useRef(false);
  const tex = useMemo(() => softTexture(), []);
  const accent = useMemo(() => new THREE.Color(color), [color]);

  const routeLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setFromPoints(dispatch.route.map((p) => new THREE.Vector3(p.x, 0.4, p.z)));
    const mat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.28, toneMapped: false });
    return new THREE.Line(geo, mat);
  }, [dispatch.route, accent]);

  useEffect(() => {
    return () => {
      routeLine.geometry.dispose();
      (routeLine.material as THREE.Material).dispose();
    };
  }, [routeLine]);

  useFrame(({ clock }) => {
    const now = Date.now();
    const progress = Math.min(1, Math.max(0, (now - dispatch.startedAt) / dispatch.durationMs));
    const pose = sampleLiveAgentPath(dispatch.route, progress * dispatch.totalLength);
    const t = clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.position.set(pose.x, 1.1 + Math.sin(t * 3) * 0.12, pose.z);
      groupRef.current.rotation.y = t * 1.4;
    }

    // Collectibles: pulse, hide collected, and pick up on proximity.
    for (let i = 0; i < dispatch.packets.length; i++) {
      const packet = dispatch.packets[i]!;
      const mesh = packetRefs.current[i];
      if (!mesh) continue;
      if (packet.collected) {
        mesh.visible = false;
        continue;
      }
      const pulse = 1 + Math.sin(t * 5 + i) * 0.18;
      mesh.scale.setScalar(pulse);
      const dx = pose.x - packet.x;
      const dz = pose.z - packet.z;
      if (dx * dx + dz * dz < COLLECT_RADIUS * COLLECT_RADIUS) {
        collectPacket(dispatch.id, i);
        mesh.visible = false;
        // Fire a pickup ring from the pool.
        const slot = vfxNext.current;
        vfxNext.current = (slot + 1) % VFX_POOL;
        const ring = vfxRefs.current[slot];
        if (ring) {
          ring.position.set(packet.x, 0.6, packet.z);
          vfxBorn.current[slot] = now;
        }
      }
    }

    // Animate pickup rings.
    for (let s = 0; s < VFX_POOL; s++) {
      const ring = vfxRefs.current[s];
      const born = vfxBorn.current[s]!;
      if (!ring) continue;
      const age = (now - born) / VFX_MS;
      if (born === 0 || age >= 1) {
        ring.visible = false;
        continue;
      }
      ring.visible = true;
      const sc = 0.4 + age * 2.4;
      ring.scale.setScalar(sc);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - age) * 0.6;
    }

    if (progress >= 1 && !doneRef.current) {
      doneRef.current = true;
      completeDispatch(dispatch.id);
    }
  });

  return (
    <group>
      {/* Route guideline */}
      <primitive object={routeLine} />

      {/* Collectible packets */}
      {dispatch.packets.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            packetRefs.current[i] = m;
          }}
          position={[p.x, 0.85, p.z]}
        >
          <octahedronGeometry args={[0.34, 0]} />
          <meshBasicMaterial color={accent} transparent opacity={0.92} toneMapped={false} />
        </mesh>
      ))}

      {/* Pickup ring pool */}
      {Array.from({ length: VFX_POOL }, (_, s) => (
        <mesh
          key={`vfx-${s}`}
          ref={(m) => {
            vfxRefs.current[s] = m;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.5, 0.62, 28]} />
          <meshBasicMaterial color={accent} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      {/* The courier orb */}
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
        {tex && (
          <sprite scale={[1.7, 1.7, 1.7]}>
            <spriteMaterial map={tex} color={accent} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        )}
        <pointLight color={accent} intensity={1.1} distance={6} />
      </group>
    </group>
  );
}
