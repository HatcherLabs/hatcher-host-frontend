'use client';
import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { GROUND_SIZE } from './grid';

/**
 * 600×600 ground plane with a tiled PBR asphalt texture. Phase 2.
 *
 * The texture is shared across the whole ground — district pads
 * (DistrictPads.tsx) sit on top and override the look per category.
 */
export function Ground() {
  const [diffBase, normBase, roughBase] = useTexture([
    '/assets/3d/textures/asphalt_diff.jpg',
    '/assets/3d/textures/asphalt_norm.jpg',
    '/assets/3d/textures/asphalt_rough.jpg',
  ]);

  // drei's useTexture returns shared-cached THREE.Texture instances.
  // Streets also tiles these with a different repeat; mutating the
  // shared one leaks config between consumers, so clone here.
  const { diff, norm, rough } = useMemo(() => {
    const d = diffBase.clone();
    const n = normBase.clone();
    const r = roughBase.clone();
    for (const t of [d, n, r]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(40, 40);
      t.needsUpdate = true;
    }
    d.colorSpace = THREE.SRGBColorSpace;
    return { diff: d, norm: n, rough: r };
  }, [diffBase, normBase, roughBase]);

  // Cyber grid overlay — a big translucent plane a hair above the
  // asphalt, with an emissive cyan line grid baked into a canvas
  // texture. Bloom picks the lines up as glow.
  const gridTex = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(80, 200, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
    // inner subdivisions
    ctx.strokeStyle = 'rgba(80, 200, 255, 0.22)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const p = (size * i) / 8;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(60, 60);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial
          map={diff}
          normalMap={norm}
          roughnessMap={rough}
          roughness={0.95}
          metalness={0.02}
          color={'#1a1a24'}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshBasicMaterial
          map={gridTex}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
