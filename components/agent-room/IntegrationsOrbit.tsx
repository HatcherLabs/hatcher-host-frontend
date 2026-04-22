'use client';
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';
import type { RoomIntegration } from './types';

/**
 * Canvas-drawn brand badge texture. We paint a filled rounded-square
 * tile + a simplified mark (paper plane / hash / lightning / etc) so
 * each integration has a recognisable front face instead of a blank
 * colored box. Used as `.map` on MeshStandardMaterial so the panel
 * still responds to scene lighting + the bloom pass.
 */
function makeBrandTexture(key: string, bgColor: string): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;

  // Rounded-square background
  ctx.fillStyle = bgColor;
  const r = 18;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Brand mark — simple symbolic glyph in white
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = size / 2;
  const cy = size / 2;
  if (key === 'telegram') {
    // Paper plane
    ctx.beginPath();
    ctx.moveTo(cx - 32, cy + 6);
    ctx.lineTo(cx + 32, cy - 20);
    ctx.lineTo(cx + 12, cy + 28);
    ctx.lineTo(cx + 2, cy + 10);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'discord') {
    // Simplified grin mouth + two eyes
    ctx.beginPath();
    ctx.arc(cx - 14, cy - 6, 6, 0, Math.PI * 2);
    ctx.arc(cx + 14, cy - 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 8, 20, 0, Math.PI, false);
    ctx.stroke();
  } else if (key === 'twitter') {
    // X letter — two diagonal strokes
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 26);
    ctx.lineTo(cx + 26, cy + 26);
    ctx.moveTo(cx + 26, cy - 26);
    ctx.lineTo(cx - 26, cy + 26);
    ctx.lineWidth = 10;
    ctx.stroke();
  } else if (key === 'whatsapp') {
    // Phone handset
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 4, 6, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 4, 12, 0, Math.PI, false);
    ctx.fillStyle = bgColor;
    ctx.fill();
  } else if (key === 'slack') {
    // Hashtag
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 28);
    ctx.lineTo(cx - 20, cy + 28);
    ctx.moveTo(cx + 8, cy - 28);
    ctx.lineTo(cx + 8, cy + 28);
    ctx.moveTo(cx - 32, cy - 12);
    ctx.lineTo(cx + 24, cy - 12);
    ctx.moveTo(cx - 32, cy + 12);
    ctx.lineTo(cx + 24, cy + 12);
    ctx.stroke();
  } else if (key === 'webhook') {
    // Lightning bolt
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 28);
    ctx.lineTo(cx - 20, cy + 4);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx - 12, cy + 28);
    ctx.lineTo(cx + 18, cy - 6);
    ctx.lineTo(cx + 2, cy - 6);
    ctx.lineTo(cx + 14, cy - 28);
    ctx.closePath();
    ctx.fill();
  } else {
    // Fallback — first letter
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key[0]?.toUpperCase() ?? '?', cx, cy);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

const brandTextureCache = new Map<string, THREE.CanvasTexture>();
function getBrandTexture(key: string, bgColor: string): THREE.CanvasTexture {
  const cacheKey = `${key}:${bgColor}`;
  let t = brandTextureCache.get(cacheKey);
  if (!t) {
    t = makeBrandTexture(key, bgColor);
    brandTextureCache.set(cacheKey, t);
  }
  return t;
}

interface Props {
  palette: FrameworkPalette;
  integrations: RoomIntegration[];
  onIntegrationClick?: (key: string) => void;
}

export function IntegrationsOrbit({ palette, integrations, onIntegrationClick }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.2;
  });

  const lineGeometries = useMemo(() => {
    return integrations.map((intg, i) => {
      if (!intg.active) return null;
      const angle = (i / integrations.length) * Math.PI * 2;
      const x = Math.cos(angle) * 3.0;
      const z = Math.sin(angle) * 3.0;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array([x, 0, z, 0, 0, 0]), 3),
      );
      return geo;
    });
  }, [integrations]);

  return (
    <group ref={groupRef} position={[0, 1.4, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.0, 0.008, 8, 96]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.22} />
      </mesh>
      {integrations.map((intg, i) => {
        const angle = (i / integrations.length) * Math.PI * 2;
        const x = Math.cos(angle) * 3.0;
        const z = Math.sin(angle) * 3.0;
        const color = intg.active ? parseInt(intg.colorHex.replace('#', '0x'), 16) : 0x20232a;
        const isHover = hovered === intg.key;
        const scale = isHover ? 1.3 : 1.0;
        const geo = lineGeometries[i];
        const tex = getBrandTexture(intg.key, intg.active ? intg.colorHex : '#2a2d38');
        return (
          <group key={intg.key}>
            <group
              position={[x, 0, z]}
              scale={scale}
              onClick={(e) => { e.stopPropagation(); onIntegrationClick?.(intg.key); }}
              onPointerOver={(e) => { e.stopPropagation(); setHovered(intg.key); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { setHovered(null); document.body.style.cursor = ''; }}
            >
              {/* Tile body — slim forward-facing panel instead of a cube */}
              <mesh>
                <boxGeometry args={[0.46, 0.46, 0.08]} />
                <meshStandardMaterial
                  color={color}
                  metalness={0.35}
                  roughness={0.45}
                  emissive={color}
                  emissiveIntensity={intg.active || isHover ? 0.5 : 0.15}
                />
              </mesh>
              {/* Brand logo plane, billboarded toward the center so the
                  mark stays readable as the orbit rotates. */}
              <mesh rotation={[0, Math.atan2(-z, -x) + Math.PI, 0]} position={[0, 0, 0.05]}>
                <planeGeometry args={[0.42, 0.42]} />
                <meshBasicMaterial
                  map={tex}
                  transparent
                  opacity={intg.active ? 1 : 0.35}
                  toneMapped={false}
                />
              </mesh>
              {/* Back face — same logo mirrored so the tile reads from both sides */}
              <mesh rotation={[0, Math.atan2(-z, -x), 0]} position={[0, 0, -0.05]}>
                <planeGeometry args={[0.42, 0.42]} />
                <meshBasicMaterial
                  map={tex}
                  transparent
                  opacity={intg.active ? 0.8 : 0.25}
                  toneMapped={false}
                />
              </mesh>
            </group>
            <Html position={[x, 0.42, z]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  fontFamily: 'SF Mono, Monaco, monospace',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  color: intg.active ? palette.brightHex : '#6b7280',
                  textShadow: '0 0 6px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {intg.label}
              </div>
            </Html>
            {geo ? (
              <primitive
                object={
                  new THREE.Line(
                    geo,
                    new THREE.LineBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.38 }),
                  )
                }
              />
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
