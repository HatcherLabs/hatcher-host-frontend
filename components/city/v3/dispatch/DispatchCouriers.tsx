'use client';
import { useFrame } from '@react-three/fiber';
import { Html, Trail } from '@react-three/drei';
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
  type DispatchSkinShape,
} from '@/lib/agent-dispatch/config';
import { sampleLiveAgentPath } from '../liveAgentMotion';

const VFX_POOL = 6;
const VFX_MS = 650;
const RARE_COLOR = '#ffd24a';
const HAZARD_COLOR = '#ff4444';
const HAZARD_RADIUS = 1.35;
const HAZARD_COOLDOWN_MS = 1500;

/** Obstacle positions for a Hazard-job run — placed ON the route so the
 *  auto-courier hits them (combo break) and a manual driver can swerve to dodge. */
function buildHazards(route: { x: number; z: number }[], totalLength: number): { x: number; z: number }[] {
  if (route.length < 2) return [];
  return [0.3, 0.5, 0.7].map((f) => {
    const pose = sampleLiveAgentPath(route, f * totalLength);
    return { x: pose.x, z: pose.z };
  });
}

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

type SteerRef = React.RefObject<{ x: number; z: number }>;

/** WASD / arrow-key steering vector, active only while manual control is on. */
function useSteerKeys(active: boolean): SteerRef {
  const keys = useRef({ x: 0, z: 0 });
  useEffect(() => {
    keys.current = { x: 0, z: 0 };
    if (!active) return;
    const pressed = new Set<string>();
    const STEER = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    const recompute = () => {
      let x = 0;
      let z = 0;
      if (pressed.has('a') || pressed.has('arrowleft')) x -= 1;
      if (pressed.has('d') || pressed.has('arrowright')) x += 1;
      if (pressed.has('w') || pressed.has('arrowup')) z -= 1;
      if (pressed.has('s') || pressed.has('arrowdown')) z += 1;
      const len = Math.hypot(x, z) || 1;
      keys.current = { x: x / len, z: z / len };
    };
    const dn = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!STEER.includes(k)) return;
      pressed.add(k);
      recompute();
      if (k.startsWith('arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      pressed.delete(e.key.toLowerCase());
      recompute();
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
  }, [active]);
  return keys;
}

/** A glowing city-wide beacon shown while a Data Surge is active. */
function SurgeBeacon() {
  const active = useDispatchStore((s) => s.surgeActive);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = t * 0.6;
    const s = 1 + Math.sin(t * 3) * 0.15;
    ref.current.scale.set(s, 1, s);
  });
  if (!active) return null;
  return (
    <group ref={ref}>
      <mesh position={[0, 30, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 60, 12, 1, true]} />
        <meshBasicMaterial color={RARE_COLOR} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <ringGeometry args={[3, 4.2, 44]} />
        <meshBasicMaterial color={RARE_COLOR} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color={RARE_COLOR} intensity={3} distance={45} position={[0, 8, 0]} />
    </group>
  );
}

/** All in-flight dispatch couriers + their collectibles. Reads the store. */
export function DispatchCouriers() {
  const dispatches = useDispatchStore((s) => s.dispatches);
  const equippedSkin = useDispatchStore((s) => s.equippedSkin);
  const upgrades = useDispatchStore((s) => s.upgrades);
  const manualControl = useDispatchStore((s) => s.manualControl);
  const skin = useMemo(() => skinById(equippedSkin), [equippedSkin]);
  const fx = useMemo(() => upgradeEffects(upgrades), [upgrades]);
  const keysRef = useSteerKeys(manualControl);

  return (
    <group>
      <SurgeBeacon />
      {dispatches.map((d, idx) => (
        <Courier
          key={d.id}
          dispatch={d}
          color={skin.color}
          trailColor={skin.trail}
          shape={skin.shape}
          collectRadius={fx.collectRadius}
          magnetRange={fx.magnetRange}
          payoutMult={fx.payoutMult}
          manual={manualControl && idx === 0}
          keysRef={keysRef}
        />
      ))}
    </group>
  );
}

/** Real 3D courier model per equipped skin (replaces the plain glowing orb). */
function CourierSkin({ shape, color }: { shape: DispatchSkinShape; color: THREE.ColorRepresentation }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y += dt * (shape === 'drone' ? 3.4 : shape === 'satellite' ? 0.8 : 1.5);
    if (shape === 'flame') {
      const s = 1 + Math.sin(g.userData.t = (g.userData.t ?? 0) + dt * 9) * 0.14;
      g.scale.set(1, s, 1);
    }
  });
  const mat = (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={1.5}
      metalness={0.35}
      roughness={0.25}
      toneMapped={false}
    />
  );
  switch (shape) {
    case 'crystal':
      return (
        <group ref={ref}>
          <mesh scale={[1, 1.8, 1]}><octahedronGeometry args={[0.26, 0]} />{mat}</mesh>
        </group>
      );
    case 'prism':
      return (
        <group ref={ref}>
          <mesh><dodecahedronGeometry args={[0.32, 0]} />{mat}</mesh>
        </group>
      );
    case 'flame':
      return (
        <group ref={ref}>
          <mesh position={[0, 0.05, 0]}><coneGeometry args={[0.24, 0.62, 9]} />{mat}</mesh>
        </group>
      );
    case 'drone':
      return (
        <group ref={ref}>
          <mesh><boxGeometry args={[0.32, 0.12, 0.32]} />{mat}</mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.34, 0.03, 6, 18]} />{mat}</mesh>
        </group>
      );
    case 'satellite':
      return (
        <group ref={ref}>
          <mesh><boxGeometry args={[0.2, 0.2, 0.34]} />{mat}</mesh>
          <mesh position={[0.4, 0, 0]} rotation={[0, 0, 0.25]}><boxGeometry args={[0.5, 0.02, 0.24]} />{mat}</mesh>
          <mesh position={[-0.4, 0, 0]} rotation={[0, 0, -0.25]}><boxGeometry args={[0.5, 0.02, 0.24]} />{mat}</mesh>
        </group>
      );
    default: // orb — faceted, not a smooth sphere
      return (
        <group ref={ref}>
          <mesh><icosahedronGeometry args={[0.33, 0]} />{mat}</mesh>
        </group>
      );
  }
}

function Courier({
  dispatch,
  color,
  trailColor,
  shape,
  collectRadius,
  magnetRange,
  payoutMult,
  manual,
  keysRef,
}: {
  dispatch: ActiveDispatch;
  color: string;
  trailColor: string;
  shape: DispatchSkinShape;
  collectRadius: number;
  magnetRange: number;
  payoutMult: number;
  manual: boolean;
  keysRef: SteerRef;
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

  // Manual steering state + roam bounds (route bbox + margin so the destination
  // is always reachable).
  const manualPos = useRef<{ x: number; z: number } | null>(null);
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of dispatch.route) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    }
    const m = 45;
    return { minX: minX - m, maxX: maxX + m, minZ: minZ - m, maxZ: maxZ + m };
  }, [dispatch.route]);

  // Hazard obstacles (Hazard job only).
  const hazards = useMemo(
    () => (dispatch.jobName === 'Hazard' ? buildHazards(dispatch.route, dispatch.totalLength) : []),
    [dispatch.jobName, dispatch.route, dispatch.totalLength],
  );
  const hazardRefs = useRef<(THREE.Mesh | null)[]>([]);
  const hazardHit = useRef<number[]>([]);
  if (hazardHit.current.length !== hazards.length) hazardHit.current = hazards.map(() => 0);

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
    const t = clock.elapsedTime;
    let pose: { x: number; z: number };
    let arrived: boolean;

    if (manual) {
      // Player-steered: integrate the key vector, clamp to the roam bounds, and
      // arrive by reaching the destination yourself.
      if (!manualPos.current) manualPos.current = { x: dispatch.route[0]!.x, z: dispatch.route[0]!.z };
      const mp = manualPos.current;
      const k = keysRef.current ?? { x: 0, z: 0 };
      const SPEED = 17;
      mp.x = Math.min(bounds.maxX, Math.max(bounds.minX, mp.x + k.x * SPEED * delta));
      mp.z = Math.min(bounds.maxZ, Math.max(bounds.minZ, mp.z + k.z * SPEED * delta));
      pose = mp;
      const dest = dispatch.route[dispatch.route.length - 1]!;
      arrived = Math.hypot(dest.x - mp.x, dest.z - mp.z) < 2.6;
      if (groupRef.current) {
        groupRef.current.position.set(mp.x, 1.1 + Math.sin(t * 3) * 0.12, mp.z);
        if (k.x !== 0 || k.z !== 0) groupRef.current.rotation.y = Math.atan2(k.x, k.z);
      }
    } else {
      const progress = Math.min(1, Math.max(0, (now - dispatch.startedAt) / dispatch.durationMs));
      pose = sampleLiveAgentPath(dispatch.route, progress * dispatch.totalLength);
      arrived = progress >= 1;
      if (groupRef.current) {
        groupRef.current.position.set(pose.x, 1.1 + Math.sin(t * 3) * 0.12, pose.z);
        groupRef.current.rotation.y = t * 1.4;
      }
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

    // Hazard collisions: hitting one breaks your combo (dodge in manual mode).
    for (let h = 0; h < hazards.length; h++) {
      const hz = hazards[h]!;
      const mesh = hazardRefs.current[h];
      if (mesh) {
        mesh.rotation.y = t * 1.6;
        mesh.rotation.x = t * 1.1;
        mesh.scale.setScalar(1 + Math.sin(t * 4 + h) * 0.12);
      }
      const hdx = pose.x - hz.x;
      const hdz = pose.z - hz.z;
      if (hdx * hdx + hdz * hdz < HAZARD_RADIUS * HAZARD_RADIUS && now - hazardHit.current[h]! > HAZARD_COOLDOWN_MS) {
        hazardHit.current[h] = now;
        if (comboRef.current > 0) {
          comboRef.current = 0;
          setFloat({ text: '✖ combo lost', color: HAZARD_COLOR, nonce: now });
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

    if (arrived && !doneRef.current) {
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

      {hazards.map((h, i) => (
        <mesh
          key={`hz-${i}`}
          ref={(m) => {
            hazardRefs.current[i] = m;
          }}
          position={[h.x, 0.8, h.z]}
        >
          <tetrahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color={HAZARD_COLOR} emissive={HAZARD_COLOR} emissiveIntensity={1.3} wireframe toneMapped={false} />
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

      <Trail target={groupRef as unknown as React.RefObject<THREE.Object3D>} width={1.1} length={6} color={trailColor} attenuation={(w) => w} />

      <group ref={groupRef}>
        <CourierSkin shape={shape} color={accent} />
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
