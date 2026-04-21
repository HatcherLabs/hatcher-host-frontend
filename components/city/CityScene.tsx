'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { CityAgent, Framework, Category } from './types';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  FRAMEWORK_COLORS,
  FRAMEWORK_EMISSIVE,
  TIER_HEIGHT,
} from './types';

const DISTRICT_COLS = 5;
const DISTRICT_SIZE = 60;
const DISTRICT_GAP = 18;

interface Props {
  agents: CityAgent[];
  onHover?: (agent: CityAgent | null) => void;
  onPick?: (agent: CityAgent) => void;
}

interface BuildingData extends CityAgent {
  x: number;
  z: number;
  w: number;
  h: number;
}

// Cheap seeded RNG — same layout every time for the same agent list.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function districtPosition(idx: number): { x: number; z: number } {
  const col = idx % DISTRICT_COLS;
  const row = Math.floor(idx / DISTRICT_COLS);
  const totalRows = Math.ceil(CATEGORIES.length / DISTRICT_COLS);
  const x = (col - (DISTRICT_COLS - 1) / 2) * (DISTRICT_SIZE + DISTRICT_GAP);
  const z = (row - (totalRows - 1) / 2) * (DISTRICT_SIZE + DISTRICT_GAP);
  return { x, z };
}

function layoutBuildings(agents: CityAgent[]): BuildingData[] {
  const byCategory = new Map<Category, CityAgent[]>();
  for (const c of CATEGORIES) byCategory.set(c, []);
  for (const a of agents) (byCategory.get(a.category) ?? byCategory.get('other')!).push(a);

  const out: BuildingData[] = [];
  CATEGORIES.forEach((cat, di) => {
    const list = byCategory.get(cat) ?? [];
    if (!list.length) return;
    const pos = districtPosition(di);
    const cols = Math.max(1, Math.ceil(Math.sqrt(list.length)));
    const spacing = (DISTRICT_SIZE - 6) / cols;
    list.forEach((a, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitter = 0.15 * spacing;
      const rx = hashStr(a.id + ':x');
      const rz = hashStr(a.id + ':z');
      const rh = hashStr(a.id + ':h');
      const bx = pos.x - DISTRICT_SIZE / 2 + 3 + col * spacing + spacing / 2 + (rx - 0.5) * jitter;
      const bz = pos.z - DISTRICT_SIZE / 2 + 3 + row * spacing + spacing / 2 + (rz - 0.5) * jitter;
      const bw = Math.min(spacing * 0.72, 3.2);
      const baseH = TIER_HEIGHT[a.tier] ?? 3;
      const bh = baseH * (0.85 + rh * 0.3);
      out.push({ ...a, x: bx, z: bz, w: bw, h: bh });
    });
  });
  return out;
}

function DistrictPad({ idx, label }: { idx: number; label: string }) {
  const pos = districtPosition(idx);
  const sprite = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(5,8,20,0.88)';
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 504, 88);
    ctx.font = 'bold 42px "Press Start 2P", monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), 256, 48);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    return mat;
  }, [label]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pos.x, 0.02, pos.z]}>
        <planeGeometry args={[DISTRICT_SIZE, DISTRICT_SIZE]} />
        <meshStandardMaterial color={0x111827} roughness={0.9} transparent opacity={0.5} />
      </mesh>
      <sprite position={[pos.x, 30, pos.z]} scale={[20, 4, 1]} material={sprite} />
    </group>
  );
}

function Buildings({
  data,
  onHover,
  onPick,
}: {
  data: BuildingData[];
  onHover?: (agent: CityAgent | null) => void;
  onPick?: (agent: CityAgent) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const roofMats = useMemo(() => {
    const m: Record<Framework, THREE.Material> = {} as Record<Framework, THREE.Material>;
    (Object.keys(FRAMEWORK_COLORS) as Framework[]).forEach(fw => {
      m[fw] = new THREE.MeshStandardMaterial({
        color: FRAMEWORK_COLORS[fw],
        emissive: FRAMEWORK_EMISSIVE[fw],
        emissiveIntensity: 0.7,
        roughness: 0.35,
        metalness: 0.3,
      });
    });
    return m;
  }, []);

  const halo = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.85,
        wireframe: true,
      }),
    [],
  );
  const beam = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
      }),
    [],
  );

  function bodyMaterial(b: BuildingData): THREE.Material {
    const fw = b.framework;
    const base = FRAMEWORK_COLORS[fw];
    const glow = FRAMEWORK_EMISSIVE[fw];
    const isRunning = b.status === 'running';
    const isPaused = b.status === 'paused';
    const isCrashed = b.status === 'crashed';
    return new THREE.MeshStandardMaterial({
      color: isCrashed ? 0x7f1d1d : isPaused ? 0x334155 : base,
      emissive: isRunning ? glow : 0x000000,
      emissiveIntensity: isRunning ? 0.28 : 0,
      roughness: 0.7,
      metalness: 0.15,
    });
  }

  // Pre-build body materials so every mesh doesn't allocate a new one
  // on every render.
  const bodyMats = useMemo(() => data.map(bodyMaterial), [data]);

  return (
    <group ref={groupRef}>
      {data.map((b, i) => (
        <group key={b.id}>
          <mesh
            position={[b.x, b.h / 2, b.z]}
            scale={[b.w, b.h, b.w]}
            material={bodyMats[i]}
            onPointerOver={(e) => { e.stopPropagation(); onHover?.(b); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { onHover?.(null); document.body.style.cursor = 'auto'; }}
            onClick={(e) => { e.stopPropagation(); onPick?.(b); }}
          >
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh position={[b.x, b.h + 0.09, b.z]} scale={[b.w, 1, b.w]} material={roofMats[b.framework]}>
            <boxGeometry args={[1.06, 0.18, 1.06]} />
          </mesh>
          {b.mine && (
            <>
              <mesh position={[b.x, b.h / 2, b.z]} scale={[b.w * 1.05, b.h * 1.02, b.w * 1.05]} material={halo}>
                <boxGeometry args={[1, 1, 1]} />
              </mesh>
              <mesh position={[b.x, b.h + 30, b.z]} material={beam}>
                <cylinderGeometry args={[b.w * 0.1, b.w * 0.1, 60, 8, 1, true]} />
              </mesh>
            </>
          )}
          {b.tier === 4 && (
            <mesh position={[b.x, b.h + 0.7, b.z]}>
              <coneGeometry args={[b.w * 0.55, b.w * 0.8, 5]} />
              <meshStandardMaterial
                color={0xfbbf24}
                emissive={0xf59e0b}
                emissiveIntensity={0.6}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function SceneInner({ agents, onHover, onPick }: Props) {
  const buildings = useMemo(() => layoutBuildings(agents), [agents]);
  const { camera } = useThree();

  // Gentle sun rotation.
  const sunRef = useRef<THREE.DirectionalLight>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (sunRef.current) {
      sunRef.current.position.x = Math.cos(t * 0.05) * 140;
      sunRef.current.position.z = Math.sin(t * 0.05) * 140;
    }
  });

  useEffect(() => {
    camera.position.set(220, 180, 220);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <fog attach="fog" args={[0x050814, 180, 700]} />
      <color attach="background" args={[0x050814]} />

      <ambientLight intensity={0.45} color={0xaabbcc} />
      <directionalLight ref={sunRef} position={[100, 200, 80]} intensity={0.9} color={0xfff4d6} />
      <hemisphereLight args={[0x7799ff, 0x1a0f2a, 0.35]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color={0x0a0e1a} roughness={0.95} />
      </mesh>
      <gridHelper args={[1500, 150, 0x1f2937, 0x111827]} position={[0, 0.01, 0]} />

      {CATEGORIES.map((cat, i) => (
        <DistrictPad key={cat} idx={i} label={CATEGORY_LABELS[cat]} />
      ))}

      <Buildings data={buildings} onHover={onHover} onPick={onPick} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI * 0.48}
        minDistance={50}
        maxDistance={800}
      />
    </>
  );
}

export function CityScene({ agents, onHover, onPick }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <Canvas
      camera={{ fov: 55, near: 0.1, far: 2500, position: [220, 180, 220] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      <SceneInner agents={agents} onHover={onHover} onPick={onPick} />
    </Canvas>
  );
}
