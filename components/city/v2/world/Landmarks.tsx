'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Category } from '@/components/city/types';
import { CATEGORIES } from '@/components/city/types';
import { districtPosition } from './grid';

const LANDMARK_Y = 0.1;

/** Color × emissive palette per category. Emissive is amplified by
 *  Bloom so each landmark reads as a neon beacon from across the
 *  city. */
interface Accent {
  color: number;
  emissive: number;
}
const ACCENT: Record<Category, Accent> = {
  personal:           { color: 0x7c8aa5, emissive: 0x3f4d66 },
  productivity:       { color: 0x10b981, emissive: 0x0d8360 },
  automation:         { color: 0xff8c42, emissive: 0xc0521e },
  voice:              { color: 0xf472b6, emissive: 0xc43f86 },
  moltbook:           { color: 0x8b5cf6, emissive: 0x6b3ed4 },
  marketing:          { color: 0xec4899, emissive: 0xc32d7d },
  business:           { color: 0x3b82f6, emissive: 0x1e50c9 },
  'customer-success': { color: 0x14b8a6, emissive: 0x0a8c80 },
  hr:                 { color: 0x38bdf8, emissive: 0x1b8ec8 },
  freelance:          { color: 0x84cc16, emissive: 0x5f950a },
  creative:           { color: 0xff77a8, emissive: 0xd04585 },
  development:        { color: 0x22c55e, emissive: 0x11893e },
  data:               { color: 0xa78bfa, emissive: 0x6e4fe0 },
  devops:             { color: 0xea580c, emissive: 0xb63d00 },
  ollama:             { color: 0xfbbf24, emissive: 0xc38b00 },
  finance:            { color: 0xfacc15, emissive: 0xc49600 },
  ecommerce:          { color: 0xf59e0b, emissive: 0xc47500 },
  saas:               { color: 0x06b6d4, emissive: 0x007993 },
  security:           { color: 0xdc2626, emissive: 0x9b0d0d },
  compliance:         { color: 0x94a3b8, emissive: 0x4e5c70 },
  education:          { color: 0x3b82f6, emissive: 0x1e50c9 },
  healthcare:         { color: 0xef4444, emissive: 0xb22222 },
  'real-estate':      { color: 0x8b5cf6, emissive: 0x6b3ed4 },
  'supply-chain':     { color: 0xa16207, emissive: 0x724400 },
  legal:              { color: 0xe2e8f0, emissive: 0x7d8da5 },
};

interface CommonProps {
  accent: Accent;
}

/**
 * 25 per-district landmark arrangements. Each is a small sculpt of
 * primitives that visually says "this is the X district" at survey
 * distance. Later phases can swap any of these for a richer
 * Quaternius/Meshy asset — the external contract (one
 * `<Landmark category=... x=... z=.../>`) stays.
 */
export function Landmarks() {
  return (
    <group>
      {CATEGORIES.map((cat, idx) => {
        const pos = districtPosition(idx);
        return (
          <group key={cat} position={[pos.x, LANDMARK_Y, pos.z]}>
            <Landmark category={cat} />
          </group>
        );
      })}
    </group>
  );
}

function Landmark({ category }: { category: Category }) {
  const accent = ACCENT[category];
  switch (category) {
    case 'personal':        return <HouseWithSign accent={accent} />;
    case 'productivity':    return <OfficeWithCheckmark accent={accent} />;
    case 'automation':      return <Factory accent={accent} />;
    case 'voice':           return <RadioTower accent={accent} />;
    case 'moltbook':        return <Library accent={accent} />;
    case 'marketing':       return <Billboard accent={accent} />;
    case 'business':        return <CorporateTower accent={accent} />;
    case 'customer-success':return <ChatBubbleTower accent={accent} />;
    case 'hr':              return <Office accent={accent} />;
    case 'freelance':       return <OpenCoworking accent={accent} />;
    case 'creative':        return <GalleryWithSculpture accent={accent} />;
    case 'development':     return <TerminalTower accent={accent} />;
    case 'data':            return <DataCenter accent={accent} />;
    case 'devops':          return <ControlTower accent={accent} />;
    case 'ollama':          return <LlamaStatue accent={accent} />;
    case 'finance':         return <Skyscraper$ accent={accent} />;
    case 'ecommerce':       return <Warehouse accent={accent} />;
    case 'saas':            return <CloudTower accent={accent} />;
    case 'security':        return <Fortress accent={accent} />;
    case 'compliance':      return <Courthouse accent={accent} />;
    case 'education':       return <Campus accent={accent} />;
    case 'healthcare':      return <Hospital accent={accent} />;
    case 'real-estate':     return <Villa accent={accent} />;
    case 'supply-chain':    return <LogisticsHub accent={accent} />;
    case 'legal':           return <ScalesStatue accent={accent} />;
    default:                return <Pillar accent={accent} />;
  }
}

// ─── Shared material helpers ─────────────────────────────────────

function useAccentMaterial(accent: Accent, emissiveMul = 1) {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: accent.color,
        emissive: accent.emissive,
        emissiveIntensity: emissiveMul,
        roughness: 0.45,
        metalness: 0.3,
      }),
    [accent, emissiveMul],
  );
}

function useNeutralMaterial(tone: 'dark' | 'mid' | 'bright' = 'mid') {
  const hex = tone === 'dark' ? 0x1a2030 : tone === 'bright' ? 0x888ea3 : 0x3a4154;
  return useMemo(
    () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0.35 }),
    [hex],
  );
}

// ─── Landmarks — each is roughly 8-14u tall so it reads at survey
//     distance without dominating the 22u skyscraper max. ────────

function Pillar({ accent }: CommonProps) {
  const m = useAccentMaterial(accent);
  return (
    <mesh position={[0, 4, 0]} material={m}>
      <cylinderGeometry args={[1.2, 1.8, 8, 12]} />
    </mesh>
  );
}

function HouseWithSign({ accent }: CommonProps) {
  const wall = useNeutralMaterial('mid');
  const sign = useAccentMaterial(accent, 2.5);
  return (
    <group>
      <mesh position={[0, 2, 0]} material={wall}>
        <boxGeometry args={[5, 4, 5]} />
      </mesh>
      {/* pitched roof */}
      <mesh position={[0, 5, 0]} rotation={[0, Math.PI / 4, 0]} material={wall}>
        <coneGeometry args={[4.2, 3, 4]} />
      </mesh>
      {/* "HOME" sign */}
      <mesh position={[0, 8, 0]} material={sign}>
        <boxGeometry args={[3, 1.1, 0.3]} />
      </mesh>
    </group>
  );
}

function OfficeWithCheckmark({ accent }: CommonProps) {
  const body = useNeutralMaterial('dark');
  const check = useAccentMaterial(accent, 3);
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  return (
    <group>
      <mesh position={[0, 5, 0]} material={body}>
        <boxGeometry args={[6, 10, 6]} />
      </mesh>
      <group ref={ref} position={[0, 11, 0]}>
        {/* checkmark: two thin boxes at 90° to resemble ✓ */}
        <mesh position={[-0.8, -0.3, 0]} rotation={[0, 0, Math.PI / 3]} material={check}>
          <boxGeometry args={[0.4, 1.5, 0.4]} />
        </mesh>
        <mesh position={[0.5, 0.5, 0]} rotation={[0, 0, -Math.PI / 4]} material={check}>
          <boxGeometry args={[0.4, 2.4, 0.4]} />
        </mesh>
      </group>
    </group>
  );
}

function Factory({ accent }: CommonProps) {
  const body = useNeutralMaterial('mid');
  const pipe = useAccentMaterial(accent, 1.8);
  return (
    <group>
      <mesh position={[0, 2, 0]} material={body}>
        <boxGeometry args={[8, 4, 6]} />
      </mesh>
      {[-2, 0, 2].map((x, i) => (
        <mesh key={i} position={[x, 6, 0]} material={pipe}>
          <cylinderGeometry args={[0.7, 0.9, 6, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function RadioTower({ accent }: CommonProps) {
  const frame = useNeutralMaterial('dark');
  const beacon = useAccentMaterial(accent, 3.2);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        2.2 + Math.sin(t * 3) * 1.2;
    }
  });
  return (
    <group>
      <mesh position={[0, 5, 0]} material={frame}>
        <cylinderGeometry args={[0.3, 1.5, 10, 10]} />
      </mesh>
      <mesh ref={ref} position={[0, 10.5, 0]} material={beacon}>
        <sphereGeometry args={[0.6, 12, 10]} />
      </mesh>
    </group>
  );
}

function Library({ accent }: CommonProps) {
  const wall = useNeutralMaterial('bright');
  const trim = useAccentMaterial(accent, 1.6);
  return (
    <group>
      <mesh position={[0, 3, 0]} material={wall}>
        <boxGeometry args={[10, 6, 8]} />
      </mesh>
      {/* columns */}
      {[-4, -1.5, 1.5, 4].map((x, i) => (
        <mesh key={i} position={[x, 3, 4.5]} material={trim}>
          <cylinderGeometry args={[0.4, 0.4, 6, 10]} />
        </mesh>
      ))}
      {/* roof */}
      <mesh position={[0, 6.4, 0]} material={trim}>
        <boxGeometry args={[11, 0.6, 9]} />
      </mesh>
    </group>
  );
}

function Billboard({ accent }: CommonProps) {
  const post = useNeutralMaterial('dark');
  const screen = useAccentMaterial(accent, 4);
  return (
    <group>
      <mesh position={[0, 4, 0]} material={post}>
        <cylinderGeometry args={[0.3, 0.5, 8, 8]} />
      </mesh>
      <mesh position={[0, 8.5, 0]} material={screen}>
        <boxGeometry args={[8, 4, 0.3]} />
      </mesh>
    </group>
  );
}

function CorporateTower({ accent }: CommonProps) {
  const glass = useAccentMaterial(accent, 1.2);
  return (
    <group>
      <mesh position={[0, 7, 0]} material={glass}>
        <boxGeometry args={[5, 14, 5]} />
      </mesh>
    </group>
  );
}

function ChatBubbleTower({ accent }: CommonProps) {
  const body = useNeutralMaterial('mid');
  const bubble = useAccentMaterial(accent, 3);
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.4;
  });
  return (
    <group>
      <mesh position={[0, 4, 0]} material={body}>
        <boxGeometry args={[6, 8, 6]} />
      </mesh>
      <group ref={ref} position={[0, 10, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos(i * 2.09) * 1.5, 0, Math.sin(i * 2.09) * 1.5]} material={bubble}>
            <sphereGeometry args={[0.8, 14, 10]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Office({ accent }: CommonProps) {
  const wall = useNeutralMaterial('mid');
  const banner = useAccentMaterial(accent, 2.5);
  return (
    <group>
      <mesh position={[0, 4, 0]} material={wall}>
        <boxGeometry args={[8, 8, 6]} />
      </mesh>
      <mesh position={[0, 7, 3.05]} material={banner}>
        <boxGeometry args={[6.5, 1.5, 0.2]} />
      </mesh>
    </group>
  );
}

function OpenCoworking({ accent }: CommonProps) {
  const deck = useNeutralMaterial('mid');
  const umbrella = useAccentMaterial(accent, 2);
  return (
    <group>
      <mesh position={[0, 0.6, 0]} material={deck}>
        <boxGeometry args={[10, 1.2, 8]} />
      </mesh>
      {[-2.5, 0, 2.5].map((x, i) => (
        <group key={i} position={[x, 1.6, 0]}>
          <mesh material={deck}>
            <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
          </mesh>
          <mesh position={[0, 2.4, 0]} material={umbrella}>
            <coneGeometry args={[1.6, 0.6, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GalleryWithSculpture({ accent }: CommonProps) {
  const wall = useNeutralMaterial('mid');
  const art = useAccentMaterial(accent, 3.5);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.5;
  });
  return (
    <group>
      <mesh position={[0, 3, 0]} material={wall}>
        <boxGeometry args={[10, 6, 8]} />
      </mesh>
      <mesh ref={ref} position={[0, 9, 0]} material={art}>
        <torusKnotGeometry args={[1.2, 0.4, 64, 8]} />
      </mesh>
    </group>
  );
}

function TerminalTower({ accent }: CommonProps) {
  const body = useNeutralMaterial('dark');
  const code = useAccentMaterial(accent, 3.5);
  return (
    <group>
      <mesh position={[0, 6, 0]} material={body}>
        <boxGeometry args={[5, 12, 5]} />
      </mesh>
      {/* floating cube */}
      <mesh position={[0, 13, 0]} material={code}>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
      </mesh>
    </group>
  );
}

function DataCenter({ accent }: CommonProps) {
  const rack = useNeutralMaterial('dark');
  const led = useAccentMaterial(accent, 3);
  return (
    <group>
      <mesh position={[0, 2.5, 0]} material={rack}>
        <boxGeometry args={[10, 5, 8]} />
      </mesh>
      {[-3, -1, 1, 3].map((x, i) => (
        <mesh key={i} position={[x, 2.5, 4.05]} material={led}>
          <boxGeometry args={[0.6, 2, 0.1]} />
        </mesh>
      ))}
    </group>
  );
}

function ControlTower({ accent }: CommonProps) {
  const shaft = useNeutralMaterial('mid');
  const cockpit = useAccentMaterial(accent, 2.5);
  return (
    <group>
      <mesh position={[0, 5, 0]} material={shaft}>
        <cylinderGeometry args={[0.9, 1.4, 10, 12]} />
      </mesh>
      <mesh position={[0, 11, 0]} material={cockpit}>
        <cylinderGeometry args={[2.6, 2.6, 1.8, 16]} />
      </mesh>
    </group>
  );
}

function LlamaStatue({ accent }: CommonProps) {
  const body = useAccentMaterial(accent, 2.5);
  return (
    <group>
      {/* pedestal */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[4, 2, 4]} />
        <meshStandardMaterial color={0x3a4154} roughness={0.5} />
      </mesh>
      {/* abstract llama — 4 legs, body, neck, head */}
      <mesh position={[0, 4, 0]} material={body}>
        <boxGeometry args={[2.8, 1.8, 1.4]} />
      </mesh>
      <mesh position={[0.8, 5.8, 0]} material={body}>
        <boxGeometry args={[0.8, 2.4, 0.8]} />
      </mesh>
      <mesh position={[0.8, 7.3, 0.15]} material={body}>
        <boxGeometry args={[1.2, 0.7, 1.0]} />
      </mesh>
    </group>
  );
}

function Skyscraper$({ accent }: CommonProps) {
  const glass = useNeutralMaterial('dark');
  const dollar = useAccentMaterial(accent, 4);
  return (
    <group>
      <mesh position={[0, 8, 0]} material={glass}>
        <boxGeometry args={[4, 16, 4]} />
      </mesh>
      <mesh position={[0, 17, 0]} material={dollar}>
        <torusGeometry args={[1.2, 0.35, 8, 20]} />
      </mesh>
      <mesh position={[0, 17, 0]} material={dollar}>
        <boxGeometry args={[0.4, 3, 0.4]} />
      </mesh>
    </group>
  );
}

function Warehouse({ accent }: CommonProps) {
  const wall = useNeutralMaterial('mid');
  const sign = useAccentMaterial(accent, 3);
  return (
    <group>
      <mesh position={[0, 3, 0]} material={wall}>
        <boxGeometry args={[12, 6, 8]} />
      </mesh>
      {/* shopping cart = ring + cross */}
      <mesh position={[0, 8, 0]} material={sign}>
        <torusGeometry args={[1.2, 0.25, 8, 18]} />
      </mesh>
    </group>
  );
}

function CloudTower({ accent }: CommonProps) {
  const tower = useNeutralMaterial('mid');
  const cloud = useAccentMaterial(accent, 3);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 11 + Math.sin(clock.getElapsedTime() * 0.8) * 0.6;
  });
  return (
    <group>
      <mesh position={[0, 5, 0]} material={tower}>
        <boxGeometry args={[4, 10, 4]} />
      </mesh>
      <group ref={ref}>
        {[[0, 0], [1.2, 0.3], [-1, 0.5], [0.3, -0.7]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0, z]} material={cloud}>
            <sphereGeometry args={[1.1, 14, 10]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Fortress({ accent }: CommonProps) {
  const wall = useNeutralMaterial('dark');
  const turret = useAccentMaterial(accent, 2.5);
  return (
    <group>
      <mesh position={[0, 2.5, 0]} material={wall}>
        <boxGeometry args={[10, 5, 10]} />
      </mesh>
      {[[-4, -4], [-4, 4], [4, -4], [4, 4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 5, z]} material={turret}>
          <cylinderGeometry args={[0.8, 0.8, 4, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function Courthouse({ accent }: CommonProps) {
  const wall = useNeutralMaterial('bright');
  const trim = useAccentMaterial(accent, 2);
  return (
    <group>
      {/* steps */}
      <mesh position={[0, 0.5, 5]} material={wall}>
        <boxGeometry args={[10, 1, 2]} />
      </mesh>
      {/* body */}
      <mesh position={[0, 3.5, 0]} material={wall}>
        <boxGeometry args={[10, 6, 8]} />
      </mesh>
      {/* columns */}
      {[-3.5, -1, 1, 3.5].map((x, i) => (
        <mesh key={i} position={[x, 3.5, 4]} material={trim}>
          <cylinderGeometry args={[0.3, 0.3, 6, 10]} />
        </mesh>
      ))}
      {/* pediment */}
      <mesh position={[0, 7.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={wall}>
        <coneGeometry args={[5.5, 1.4, 4]} />
      </mesh>
    </group>
  );
}

function Campus({ accent }: CommonProps) {
  const wall = useNeutralMaterial('mid');
  const cap = useAccentMaterial(accent, 3);
  return (
    <group>
      <mesh position={[0, 4, 0]} material={wall}>
        <boxGeometry args={[10, 8, 8]} />
      </mesh>
      {/* clock tower */}
      <mesh position={[0, 10, 0]} material={wall}>
        <boxGeometry args={[2, 4, 2]} />
      </mesh>
      {/* graduation cap */}
      <mesh position={[0, 12.8, 0]} material={cap}>
        <boxGeometry args={[3, 0.3, 3]} />
      </mesh>
      <mesh position={[0, 12.5, 0]} material={cap}>
        <boxGeometry args={[1.2, 0.6, 1.2]} />
      </mesh>
    </group>
  );
}

function Hospital({ accent }: CommonProps) {
  const wall = useNeutralMaterial('bright');
  const cross = useAccentMaterial(accent, 4);
  return (
    <group>
      <mesh position={[0, 4, 0]} material={wall}>
        <boxGeometry args={[10, 8, 8]} />
      </mesh>
      <mesh position={[0, 9, 0]} material={cross}>
        <boxGeometry args={[3, 0.7, 0.3]} />
      </mesh>
      <mesh position={[0, 9, 0]} material={cross}>
        <boxGeometry args={[0.7, 3, 0.3]} />
      </mesh>
    </group>
  );
}

function Villa({ accent }: CommonProps) {
  const wall = useNeutralMaterial('mid');
  const sign = useAccentMaterial(accent, 2.5);
  return (
    <group>
      <mesh position={[0, 3, 0]} material={wall}>
        <boxGeometry args={[8, 6, 6]} />
      </mesh>
      <mesh position={[0, 7, 0]} rotation={[0, Math.PI / 4, 0]} material={wall}>
        <coneGeometry args={[6, 2.5, 4]} />
      </mesh>
      <mesh position={[0, 9.8, 0]} material={sign}>
        <boxGeometry args={[2.5, 0.8, 0.3]} />
      </mesh>
    </group>
  );
}

function LogisticsHub({ accent }: CommonProps) {
  const wall = useNeutralMaterial('dark');
  const door = useAccentMaterial(accent, 2.5);
  return (
    <group>
      <mesh position={[0, 2.5, 0]} material={wall}>
        <boxGeometry args={[12, 5, 8]} />
      </mesh>
      {[-3.5, 0, 3.5].map((x, i) => (
        <mesh key={i} position={[x, 2, 4.05]} material={door}>
          <boxGeometry args={[2, 3.2, 0.2]} />
        </mesh>
      ))}
    </group>
  );
}

function ScalesStatue({ accent }: CommonProps) {
  const shaft = useNeutralMaterial('dark');
  const pan = useAccentMaterial(accent, 2.5);
  return (
    <group>
      <mesh position={[0, 1, 0]} material={shaft}>
        <boxGeometry args={[2, 2, 2]} />
      </mesh>
      <mesh position={[0, 5, 0]} material={shaft}>
        <cylinderGeometry args={[0.25, 0.25, 6, 10]} />
      </mesh>
      {/* beam */}
      <mesh position={[0, 8, 0]} material={shaft}>
        <boxGeometry args={[6, 0.25, 0.25]} />
      </mesh>
      {/* pans */}
      {[-2.5, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 7.3, 0]} material={pan}>
          <cylinderGeometry args={[1, 0.6, 0.3, 14]} />
        </mesh>
      ))}
    </group>
  );
}
