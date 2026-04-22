'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from './colors';

interface Props {
  palette: FrameworkPalette;
}

/**
 * Generates a canvas texture with a hex pattern + radial glow toward
 * the center so the platform reads as a stage instead of a disc.
 * Animates a subtle radial sweep over the top emissive ring.
 */
function makeHexTexture(primaryHex: string, dimHex: string): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;

  // Base radial gradient — darker center, brighter ring
  const grad = ctx.createRadialGradient(size / 2, size / 2, 30, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#0a0c14');
  grad.addColorStop(0.7, '#12151f');
  grad.addColorStop(1, '#1d2030');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Hex grid
  const hexR = 18;
  const w = hexR * Math.sqrt(3);
  const h = hexR * 1.5;
  ctx.strokeStyle = dimHex;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.25;
  for (let row = -2; row * h < size + hexR; row++) {
    const offsetX = (row % 2) * (w / 2);
    for (let col = -2; col * w + offsetX < size + w; col++) {
      const cx = col * w + offsetX;
      const cy = row * h;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const x = cx + hexR * Math.cos(a);
        const y = cy + hexR * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Center emissive accent ring drawn in primary color
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function HexPlatform({ palette }: Props) {
  const ringRef = useRef<THREE.MeshBasicMaterial>(null);

  const topTexture = useMemo(
    () => makeHexTexture(palette.primaryHex, palette.dimHex),
    [palette.primaryHex, palette.dimHex],
  );

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.getElapsedTime();
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(palette.primary).getHSL(hsl);
      ringRef.current.color.setHSL(hsl.h, hsl.s, hsl.l + Math.sin(t * 1.2) * 0.08);
    }
  });

  return (
    <group>
      {/* Wide dim floor extending past the platform — gives depth */}
      <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[20, 48]} />
        <meshStandardMaterial color={0x0a0b12} metalness={0.4} roughness={0.9} />
      </mesh>

      {/* Grid lines radiating outward */}
      <gridHelper args={[40, 40, palette.dim, 0x1a1a22]} material-transparent material-opacity={0.22} position={[0, -0.13, 0]} />

      {/* Platform core disc with hex texture on top */}
      <mesh position={[0, -0.055, 0]}>
        <cylinderGeometry args={[3.2, 3.4, 0.18, 64]} />
        <meshStandardMaterial color={0x14161b} metalness={0.82} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.18, 48]} />
        <meshStandardMaterial
          map={topTexture}
          transparent
          metalness={0.3}
          roughness={0.55}
          emissive={palette.dim}
          emissiveIntensity={0.18}
          emissiveMap={topTexture}
        />
      </mesh>

      {/* Bright outer ring (animated hue breath) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
        <torusGeometry args={[3.3, 0.04, 16, 96]} />
        <meshBasicMaterial ref={ringRef} color={palette.primary} />
      </mesh>

      {/* Secondary inner emissive ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
        <torusGeometry args={[2.0, 0.008, 8, 64]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
