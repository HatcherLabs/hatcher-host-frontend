'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';

interface Props {
  framework: string;
  palette: FrameworkPalette;
}

export function Environment({ framework, palette }: Props) {
  switch (framework) {
    case 'hermes':
      return <HermesLibrary palette={palette} />;
    case 'elizaos':
      return <ElizaPlaza palette={palette} />;
    case 'milady':
      return <MiladyStudio palette={palette} />;
    case 'openclaw':
    default:
      return <OpenClawWorkshop palette={palette} />;
  }
}

// ─────────────────────────────────────────────────────────────
// OpenClaw — industrial workshop: pipes, crates, workbench
// ─────────────────────────────────────────────────────────────
function OpenClawWorkshop({ palette }: { palette: FrameworkPalette }) {
  const materials = useMemo(
    () => ({
      pipe: new THREE.MeshStandardMaterial({ color: 0x3a3f4e, metalness: 0.9, roughness: 0.35 }),
      pipeHot: new THREE.MeshStandardMaterial({
        color: palette.dim,
        metalness: 0.85,
        roughness: 0.3,
        emissive: palette.primary,
        emissiveIntensity: 0.4,
      }),
      crate: new THREE.MeshStandardMaterial({ color: 0x4a3820, metalness: 0.2, roughness: 0.8 }),
      crateAccent: new THREE.MeshStandardMaterial({ color: 0x2a2015, metalness: 0.3, roughness: 0.7 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x2a2d38, metalness: 0.85, roughness: 0.4 }),
      glow: new THREE.MeshBasicMaterial({ color: palette.bright }),
    }),
    [palette],
  );
  const weldRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (weldRef.current) {
      const t = clock.getElapsedTime();
      // Pseudo-random weld flicker — 10% duty cycle of bright pulses
      const pulse = Math.max(0, Math.sin(t * 6.2) + Math.sin(t * 11.1) - 1.1);
      weldRef.current.intensity = 0.2 + pulse * 4.5;
    }
  });
  return (
    <group>
      {/* Radial floor pipes */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        return (
          <mesh
            key={`p-${i}`}
            position={[Math.cos(a) * 5.5, 0.1, Math.sin(a) * 5.5]}
            rotation={[0, a, Math.PI / 2]}
            material={i % 3 === 0 ? materials.pipeHot : materials.pipe}
          >
            <cylinderGeometry args={[0.09, 0.09, 4, 10]} />
          </mesh>
        );
      })}
      {/* Crate stack left */}
      <group position={[-5.5, 0, -2]}>
        <mesh position={[0, 0.45, 0]} material={materials.crate}>
          <boxGeometry args={[1.2, 0.9, 1.2]} />
        </mesh>
        <mesh position={[0, 0.45, 0]} material={materials.crateAccent}>
          <boxGeometry args={[1.22, 0.1, 1.22]} />
        </mesh>
        <mesh position={[0.2, 1.25, 0.2]} material={materials.crate}>
          <boxGeometry args={[0.85, 0.7, 0.85]} />
        </mesh>
      </group>
      <group position={[-6.2, 0, 1.5]}>
        <mesh position={[0, 0.35, 0]} material={materials.crate}>
          <boxGeometry args={[0.95, 0.7, 0.95]} />
        </mesh>
      </group>
      {/* Crate stack right */}
      <group position={[5.6, 0, -2.2]}>
        <mesh position={[0, 0.45, 0]} material={materials.crate}>
          <boxGeometry args={[1.1, 0.9, 1.1]} />
        </mesh>
        <mesh position={[-0.15, 1.2, -0.1]} material={materials.crate}>
          <boxGeometry args={[0.75, 0.6, 0.75]} />
        </mesh>
      </group>
      {/* Workbench back-left with welding flicker */}
      <group position={[-3.5, 0, -5.5]}>
        <mesh position={[0, 0.5, 0]} material={materials.steel}>
          <boxGeometry args={[2.4, 1.0, 0.9]} />
        </mesh>
        <mesh position={[-0.8, 1.05, 0]} material={materials.glow}>
          <boxGeometry args={[0.15, 0.06, 0.15]} />
        </mesh>
        <pointLight ref={weldRef} position={[-0.8, 1.15, 0]} color={palette.bright} distance={6} decay={2} intensity={0.4} />
      </group>
      {/* Overhead catwalk beams */}
      {[-1, 1].map((s) => (
        <mesh key={`beam-${s}`} position={[0, 4.5, s * 4]} material={materials.steel}>
          <boxGeometry args={[10, 0.12, 0.25]} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Hermes — floating library: bookshelves + scrolls + candles
// ─────────────────────────────────────────────────────────────
function HermesLibrary({ palette }: { palette: FrameworkPalette }) {
  const shelvesRef = useRef<THREE.Group>(null);
  const materials = useMemo(
    () => ({
      shelf: new THREE.MeshStandardMaterial({ color: 0x2e1838, metalness: 0.2, roughness: 0.7 }),
      book1: new THREE.MeshStandardMaterial({ color: 0x4a1c5a, metalness: 0.15, roughness: 0.65, emissive: palette.dim, emissiveIntensity: 0.25 }),
      book2: new THREE.MeshStandardMaterial({ color: 0x1a1540, metalness: 0.15, roughness: 0.65 }),
      book3: new THREE.MeshStandardMaterial({ color: palette.dim, metalness: 0.3, roughness: 0.5, emissive: palette.primary, emissiveIntensity: 0.2 }),
      candle: new THREE.MeshBasicMaterial({ color: palette.bright }),
      parch: new THREE.MeshStandardMaterial({ color: 0x6e5a3a, metalness: 0.1, roughness: 0.8 }),
    }),
    [palette],
  );
  useFrame(({ clock }) => {
    if (shelvesRef.current) shelvesRef.current.rotation.y = clock.getElapsedTime() * 0.04;
  });
  return (
    <group>
      <group ref={shelvesRef}>
        {/* Five floating bookshelf panels in a wide arc behind the messenger */}
        {[-2, -1, 0, 1, 2].map((offset) => {
          const baseAngle = Math.PI + offset * 0.32;
          const r = 5.8;
          const x = Math.cos(baseAngle) * r;
          const z = Math.sin(baseAngle) * r;
          const y = 2 + Math.sin(offset * 0.9) * 0.4;
          return (
            <group key={`shelf-${offset}`} position={[x, y, z]} rotation={[0, -baseAngle + Math.PI / 2, 0]}>
              <mesh material={materials.shelf}>
                <boxGeometry args={[1.6, 1.4, 0.12]} />
              </mesh>
              {/* Book spines as a row */}
              {[0, 1, 2, 3, 4, 5, 6].map((b) => {
                const bmat = b % 3 === 0 ? materials.book1 : b % 3 === 1 ? materials.book2 : materials.book3;
                return (
                  <mesh
                    key={b}
                    position={[-0.65 + b * 0.2, 0.2, 0.08]}
                    material={bmat}
                  >
                    <boxGeometry args={[0.16, 0.7 - (b % 3) * 0.1, 0.1]} />
                  </mesh>
                );
              })}
              {/* Floating candle on top */}
              <mesh position={[0, 0.9, 0.06]} material={materials.candle}>
                <sphereGeometry args={[0.05, 8, 6]} />
              </mesh>
              <pointLight position={[0, 0.9, 0.06]} color={palette.bright} intensity={0.35} distance={2.5} decay={2} />
            </group>
          );
        })}
      </group>
      {/* Scroll piles on the ground */}
      {[-4, 4].map((x) => (
        <group key={`scrolls-${x}`} position={[x, 0.05, -3.5]}>
          <mesh rotation={[0.1, 0.3, 0]} material={materials.parch}>
            <cylinderGeometry args={[0.08, 0.08, 0.6, 10]} />
          </mesh>
          <mesh position={[0.15, 0, 0.1]} rotation={[0, -0.4, 0.3]} material={materials.parch}>
            <cylinderGeometry args={[0.06, 0.06, 0.5, 10]} />
          </mesh>
        </group>
      ))}
      {/* A pair of floor candelabra flanking the ring */}
      {[-1, 1].map((s) => (
        <group key={`cand-${s}`} position={[s * 4.2, 0, 3.5]}>
          <mesh position={[0, 1, 0]} material={materials.shelf}>
            <cylinderGeometry args={[0.08, 0.12, 2.0, 10]} />
          </mesh>
          <mesh position={[0, 2.05, 0]} material={materials.candle}>
            <sphereGeometry args={[0.08, 10, 8]} />
          </mesh>
          <pointLight position={[0, 2.1, 0]} color={palette.bright} intensity={0.6} distance={4} decay={2} />
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// ElizaOS — social plaza: NPC orb cluster + connection lines
// ─────────────────────────────────────────────────────────────
function ElizaPlaza({ palette }: { palette: FrameworkPalette }) {
  const clusterRef = useRef<THREE.Group>(null);
  const materials = useMemo(
    () => ({
      npc: new THREE.MeshStandardMaterial({
        color: 0x2a3b68,
        metalness: 0.5,
        roughness: 0.4,
        emissive: palette.dim,
        emissiveIntensity: 0.35,
      }),
      primary: new THREE.MeshBasicMaterial({ color: palette.primary }),
      glow: new THREE.MeshBasicMaterial({ color: palette.bright }),
      kiosk: new THREE.MeshStandardMaterial({ color: 0x1e2a44, metalness: 0.7, roughness: 0.3 }),
    }),
    [palette],
  );
  const npcPositions = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 5.5 + (i % 3) * 0.7;
      out.push([Math.cos(a) * r, 0.2 + (i % 2) * 0.1, Math.sin(a) * r]);
    }
    return out;
  }, []);
  useFrame(({ clock }) => {
    if (!clusterRef.current) return;
    const t = clock.getElapsedTime();
    clusterRef.current.children.forEach((c, i) => {
      c.position.y = npcPositions[i]![1] + Math.sin(t * 0.8 + i) * 0.12;
    });
  });
  return (
    <group>
      <group ref={clusterRef}>
        {npcPositions.map((pos, i) => (
          <group key={`npc-${i}`} position={pos}>
            <mesh material={materials.npc}>
              <sphereGeometry args={[0.22, 14, 10]} />
            </mesh>
            <mesh position={[0, 0.02, 0.22]} material={i % 3 === 0 ? materials.glow : materials.primary}>
              <sphereGeometry args={[0.05, 8, 6]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Connection lines radiating out from center like a mesh network */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a1 = (i / 6) * Math.PI * 2;
        const a2 = ((i + 2) / 6) * Math.PI * 2;
        const r = 5.5;
        const pts = [
          new THREE.Vector3(Math.cos(a1) * r, 0.3, Math.sin(a1) * r),
          new THREE.Vector3(Math.cos(a2) * r, 0.3, Math.sin(a2) * r),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <primitive
            key={`net-${i}`}
            object={new THREE.Line(geo, new THREE.LineBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.35 }))}
          />
        );
      })}
      {/* Two info kiosks */}
      {[-1, 1].map((s) => (
        <group key={`kiosk-${s}`} position={[s * 4.5, 0, -4]}>
          <mesh position={[0, 0.9, 0]} material={materials.kiosk}>
            <boxGeometry args={[0.6, 1.8, 0.3]} />
          </mesh>
          <mesh position={[0, 1.3, 0.16]} material={materials.primary}>
            <boxGeometry args={[0.48, 0.7, 0.03]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Milady — creator studio: floating canvases + paint jars
// ─────────────────────────────────────────────────────────────
function MiladyStudio({ palette }: { palette: FrameworkPalette }) {
  const canvasGroupRef = useRef<THREE.Group>(null);
  const materials = useMemo(
    () => ({
      canvasBack: new THREE.MeshStandardMaterial({ color: 0x2a1a22, metalness: 0.2, roughness: 0.75 }),
      canvas1: new THREE.MeshStandardMaterial({
        color: 0xff6ec7,
        metalness: 0.2,
        roughness: 0.55,
        emissive: palette.dim,
        emissiveIntensity: 0.2,
      }),
      canvas2: new THREE.MeshStandardMaterial({ color: 0xffc1e2, metalness: 0.15, roughness: 0.6 }),
      canvas3: new THREE.MeshStandardMaterial({ color: 0xff3d8c, metalness: 0.25, roughness: 0.55 }),
      jar: new THREE.MeshStandardMaterial({ color: 0xf4e3ec, metalness: 0.25, roughness: 0.45 }),
      paint: new THREE.MeshBasicMaterial({ color: palette.primary }),
      easel: new THREE.MeshStandardMaterial({ color: 0x6b4538, metalness: 0.15, roughness: 0.7 }),
    }),
    [palette],
  );
  useFrame(({ clock }) => {
    if (canvasGroupRef.current) canvasGroupRef.current.rotation.y = clock.getElapsedTime() * 0.06;
  });
  return (
    <group>
      <group ref={canvasGroupRef}>
        {/* 5 floating canvases on an arc */}
        {[-2, -1, 0, 1, 2].map((offset) => {
          const baseAngle = Math.PI + offset * 0.35;
          const r = 5.5;
          const x = Math.cos(baseAngle) * r;
          const z = Math.sin(baseAngle) * r;
          const y = 2.0 + Math.sin(offset * 1.1) * 0.5;
          const paintMat = offset % 3 === 0 ? materials.canvas1 : offset % 3 === 1 ? materials.canvas2 : materials.canvas3;
          return (
            <group key={`canvas-${offset}`} position={[x, y, z]} rotation={[0, -baseAngle + Math.PI / 2, 0]}>
              <mesh material={materials.canvasBack}>
                <boxGeometry args={[1.3, 1.5, 0.08]} />
              </mesh>
              <mesh position={[0, 0, 0.05]} material={paintMat}>
                <boxGeometry args={[1.15, 1.35, 0.02]} />
              </mesh>
              {/* decorative pixel blobs */}
              {[[0.3, 0.2], [-0.3, 0.4], [0.1, -0.2]].map((p, i) => (
                <mesh key={i} position={[p[0]!, p[1]!, 0.07]} material={materials.paint}>
                  <sphereGeometry args={[0.08, 10, 8]} />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>
      {/* Two easels flanking the ring */}
      {[-1, 1].map((s) => (
        <group key={`easel-${s}`} position={[s * 4.0, 0, 3.8]}>
          <mesh position={[0, 1.1, 0]} rotation={[0, 0, 0]} material={materials.easel}>
            <boxGeometry args={[0.08, 2.2, 0.08]} />
          </mesh>
          <mesh position={[0, 1.4, 0]} material={materials.canvasBack}>
            <boxGeometry args={[0.9, 1.1, 0.08]} />
          </mesh>
          <mesh position={[0, 1.4, 0.05]} material={materials.canvas1}>
            <boxGeometry args={[0.8, 1.0, 0.02]} />
          </mesh>
        </group>
      ))}
      {/* Paint jars scattered on the floor */}
      {[[-2.5, -4.2], [-3.3, -3.3], [2.8, -4], [3.5, -3.2]].map((pos, i) => {
        const jarColor = [0xff6ec7, 0xffc1e2, 0xff3d8c, palette.primary][i]!;
        return (
          <group key={`jar-${i}`} position={[pos[0]!, 0, pos[1]!]}>
            <mesh position={[0, 0.15, 0]} material={materials.jar}>
              <cylinderGeometry args={[0.12, 0.1, 0.3, 14]} />
            </mesh>
            <mesh position={[0, 0.31, 0]}>
              <cylinderGeometry args={[0.115, 0.115, 0.02, 14]} />
              <meshBasicMaterial color={jarColor} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
