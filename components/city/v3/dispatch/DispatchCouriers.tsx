'use client';
import { useFrame, useThree } from '@react-three/fiber';
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
import { createWalkCollisionMap, resolveWalkPosition, type WalkCollisionMap } from '../walkCollision';
import type { LiveCityGrid } from '../liveCityHandoff';
import type { LiveBuildingLayout } from '../liveLayout';

const VFX_POOL = 6;
const VFX_MS = 650;

// Shared live state for the manual courier so a camera rig can follow it. `ts`
// is refreshed each frame the manual courier is live (rig engages only while
// fresh). `camYaw` is the orbit angle the player drags — movement is relative
// to it (walk-mode style: W goes where you're looking, A/D strafe).
const manualCam = { x: 0, y: 1.1, z: 0, camYaw: Math.PI, ts: 0 };

/** Walk-mode-style 3rd-person camera for the manually-steered courier: follows
 *  from behind the drag-controlled orbit yaw, looking at the courier. Takes over
 *  the default MapControls while a manual courier is live; releases otherwise. */
function DispatchFollowCamera() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as
    | { enabled: boolean; target?: THREE.Vector3 }
    | undefined;
  const dest = useMemo(() => new THREE.Vector3(), []);
  const engaged = useRef(false);
  const dragging = useRef(false);

  // Drag to orbit the camera (like walk mode's look) — only while following, so
  // MapControls keeps the drag the rest of the time.
  useEffect(() => {
    const el = gl.domElement;
    const isActive = () => performance.now() - manualCam.ts < 160;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !isActive()) return;
      dragging.current = true;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (dragging.current) manualCam.camYaw -= e.movementX * 0.005;
    };
    const up = (e: PointerEvent) => {
      dragging.current = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', up);
    };
  }, [gl]);

  useFrame(() => {
    const active = !!controls && performance.now() - manualCam.ts < 160;
    if (controls) controls.enabled = !active;
    if (!active) {
      engaged.current = false;
      return;
    }
    const dist = 9;
    const cx = manualCam.x - Math.sin(manualCam.camYaw) * dist;
    const cz = manualCam.z - Math.cos(manualCam.camYaw) * dist;
    camera.position.lerp(dest.set(cx, 5.5, cz), engaged.current ? 0.2 : 0.5);
    camera.lookAt(manualCam.x, manualCam.y + 0.6, manualCam.z);
    controls?.target?.set(manualCam.x, 0, manualCam.z); // continuity on release
    engaged.current = true;
  });
  return null;
}
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

type SteerRef = React.RefObject<{ forward: number; strafe: number }>;

/** Walk-mode-style steering: W/S forward/back + A/D strafe, all relative to the
 *  camera's orbit yaw. Active only while manual control is on. */
function useSteerKeys(active: boolean): SteerRef {
  const keys = useRef({ forward: 0, strafe: 0 });
  useEffect(() => {
    keys.current = { forward: 0, strafe: 0 };
    if (!active) return;
    const pressed = new Set<string>();
    const STEER = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    const recompute = () => {
      let forward = 0;
      let strafe = 0;
      if (pressed.has('w') || pressed.has('arrowup')) forward += 1;
      if (pressed.has('s') || pressed.has('arrowdown')) forward -= 1;
      if (pressed.has('d') || pressed.has('arrowright')) strafe -= 1;
      if (pressed.has('a') || pressed.has('arrowleft')) strafe += 1;
      keys.current = { forward, strafe };
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
export function DispatchCouriers({ grid, buildings }: { grid?: LiveCityGrid; buildings?: LiveBuildingLayout[] }) {
  const dispatches = useDispatchStore((s) => s.dispatches);
  const equippedSkin = useDispatchStore((s) => s.equippedSkin);
  const upgrades = useDispatchStore((s) => s.upgrades);
  const manualControl = useDispatchStore((s) => s.manualControl);
  const skin = useMemo(() => skinById(equippedSkin), [equippedSkin]);
  const fx = useMemo(() => upgradeEffects(upgrades), [upgrades]);
  const keysRef = useSteerKeys(manualControl);
  // Building/tree collision for the manually-steered courier (auto couriers
  // already follow street-aligned routes).
  const collisionMap = useMemo(
    () => (grid && buildings ? createWalkCollisionMap(grid, buildings) : null),
    [grid, buildings],
  );

  return (
    <group>
      <SurgeBeacon />
      <DispatchFollowCamera />
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
          collisionMap={collisionMap}
        />
      ))}
    </group>
  );
}

/** Shared emissive skin material (module-scoped so it isn't a new type per frame). */
function SkinMat({ color, rough = 0.22, metal = 0.45 }: { color: THREE.ColorRepresentation; rough?: number; metal?: number }) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} metalness={metal} roughness={rough} toneMapped={false} />;
}

/** The detailed body for each skin shape (composite, not a single primitive). */
function SkinBody({ shape, color }: { shape: DispatchSkinShape; color: THREE.ColorRepresentation }) {
  switch (shape) {
    case 'crystal': // a shard cluster
      return (
        <group>
          <mesh scale={[1, 1.9, 1]}><octahedronGeometry args={[0.24, 0]} /><SkinMat color={color} /></mesh>
          <mesh position={[0.18, -0.1, 0.05]} rotation={[0, 0, 0.5]} scale={[1, 1.3, 1]}><octahedronGeometry args={[0.13, 0]} /><SkinMat color={color} /></mesh>
          <mesh position={[-0.16, -0.05, -0.08]} rotation={[0.3, 0, -0.4]} scale={[1, 1.2, 1]}><octahedronGeometry args={[0.11, 0]} /><SkinMat color={color} /></mesh>
        </group>
      );
    case 'prism': // gyroscope: dodecahedron + ring
      return (
        <group>
          <mesh><dodecahedronGeometry args={[0.3, 0]} /><SkinMat color={color} /></mesh>
          <mesh rotation={[Math.PI / 2.4, 0, 0.3]}><torusGeometry args={[0.42, 0.025, 8, 36]} /><SkinMat color={color} metal={0.7} /></mesh>
        </group>
      );
    case 'flame': // stacked flickering cones
      return (
        <group>
          <mesh position={[0, 0.02, 0]}><coneGeometry args={[0.24, 0.5, 10]} /><SkinMat color={color} rough={0.4} /></mesh>
          <mesh position={[0, 0.34, 0]}><coneGeometry args={[0.14, 0.34, 10]} /><SkinMat color={color} rough={0.4} /></mesh>
        </group>
      );
    case 'drone': // body + dome + 4 rotor rings
      return (
        <group>
          <mesh><boxGeometry args={[0.3, 0.1, 0.3]} /><SkinMat color={color} /></mesh>
          <mesh position={[0, 0.08, 0]}><sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><SkinMat color={color} /></mesh>
          {([[0.26, 0.26], [0.26, -0.26], [-0.26, 0.26], [-0.26, -0.26]] as const).map(([x, z], i) => (
            <mesh key={i} position={[x, 0.02, z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.13, 0.02, 6, 16]} /><SkinMat color={color} metal={0.6} />
            </mesh>
          ))}
        </group>
      );
    case 'satellite': // body + 2 solar panels + dish
      return (
        <group>
          <mesh><boxGeometry args={[0.2, 0.2, 0.34]} /><SkinMat color={color} /></mesh>
          <mesh position={[0.42, 0, 0]} rotation={[0, 0, 0.22]}><boxGeometry args={[0.55, 0.02, 0.26]} /><SkinMat color={color} metal={0.7} /></mesh>
          <mesh position={[-0.42, 0, 0]} rotation={[0, 0, -0.22]}><boxGeometry args={[0.55, 0.02, 0.26]} /><SkinMat color={color} metal={0.7} /></mesh>
          <mesh position={[0, 0.18, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.12, 0.14, 14, 1, true]} /><SkinMat color={color} /></mesh>
        </group>
      );
    default: // orb — faceted core + halo ring
      return (
        <group>
          <mesh><icosahedronGeometry args={[0.3, 0]} /><SkinMat color={color} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.42, 0.02, 8, 32]} /><SkinMat color={color} metal={0.7} /></mesh>
        </group>
      );
  }
}

/** Animated composite courier model per skin: spinning body + pulsing core +
 *  orbiting shards. Distinctly more than a glowing orb. */
function CourierSkin({ shape, color }: { shape: DispatchSkinShape; color: THREE.ColorRepresentation }) {
  const body = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const orbit = useRef<THREE.Group>(null);
  const tRef = useRef(0);
  useFrame((_, dt) => {
    tRef.current += dt;
    const t = tRef.current;
    if (body.current) {
      body.current.rotation.y += dt * (shape === 'drone' ? 3.6 : shape === 'satellite' ? 0.9 : 1.4);
      if (shape === 'flame') body.current.scale.set(1, 1 + Math.sin(t * 9) * 0.16, 1);
    }
    if (core.current) core.current.scale.setScalar(0.8 + Math.sin(t * 4) * 0.22);
    if (orbit.current) orbit.current.rotation.y -= dt * 2.2;
  });
  return (
    <group>
      <group ref={body}>
        <SkinBody shape={shape} color={color} />
      </group>
      <mesh ref={core}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshBasicMaterial color="#fff7e0" transparent opacity={0.95} toneMapped={false} />
      </mesh>
      <group ref={orbit}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.52, Math.sin(a * 2) * 0.1, Math.sin(a) * 0.52]}>
              <tetrahedronGeometry args={[0.07, 0]} />
              <SkinMat color={color} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
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
  collisionMap,
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
  collisionMap: WalkCollisionMap | null;
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
      // Walk-mode style: movement is relative to the camera's orbit yaw — W/S
      // go where you're looking, A/D strafe. The avatar turns to face where it
      // moves; the camera (drag to orbit) follows. No tank-style turning.
      if (!manualPos.current) {
        manualPos.current = { x: dispatch.route[0]!.x, z: dispatch.route[0]!.z };
        manualCam.camYaw = Math.atan2(dispatch.destX - dispatch.route[0]!.x, dispatch.destZ - dispatch.route[0]!.z);
      }
      const mp = manualPos.current;
      const k = keysRef.current ?? { forward: 0, strafe: 0 };
      const SPEED = 17;
      const yaw = manualCam.camYaw;
      let mvx = Math.sin(yaw) * k.forward + Math.cos(yaw) * k.strafe;
      let mvz = Math.cos(yaw) * k.forward - Math.sin(yaw) * k.strafe;
      const len = Math.hypot(mvx, mvz);
      if (len > 0) {
        mvx /= len;
        mvz /= len;
      }
      const desiredX = Math.min(bounds.maxX, Math.max(bounds.minX, mp.x + mvx * SPEED * delta));
      const desiredZ = Math.min(bounds.maxZ, Math.max(bounds.minZ, mp.z + mvz * SPEED * delta));
      if (collisionMap) {
        // Block / slide against buildings + trees (can't drive through them).
        const r = resolveWalkPosition({ x: desiredX, z: desiredZ }, { x: mp.x, z: mp.z }, collisionMap);
        mp.x = r.x;
        mp.z = r.z;
      } else {
        mp.x = desiredX;
        mp.z = desiredZ;
      }
      pose = mp;
      arrived = Math.hypot(dispatch.destX - mp.x, dispatch.destZ - mp.z) < 2.6;
      if (groupRef.current) {
        groupRef.current.position.set(mp.x, 1.1 + Math.sin(t * 3) * 0.12, mp.z);
        if (len > 0) groupRef.current.rotation.y = Math.atan2(mvx, mvz);
      }
      // Publish position for the follow camera (yaw is owned by the camera/drag).
      manualCam.x = mp.x;
      manualCam.y = 1.1;
      manualCam.z = mp.z;
      manualCam.ts = performance.now();
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

      {manual && (
        <group position={[dispatch.destX, 0, dispatch.destZ]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
            <ringGeometry args={[2, 2.7, 36]} />
            <meshBasicMaterial color={accent} transparent opacity={0.65} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 7, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 14, 8, 1, true]} />
            <meshBasicMaterial color={accent} transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      )}

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
