'use client';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useDispatchStore } from '@/lib/agent-dispatch/store';
import { reportDispatchComplete } from '@/lib/agent-dispatch/leaderboard';
import {
  skinById,
  upgradeEffects,
  prestigeMultiplier,
  PACKET_DATA,
  RARE_PACKET_MULT,
  COMBO_WINDOW_MS,
  COMBO_MAX,
  type ActiveDispatch,
} from '@/lib/agent-dispatch/config';
import { sampleLiveAgentPath } from '../liveAgentMotion';

const VFX_POOL = 6;
const VFX_MS = 650;
const RARE_COLOR = '#ffd24a';

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
  const upgrades = useDispatchStore((s) => s.upgrades);
  const skinColor = useMemo(() => skinById(equippedSkin).color, [equippedSkin]);
  const fx = useMemo(() => upgradeEffects(upgrades), [upgrades]);

  return (
    <group>
      {dispatches.map((d) => (
        <Courier
          key={d.id}
          dispatch={d}
          color={skinColor}
          collectRadius={fx.collectRadius}
          magnetRange={fx.magnetRange}
          payoutMult={fx.payoutMult}
        />
      ))}
    </group>
  );
}

function Courier({
  dispatch,
  color,
  collectRadius,
  magnetRange,
  payoutMult,
}: {
  dispatch: ActiveDispatch;
  color: string;
  collectRadius: number;
  magnetRange: number;
  payoutMult: number;
}) {
  const collectPacket = useDispatchStore((s) => s.collectPacket);
  const completeDispatch = useDispatchStore((s) => s.completeDispatch);
  const prestige = useDispatchStore((s) => s.prestige);

  const groupRef = useRef<THREE.Group>(null);
  const packetRefs = useRef<(THREE.Mesh | null)[]>([]);
  const vfxRefs = useRef<(THREE.Mesh | null)[]>([]);
  const vfxBorn = useRef<number[]>(Array(VFX_POOL).fill(0));
  const vfxNext = useRef(0);
  const doneRef = useRef(false);
  const comboRef = useRef(0);
  const lastCollectRef = useRef(0);
  const tex = useMemo(() => softTexture(), []);
  const accent = useMemo(() => new THREE.Color(color), [color]);

  // Live packet positions (so the tractor beam can pull them in).
  const posRef = useRef<{ x: number; z: number }[]>([]);
  if (posRef.current.length !== dispatch.packets.length) {
    posRef.current = dispatch.packets.map((p) => ({ x: p.x, z: p.z }));
  }

  const [float, setFloat] = useState<{ text: string; color: string; nonce: number } | null>(null);

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

  useFrame(({ clock }, delta) => {
    const now = Date.now();
    const progress = Math.min(1, Math.max(0, (now - dispatch.startedAt) / dispatch.durationMs));
    const pose = sampleLiveAgentPath(dispatch.route, progress * dispatch.totalLength);
    const t = clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.position.set(pose.x, 1.1 + Math.sin(t * 3) * 0.12, pose.z);
      groupRef.current.rotation.y = t * 1.4;
    }

    // Combo decays if you stop collecting.
    if (comboRef.current > 0 && now - lastCollectRef.current > COMBO_WINDOW_MS) {
      comboRef.current = 0;
    }

    for (let i = 0; i < dispatch.packets.length; i++) {
      const packet = dispatch.packets[i]!;
      const mesh = packetRefs.current[i];
      if (!mesh) continue;
      if (packet.collected) {
        mesh.visible = false;
        continue;
      }
      const pos = posRef.current[i]!;
      // Tractor beam: drift toward the courier when in range.
      if (magnetRange > 0) {
        const mdx = pose.x - pos.x;
        const mdz = pose.z - pos.z;
        const md = Math.hypot(mdx, mdz);
        if (md < magnetRange && md > 0.01) {
          const pull = Math.min(1, delta * 3.5) * (1 - md / magnetRange);
          pos.x += mdx * pull;
          pos.z += mdz * pull;
        }
      }
      const pulse = (packet.rare ? 1.5 : 1) * (1 + Math.sin(t * 5 + i) * 0.18);
      mesh.scale.setScalar(pulse);
      mesh.position.set(pos.x, 0.85, pos.z);

      const dx = pose.x - pos.x;
      const dz = pose.z - pos.z;
      if (dx * dx + dz * dz < collectRadius * collectRadius) {
        // Combo: consecutive pickups within the window stack up.
        comboRef.current =
          now - lastCollectRef.current < COMBO_WINDOW_MS ? Math.min(COMBO_MAX, comboRef.current + 1) : 1;
        lastCollectRef.current = now;
        const combo = comboRef.current;
        collectPacket(dispatch.id, i, { combo, rare: packet.rare });
        mesh.visible = false;

        const gain = Math.round(
          PACKET_DATA * (packet.rare ? RARE_PACKET_MULT : 1) * combo * payoutMult * prestigeMultiplier(prestige),
        );
        setFloat({
          text: packet.rare ? `★ +${gain}` : combo > 1 ? `+${gain} ×${combo}` : `+${gain}`,
          color: packet.rare ? RARE_COLOR : color,
          nonce: now,
        });

        const slot = vfxNext.current;
        vfxNext.current = (slot + 1) % VFX_POOL;
        const ring = vfxRefs.current[slot];
        if (ring) {
          ring.position.set(pos.x, 0.6, pos.z);
          vfxBorn.current[slot] = now;
        }
      }
    }

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
      ring.scale.setScalar(0.4 + age * 2.4);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - age) * 0.6;
    }

    if (progress >= 1 && !doneRef.current) {
      doneRef.current = true;
      completeDispatch(dispatch.id);
      // Authoritative scoring path: report the completion so the server accrues
      // the competitive score (bounded, anti-farmed) + queues an on-chain
      // receipt when enabled. No-ops server-side when signed out.
      void reportDispatchComplete({
        framework: dispatch.framework,
        destName: dispatch.destName,
        job: dispatch.jobName,
        agentId: dispatch.agentId,
      });
    }
  });

  return (
    <group>
      <primitive object={routeLine} />

      {dispatch.packets.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            packetRefs.current[i] = m;
          }}
          position={[p.x, 0.85, p.z]}
        >
          <octahedronGeometry args={[0.34, 0]} />
          <meshBasicMaterial color={p.rare ? RARE_COLOR : accent} transparent opacity={0.92} toneMapped={false} />
        </mesh>
      ))}

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

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
        {tex && (
          <sprite scale={[1.7, 1.7, 1.7]}>
            <spriteMaterial map={tex} color={accent} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        )}
        <pointLight color={accent} intensity={1.1} distance={6} />
        {float && (
          <Html key={float.nonce} position={[0, 0.9, 0]} center distanceFactor={11} style={{ pointerEvents: 'none' }}>
            <div
              style={{
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 800,
                fontSize: 14,
                color: float.color,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                animation: 'dispatch-float 0.95s ease-out forwards',
              }}
            >
              {float.text}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
