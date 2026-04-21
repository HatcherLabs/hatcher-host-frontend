'use client';

import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { CityAgent, Framework, Category } from './types';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICON,
  FRAMEWORK_COLORS,
  FRAMEWORK_EMISSIVE,
  TIER_HEIGHT,
} from './types';

const DISTRICT_COLS = 5;
// Tighter pad + smaller gap keeps the 25-district grid from pushing
// the far corners past the default camera frustum.
const DISTRICT_SIZE = 52;
const DISTRICT_GAP = 14;

export interface CitySceneHandle {
  flyToDistrict: (category: Category, durationMs?: number) => void;
  flyToAgent: (agentId: string, durationMs?: number) => void;
  flyHome: (durationMs?: number) => void;
  getDistrictPosition: (category: Category) => { x: number; z: number } | null;
}

export type TimeOfDay = 'day' | 'night' | 'auto';

interface Props {
  agents: CityAgent[];
  onHover?: (agent: CityAgent | null) => void;
  onPick?: (agent: CityAgent) => void;
  timeOfDay?: TimeOfDay;
  heatmapOn?: boolean;
  /** Agent IDs created within the current session — animated in with a
      short grow-from-ground motion on first render. */
  freshIds?: Set<string>;
}

// Resolve auto → day/night based on the local hour. 6-18 = day.
export function resolveTimeOfDay(t: TimeOfDay): 'day' | 'night' {
  if (t !== 'auto') return t;
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? 'day' : 'night';
}

interface BuildingData extends CityAgent {
  x: number;
  z: number;
  w: number;
  h: number;
}

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
  for (const a of agents) {
    // If the agent's category isn't in our current bucket list, drop
    // it in the first district so the map still renders every agent.
    // This is only a safety net — backend always normalises to the 25.
    const bucket = byCategory.get(a.category) ?? byCategory.get(CATEGORIES[0])!;
    bucket.push(a);
  }

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

// ─── District labels ─────────────────────────────────────────────

function heatmapColor(ratio: number): THREE.Color {
  // cold blue 0,0.2,0.5 → hot red 1,0.3,0.2
  return new THREE.Color().setRGB(
    0.1 + ratio * 0.9,
    0.2 + (1 - ratio) * 0.3,
    0.6 - ratio * 0.5,
  );
}

function DistrictPad({
  idx,
  category,
  onClick,
  heat,
}: {
  idx: number;
  category: Category;
  onClick?: (c: Category) => void;
  heat?: number; // null/undefined = default grey pad, 0..1 = heatmap value
}) {
  const pos = districtPosition(idx);
  const label = CATEGORY_LABELS[category];
  const icon = CATEGORY_ICON[category];
  const padColor =
    typeof heat === 'number' ? heatmapColor(heat).getHex() : 0x111827;
  const padOpacity = typeof heat === 'number' ? 0.85 : 0.5;

  const sprite = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(5,8,20,0.88)';
    ctx.fillRect(0, 0, 640, 128);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 632, 120);
    // Emoji on the left — slightly larger than label so it reads at
    // distance even without pressing into the label.
    ctx.font = '72px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(icon, 72, 64);
    ctx.font = 'bold 42px "Press Start 2P", monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), 140, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: tex, depthTest: false });
  }, [label, icon]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pos.x, 0.02, pos.z]}>
        <planeGeometry args={[DISTRICT_SIZE, DISTRICT_SIZE]} />
        <meshStandardMaterial
          color={padColor}
          roughness={0.9}
          transparent
          opacity={padOpacity}
          emissive={typeof heat === 'number' ? padColor : 0x000000}
          emissiveIntensity={typeof heat === 'number' ? 0.35 : 0}
        />
      </mesh>
      <sprite
        position={[pos.x, 30, pos.z]}
        scale={[24, 4.8, 1]}
        material={sprite}
        onClick={(e) => { e.stopPropagation(); onClick?.(category); }}
      />
    </group>
  );
}

// ─── Avatar billboard (plane with user avatar texture, faces camera) ─

const AVATAR_CACHE = new Map<string, THREE.Texture>();
function loadAvatar(url: string): THREE.Texture | null {
  if (AVATAR_CACHE.has(url)) return AVATAR_CACHE.get(url)!;
  try {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    AVATAR_CACHE.set(url, tex);
    return tex;
  } catch {
    return null;
  }
}

// Fallback: render the agent's initial on a small canvas texture.
const INITIAL_CACHE = new Map<string, THREE.Texture>();
function loadInitialTexture(letter: string, framework: Framework): THREE.Texture {
  const key = `${framework}:${letter}`;
  if (INITIAL_CACHE.has(key)) return INITIAL_CACHE.get(key)!;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const bg = `#${FRAMEWORK_COLORS[framework].toString(16).padStart(6, '0')}`;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 122, 122);
  ctx.font = 'bold 72px "Press Start 2P", monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  INITIAL_CACHE.set(key, tex);
  return tex;
}

function AvatarBillboard({ b }: { b: BuildingData }) {
  const texture = useMemo(() => {
    if (b.avatarUrl) {
      const t = loadAvatar(b.avatarUrl);
      if (t) return t;
    }
    const letter = (b.name[0] ?? '?').toUpperCase();
    return loadInitialTexture(letter, b.framework);
  }, [b.avatarUrl, b.name, b.framework]);

  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: texture,
        depthTest: true,
        depthWrite: false,
      }),
    [texture],
  );

  // Slightly larger than the building width so the avatar is readable
  // even from the default camera distance (~300 units out).
  const size = Math.max(2.6, b.w * 1.6);
  return <sprite position={[b.x, b.h + size * 0.6, b.z]} scale={[size, size, 1]} material={mat} />;
}

// ─── Volumetric-ish cloud layer ──────────────────────────────────
// A stack of two large translucent planes with a procedural noise
// texture that pan in opposite directions. Adds a massive amount of
// perceived depth for essentially zero performance cost.

function makeNoiseTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Smooth blotches via sampled sine — cheap and seamless enough
      // when the plane is panned continuously.
      const n =
        Math.sin(x * 0.06) * Math.cos(y * 0.06) +
        Math.sin(x * 0.02 + y * 0.03) * 0.8 +
        Math.sin(x * 0.11 - y * 0.07) * 0.5;
      const v = Math.max(0, Math.min(1, (n + 2) / 4));
      const alpha = Math.pow(v, 3.5) * 200; // long tail so clouds look wispy
      const i = (y * size + x) * 4;
      image.data[i] = 180;
      image.data[i + 1] = 200;
      image.data[i + 2] = 255;
      image.data[i + 3] = alpha;
    }
  }
  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Streets between districts ───────────────────────────────────
// Two orthogonal grids of thin emissive strips sit just above the
// ground, one per axis. Positions are derived from the district grid
// so roads always land between pads instead of cutting through them.

function Streets() {
  const totalRows = Math.ceil(CATEGORIES.length / DISTRICT_COLS);
  const step = DISTRICT_SIZE + DISTRICT_GAP;
  const longEdge = Math.max(DISTRICT_COLS, totalRows) * step;

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x1e3a8a,
        transparent: true,
        opacity: 0.55,
      }),
    [],
  );

  // Vertical roads: one per gap between columns, plus edges.
  const verticalXs: number[] = [];
  for (let c = 0; c <= DISTRICT_COLS; c++) {
    verticalXs.push((c - DISTRICT_COLS / 2) * step);
  }
  const horizontalZs: number[] = [];
  for (let r = 0; r <= totalRows; r++) {
    horizontalZs.push((r - totalRows / 2) * step);
  }

  return (
    <group position={[0, 0.03, 0]}>
      {verticalXs.map((x, i) => (
        <mesh key={`v${i}`} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, longEdge]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
      {horizontalZs.map((z, i) => (
        <mesh key={`h${i}`} position={[0, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[longEdge, 1.2]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function CloudLayer() {
  const texRef = useRef<THREE.Texture | null>(null);
  const mat1Ref = useRef<THREE.MeshBasicMaterial | null>(null);
  const mat2Ref = useRef<THREE.MeshBasicMaterial | null>(null);

  const { tex1, tex2 } = useMemo(() => {
    const t1 = makeNoiseTexture();
    const t2 = makeNoiseTexture();
    t1.repeat.set(2, 2);
    t2.repeat.set(1.5, 1.5);
    texRef.current = t1;
    return { tex1: t1, tex2: t2 };
  }, []);

  useFrame((_, dt) => {
    if (tex1 && mat1Ref.current) {
      tex1.offset.x += dt * 0.004;
      tex1.offset.y += dt * 0.002;
    }
    if (tex2 && mat2Ref.current) {
      tex2.offset.x -= dt * 0.002;
      tex2.offset.y += dt * 0.001;
    }
  });

  return (
    <group>
      <mesh position={[0, 120, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1400, 1400]} />
        <meshBasicMaterial
          ref={mat1Ref}
          map={tex1}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1600, 1600]} />
        <meshBasicMaterial
          ref={mat2Ref}
          map={tex2}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Sparkle particles above running buildings ───────────────────

function SparkleField({ positions }: { positions: Array<[number, number, number]> }) {
  const geomRef = useRef<THREE.BufferGeometry>(null);

  const { basePositions, phases } = useMemo(() => {
    const bp = new Float32Array(positions.length * 3);
    const ph = new Float32Array(positions.length);
    positions.forEach((p, i) => {
      bp[i * 3] = p[0];
      bp[i * 3 + 1] = p[1];
      bp[i * 3 + 2] = p[2];
      ph[i] = Math.random() * Math.PI * 2;
    });
    return { basePositions: bp, phases: ph };
  }, [positions]);

  useFrame((state) => {
    if (!geomRef.current) return;
    const t = state.clock.elapsedTime;
    const arr = geomRef.current.attributes.position.array as Float32Array;
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      arr[i * 3] = basePositions[i * 3] + Math.cos(t * 1.5 + phase) * 0.35;
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + ((Math.sin(t * 1.2 + phase) + 1) / 2) * 1.2;
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + Math.sin(t * 1.7 + phase) * 0.35;
    }
    geomRef.current.attributes.position.needsUpdate = true;
  });

  if (!positions.length) return null;

  return (
    <points>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[basePositions.slice(), 3]}
          count={positions.length}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.6}
        color={0xfde68a}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Building meshes ─────────────────────────────────────────────

function Buildings({
  data,
  onHover,
  onPick,
  dim = false,
  freshIds,
}: {
  data: BuildingData[];
  onHover?: (agent: CityAgent | null) => void;
  onPick?: (agent: CityAgent) => void;
  dim?: boolean;
  freshIds?: Set<string>;
}) {
  const roofMats = useMemo(() => {
    const m: Record<Framework, THREE.Material> = {} as Record<Framework, THREE.Material>;
    (Object.keys(FRAMEWORK_COLORS) as Framework[]).forEach((fw) => {
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

  const bodyMats = useMemo(() => {
    const mats = data.map(bodyMaterial);
    if (dim) {
      mats.forEach((m) => {
        (m as THREE.MeshStandardMaterial).transparent = true;
        (m as THREE.MeshStandardMaterial).opacity = 0.18;
      });
    }
    return mats;
  }, [data, dim]);

  // Emissive strip that runs around the body of a running building —
  // reads as lit windows. Shared material since colour is fixed.
  const windowStripMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        emissive: 0xfbbf24,
        emissiveIntensity: 1.4,
        roughness: 0.3,
      }),
    [],
  );

  const antennaMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6, metalness: 0.9 }),
    [],
  );

  return (
    <group>
      {data.map((b, i) => (
        <FreshInGroup key={b.id} fresh={freshIds?.has(b.id) ?? false}>
          {/* Body */}
          <mesh
            position={[b.x, b.h / 2, b.z]}
            scale={[b.w, b.h, b.w]}
            material={bodyMats[i]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover?.(b);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              onHover?.(null);
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPick?.(b);
            }}
          >
            <boxGeometry args={[1, 1, 1]} />
          </mesh>

          {/* Window band on running buildings — two emissive stripes
              at ~40% and ~75% of the body height, all four sides. */}
          {b.status === 'running' && b.h > 4 && (
            <>
              <mesh
                position={[b.x, b.h * 0.4, b.z]}
                scale={[b.w * 1.02, 0.18, b.w * 1.02]}
                material={windowStripMat}
              >
                <boxGeometry args={[1, 1, 1]} />
              </mesh>
              {b.h > 8 && (
                <mesh
                  position={[b.x, b.h * 0.75, b.z]}
                  scale={[b.w * 1.02, 0.18, b.w * 1.02]}
                  material={windowStripMat}
                >
                  <boxGeometry args={[1, 1, 1]} />
                </mesh>
              )}
            </>
          )}

          {/* Roof geometry varies per framework so the skyline isn't flat. */}
          <FrameworkRoof b={b} mat={roofMats[b.framework]} />

          {/* Rooftop detail (antenna / dish). Only on taller buildings
              so tiny free-tier shacks don't get hats. */}
          {b.h > 6 && (
            <mesh
              position={[b.x, b.h + roofHeight(b) + 1.4, b.z + b.w * 0.1]}
              material={antennaMat}
            >
              <cylinderGeometry args={[0.05, 0.05, 2.4, 6]} />
            </mesh>
          )}
          {b.h > 10 && (
            <mesh
              position={[b.x - b.w * 0.25, b.h + roofHeight(b) + 0.35, b.z]}
              material={antennaMat}
              rotation={[Math.PI / 2.4, 0, 0]}
            >
              <cylinderGeometry args={[b.w * 0.18, b.w * 0.18, 0.1, 12]} />
            </mesh>
          )}

          {/* Door — small dark panel at the base */}
          <mesh
            position={[b.x, 0.55, b.z + b.w * 0.5 + 0.01]}
            scale={[b.w * 0.28, 1.1, 0.05]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={0x0a0e1a} roughness={0.9} />
          </mesh>

          {b.mine && (
            <>
              <mesh
                position={[b.x, b.h / 2, b.z]}
                scale={[b.w * 1.05, b.h * 1.02, b.w * 1.05]}
                material={halo}
              >
                <boxGeometry args={[1, 1, 1]} />
              </mesh>
              <mesh position={[b.x, b.h + 30, b.z]} material={beam}>
                <cylinderGeometry args={[b.w * 0.1, b.w * 0.1, 60, 8, 1, true]} />
              </mesh>
            </>
          )}
          {b.tier === 4 && (
            <mesh position={[b.x, b.h + roofHeight(b) + 0.9, b.z]}>
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
          <AvatarBillboard b={b} />
        </FreshInGroup>
      ))}
    </group>
  );
}

// Tiny helper that slides a group up from Y=-h to Y=0 over ~1.2s when
// marked fresh. Skipped entirely for non-fresh agents so we don't pay
// the useFrame cost for hundreds of buildings after the initial paint.
function FreshInGroup({
  fresh,
  children,
}: {
  fresh: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const startMsRef = useRef<number | null>(null);
  const doneRef = useRef<boolean>(!fresh);

  useFrame(() => {
    if (doneRef.current) return;
    if (!ref.current) return;
    if (startMsRef.current === null) startMsRef.current = performance.now();
    const elapsed = performance.now() - startMsRef.current;
    const DURATION = 1200;
    const progress = Math.min(1, elapsed / DURATION);
    const eased = 1 - Math.pow(1 - progress, 3);
    // translate the whole group from below ground plane to natural rest.
    ref.current.position.y = -80 * (1 - eased);
    if (progress >= 1) {
      ref.current.position.y = 0;
      doneRef.current = true;
    }
  });

  return <group ref={ref}>{children}</group>;
}

// How tall the framework-specific roof adds on top of the body. Used
// to place antennas / crown above it without intersecting.
function roofHeight(b: BuildingData): number {
  switch (b.framework) {
    case 'hermes':   return b.w * 0.55; // pitched
    case 'elizaos':  return b.w * 0.5;  // dome
    case 'milady':   return b.w * 0.9;  // spire
    case 'openclaw': return 0.35;       // flat with water tank
  }
}

/**
 * Framework-specific roof silhouette. The building body is a shared box
 * so we can unify interactions; the roof on top carries the "character":
 *
 *   openclaw  flat slab + small water tank
 *   hermes    pitched four-sided pyramid (ConeGeometry with radialSegments=4)
 *   elizaos   low dome (SphereGeometry hemisphere)
 *   milady    tall spire (ConeGeometry with radialSegments=6)
 */
function FrameworkRoof({ b, mat }: { b: BuildingData; mat: THREE.Material }) {
  const baseY = b.h;
  switch (b.framework) {
    case 'openclaw':
      return (
        <>
          <mesh position={[b.x, baseY + 0.09, b.z]} scale={[b.w, 1, b.w]} material={mat}>
            <boxGeometry args={[1.06, 0.18, 1.06]} />
          </mesh>
          {/* Water tank offset from centre */}
          <mesh
            position={[b.x + b.w * 0.15, baseY + 0.55, b.z - b.w * 0.1]}
            material={mat}
          >
            <cylinderGeometry args={[b.w * 0.2, b.w * 0.2, 0.6, 8]} />
          </mesh>
        </>
      );
    case 'hermes':
      return (
        <mesh
          position={[b.x, baseY + b.w * 0.3, b.z]}
          rotation={[0, Math.PI / 4, 0]}
          material={mat}
        >
          <coneGeometry args={[b.w * 0.82, b.w * 0.6, 4]} />
        </mesh>
      );
    case 'elizaos':
      return (
        <mesh
          position={[b.x, baseY, b.z]}
          material={mat}
          scale={[1, 0.6, 1]}
        >
          <sphereGeometry args={[b.w * 0.58, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      );
    case 'milady':
      return (
        <mesh position={[b.x, baseY + b.w * 0.45, b.z]} material={mat}>
          <coneGeometry args={[b.w * 0.45, b.w * 0.9, 6]} />
        </mesh>
      );
  }
}

// ─── Camera fly-to controller ────────────────────────────────────

interface FlyState {
  fromPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPos: THREE.Vector3;
  toTarget: THREE.Vector3;
  startMs: number;
  durationMs: number;
}

type ControlsWithTarget = {
  target: THREE.Vector3;
  enabled: boolean;
  update: () => void;
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function SceneInner({
  agents,
  onHover,
  onPick,
  timeOfDay = 'auto',
  heatmapOn = false,
  freshIds,
  sceneApiRef,
}: Props & { sceneApiRef: React.MutableRefObject<CitySceneHandle | null> }) {
  const resolvedTime = resolveTimeOfDay(timeOfDay);
  const isNight = resolvedTime === 'night';

  // Per-district heat value for the heatmap overlay — running agents /
  // district population. Computed once per agents change.
  const heatByCategory = useMemo(() => {
    const running: Record<string, number> = {};
    const total: Record<string, number> = {};
    for (const a of agents) {
      total[a.category] = (total[a.category] ?? 0) + 1;
      if (a.status === 'running') running[a.category] = (running[a.category] ?? 0) + 1;
    }
    const max = Math.max(1, ...Object.values(running));
    const out: Record<string, number> = {};
    for (const c of CATEGORIES) {
      out[c] = (running[c] ?? 0) / max;
    }
    return out;
  }, [agents]);
  const buildings = useMemo(() => layoutBuildings(agents), [agents]);
  const sparklePositions = useMemo<Array<[number, number, number]>>(
    () =>
      buildings
        .filter((b) => b.status === 'running')
        .flatMap((b) => {
          // 2 sparkles per running building, offset randomly above the roof.
          const y = b.h + 1.6;
          return [
            [b.x - 0.4, y, b.z + 0.2],
            [b.x + 0.3, y + 0.5, b.z - 0.3],
          ] as Array<[number, number, number]>;
        }),
    [buildings],
  );

  const { camera } = useThree();
  const controlsRef = useRef<ControlsWithTarget | null>(null);
  const flyStateRef = useRef<FlyState | null>(null);

  // Default camera position — also the target for "fly home".
  const HOME_POS = useMemo(() => new THREE.Vector3(220, 180, 220), []);
  const HOME_TARGET = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  const sunRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (sunRef.current) {
      sunRef.current.position.x = Math.cos(t * 0.05) * 140;
      sunRef.current.position.z = Math.sin(t * 0.05) * 140;
    }

    // Advance active fly-to animation.
    const fs = flyStateRef.current;
    if (fs) {
      const now = performance.now();
      const progress = Math.min(1, (now - fs.startMs) / fs.durationMs);
      const eased = easeInOutCubic(progress);
      camera.position.lerpVectors(fs.fromPos, fs.toPos, eased);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(fs.fromTarget, fs.toTarget, eased);
        controlsRef.current.update();
      }
      if (progress >= 1) {
        flyStateRef.current = null;
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    }
  });

  useEffect(() => {
    camera.position.copy(HOME_POS);
    camera.lookAt(HOME_TARGET);
  }, [camera, HOME_POS, HOME_TARGET]);

  // Expose a small imperative API for HUD buttons (legend click, tour,
  // deep-link focus). Keeping it outside React state avoids rerenders
  // on every camera move.
  useImperativeHandle(
    sceneApiRef,
    () => {
      function flyTo(toPos: THREE.Vector3, toTarget: THREE.Vector3, durationMs: number) {
        const fromPos = camera.position.clone();
        const fromTarget =
          controlsRef.current?.target.clone() ?? new THREE.Vector3(0, 0, 0);
        flyStateRef.current = {
          fromPos,
          fromTarget,
          toPos: toPos.clone(),
          toTarget: toTarget.clone(),
          startMs: performance.now(),
          durationMs,
        };
        if (controlsRef.current) controlsRef.current.enabled = false;
      }
      return {
        flyToDistrict(category, durationMs = 1200) {
          const idx = CATEGORIES.indexOf(category);
          if (idx < 0) return;
          const p = districtPosition(idx);
          flyTo(
            new THREE.Vector3(p.x + 40, 60, p.z + 40),
            new THREE.Vector3(p.x, 8, p.z),
            durationMs,
          );
        },
        flyToAgent(agentId, durationMs = 1400) {
          const b = buildings.find((x) => x.id === agentId);
          if (!b) return;
          flyTo(
            new THREE.Vector3(b.x + 18, b.h + 18, b.z + 18),
            new THREE.Vector3(b.x, b.h / 2, b.z),
            durationMs,
          );
        },
        flyHome(durationMs = 1400) {
          flyTo(HOME_POS, HOME_TARGET, durationMs);
        },
        getDistrictPosition(category) {
          const idx = CATEGORIES.indexOf(category);
          if (idx < 0) return null;
          return districtPosition(idx);
        },
      };
    },
    [camera, buildings, HOME_POS, HOME_TARGET],
  );

  // Pre-compute lighting for day vs night. Night is the hero look —
  // darker ground, colder ambient, dim sun standing in for moonlight,
  // which lets the bloom pass and emissive windows carry the image.
  const bgColor = isNight ? 0x040610 : 0x0a1325;
  const fogNear = isNight ? 160 : 220;
  const fogFar = isNight ? 620 : 900;
  const ambientColor = isNight ? 0x6677aa : 0xaabbcc;
  const ambientIntensity = isNight ? 0.18 : 0.55;
  const sunColor = isNight ? 0x8fa4ff : 0xfff4d6;
  const sunIntensity = isNight ? 0.3 : 1.1;
  const hemiSky = isNight ? 0x1e293b : 0x7799ff;

  return (
    <>
      <fog attach="fog" args={[bgColor, fogNear, fogFar]} />
      <color attach="background" args={[bgColor]} />

      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        ref={sunRef}
        position={[100, 200, 80]}
        intensity={sunIntensity}
        color={sunColor}
      />
      <hemisphereLight args={[hemiSky, 0x1a0f2a, isNight ? 0.15 : 0.4]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color={0x0a0e1a} roughness={0.95} />
      </mesh>
      <gridHelper args={[1500, 150, 0x1f2937, 0x111827]} position={[0, 0.01, 0]} />
      <Streets />

      {CATEGORIES.map((cat, i) => (
        <DistrictPad
          key={cat}
          idx={i}
          category={cat}
          onClick={(c) => sceneApiRef.current?.flyToDistrict(c)}
          heat={heatmapOn ? heatByCategory[cat] : undefined}
        />
      ))}

      <Buildings
        data={buildings}
        onHover={onHover}
        onPick={onPick}
        dim={heatmapOn}
        freshIds={freshIds}
      />
      <SparkleField positions={sparklePositions} />
      <CloudLayer />

      <OrbitControls
        ref={(r) => {
          controlsRef.current = r as unknown as ControlsWithTarget;
        }}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI * 0.48}
        minDistance={10}
        maxDistance={800}
      />

      {/* Bloom pass — biases toward emissive surfaces (window strips,
          Milady spires, gold halos, founding crowns) so the city reads
          cinematic at any framerate. Luminance threshold keeps the
          ground plane and matte bodies from blooming. */}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.15}
          mipmapBlur
          radius={0.8}
        />
      </EffectComposer>
    </>
  );
}

export const CityScene = forwardRef<CitySceneHandle, Props>(function CityScene(
  { agents, onHover, onPick, timeOfDay, heatmapOn, freshIds },
  ref,
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const sceneApiRef = useRef<CitySceneHandle | null>(null);
  useImperativeHandle(ref, () => ({
    flyToDistrict: (c, d) => sceneApiRef.current?.flyToDistrict(c, d),
    flyToAgent: (id, d) => sceneApiRef.current?.flyToAgent(id, d),
    flyHome: (d) => sceneApiRef.current?.flyHome(d),
    getDistrictPosition: (c) => sceneApiRef.current?.getDistrictPosition(c) ?? null,
  }));

  if (!mounted) return null;

  return (
    <Canvas
      camera={{ fov: 55, near: 0.1, far: 2500, position: [220, 180, 220] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      <SceneInner
        agents={agents}
        onHover={onHover}
        onPick={onPick}
        timeOfDay={timeOfDay}
        heatmapOn={heatmapOn}
        freshIds={freshIds}
        sceneApiRef={sceneApiRef}
      />
    </Canvas>
  );
});
