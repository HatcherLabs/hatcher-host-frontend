'use client';
import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { ROOM_SIZE, ROOM_HEIGHT, ROOM_HALF } from './grid';
import { paletteFor } from '../colors';

interface Props { framework: string; }

function makeTechPanelTexture(primary: string, accent: string, variant: 'floor' | 'wall') {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const bg = variant === 'floor' ? '#0b0d12' : '#080a10';
  const panel = variant === 'floor' ? '#121620' : '#10131b';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const cell = variant === 'floor' ? 256 : 192;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const inset = 12 + ((x + y) / cell) % 3 * 4;
      ctx.fillStyle = panel;
      ctx.fillRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.42)';
      ctx.lineWidth = 8;
      ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);
    }
  }

  const glowColors = [primary, accent, '#39ff88', '#38bdf8', '#facc15'];
  glowColors.forEach((color, i) => {
    ctx.strokeStyle = color;
    ctx.globalAlpha = variant === 'floor' ? 0.42 : 0.24;
    ctx.lineWidth = i % 2 ? 3 : 2;
    const offset = 54 + i * 76;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + 180, 180);
    ctx.lineTo(size, 180 + offset * 0.38);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  for (let i = 0; i < 70; i++) {
    const x = (i * 137) % size;
    const y = (i * 283) % size;
    ctx.fillStyle = i % 3 === 0 ? accent : primary;
    ctx.globalAlpha = i % 4 === 0 ? 0.62 : 0.28;
    ctx.fillRect(x, y, 18 + (i % 5) * 8, 3);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function RoomShell({ framework }: Props) {
  const palette = paletteFor(framework);
  const roomPrimary = framework === 'openclaw' ? '#39ff88' : palette.primary;
  const roomAccent = framework === 'openclaw' ? '#38bdf8' : palette.accent;
  const [
    metalColorBase,
    metalNormalBase,
    metalRoughnessBase,
    metalnessBase,
    wallColorBase,
    wallNormalBase,
    wallRoughnessBase,
    wallMetalnessBase,
    concreteDiffBase,
  ] =
    useTexture([
      '/assets/3d/textures/agent-room/metal-walkway-color.jpg',
      '/assets/3d/textures/agent-room/metal-walkway-normal.jpg',
      '/assets/3d/textures/agent-room/metal-walkway-roughness.jpg',
      '/assets/3d/textures/agent-room/metal-walkway-metalness.jpg',
      '/assets/3d/textures/agent-room/wall-panels-color.jpg',
      '/assets/3d/textures/agent-room/wall-panels-normal.jpg',
      '/assets/3d/textures/agent-room/wall-panels-roughness.jpg',
      '/assets/3d/textures/agent-room/wall-panels-metalness.jpg',
      '/assets/3d/textures/concrete_diff.jpg',
    ]);

  const textures = useMemo(() => {
    const metalColor = metalColorBase.clone();
    const metalNormal = metalNormalBase.clone();
    const metalRoughness = metalRoughnessBase.clone();
    const metalness = metalnessBase.clone();
    const wallColor = wallColorBase.clone();
    const wallNormal = wallNormalBase.clone();
    const wallRoughness = wallRoughnessBase.clone();
    const wallMetalness = wallMetalnessBase.clone();
    const concreteDiff = concreteDiffBase.clone();
    for (const texture of [metalColor, metalNormal, metalRoughness, metalness]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(5.5, 5.5);
      texture.needsUpdate = true;
    }
    for (const texture of [wallColor, wallNormal, wallRoughness, wallMetalness]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2.8, 1.25);
      texture.needsUpdate = true;
    }
    concreteDiff.wrapS = concreteDiff.wrapT = THREE.RepeatWrapping;
    concreteDiff.repeat.set(4, 1.4);
    concreteDiff.colorSpace = THREE.SRGBColorSpace;
    concreteDiff.needsUpdate = true;
    metalColor.colorSpace = THREE.SRGBColorSpace;
    wallColor.colorSpace = THREE.SRGBColorSpace;

    const floorPanel = makeTechPanelTexture(roomPrimary, roomAccent, 'floor');
    floorPanel.repeat.set(3.5, 3.5);
    const wallPanel = makeTechPanelTexture(roomPrimary, roomAccent, 'wall');
    wallPanel.repeat.set(4.5, 1.15);
    return {
      metalColor,
      metalNormal,
      metalRoughness,
      metalness,
      wallColor,
      wallNormal,
      wallRoughness,
      wallMetalness,
      concreteDiff,
      floorPanel,
      wallPanel,
    };
  }, [
    metalColorBase,
    metalNormalBase,
    metalRoughnessBase,
    metalnessBase,
    wallColorBase,
    wallNormalBase,
    wallRoughnessBase,
    wallMetalnessBase,
    concreteDiffBase,
    roomAccent,
    roomPrimary,
  ]);

  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0d1118,
    map: textures.metalColor,
    normalMap: textures.metalNormal,
    normalScale: new THREE.Vector2(0.62, 0.62),
    roughnessMap: textures.metalRoughness,
    metalnessMap: textures.metalness,
    metalness: 0.08,
    roughness: 0.92,
    envMapIntensity: 0.03,
    emissive: new THREE.Color(roomPrimary),
    emissiveIntensity: 0.018,
  }), [roomPrimary, textures.metalColor, textures.metalNormal, textures.metalRoughness, textures.metalness]);

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x171b22,
    map: textures.wallColor,
    normalMap: textures.wallNormal,
    normalScale: new THREE.Vector2(0.72, 0.72),
    roughnessMap: textures.wallRoughness,
    metalnessMap: textures.wallMetalness,
    metalness: 0.34,
    roughness: 0.76,
    envMapIntensity: 0.16,
    emissive: new THREE.Color(roomPrimary),
    emissiveIntensity: 0.018,
  }), [roomPrimary, textures.wallColor, textures.wallMetalness, textures.wallNormal, textures.wallRoughness]);

  const trimMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: roomPrimary,
    transparent: true,
    opacity: 0.38,
    toneMapped: false,
  }), [roomPrimary]);

  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x181d26,
    map: textures.wallColor,
    normalMap: textures.wallNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: textures.wallRoughness,
    metalnessMap: textures.wallMetalness,
    metalness: 0.42,
    roughness: 0.58,
    envMapIntensity: 0.18,
    emissive: new THREE.Color(roomPrimary),
    emissiveIntensity: 0.025,
  }), [roomPrimary, textures.wallColor, textures.wallMetalness, textures.wallNormal, textures.wallRoughness]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.061, 0]} renderOrder={1}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshBasicMaterial
          color={0x02040a}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.062, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshBasicMaterial
          map={textures.floorPanel}
          transparent
          opacity={0.12}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, 0]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_HALF]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, ROOM_HALF]} rotation={[0, Math.PI, 0]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[-ROOM_HALF, ROOM_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[ROOM_HALF, ROOM_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
      </mesh>
      {[-8, -4, 0, 4, 8].map(x => (
        <group key={`floor-${x}`}>
          <mesh position={[x, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} material={trimMat}>
            <planeGeometry args={[0.035, ROOM_SIZE * 0.92]} />
          </mesh>
          <mesh position={[0, 0.056, x]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={trimMat}>
            <planeGeometry args={[0.035, ROOM_SIZE * 0.92]} />
          </mesh>
        </group>
      ))}
      {[-8, -4, 0, 4, 8].map(x => (
        <group key={`wall-panels-${x}`}>
          <mesh position={[x, ROOM_HEIGHT * 0.55, -ROOM_HALF + 0.025]} material={panelMat}>
            <boxGeometry args={[2.5, ROOM_HEIGHT * 0.58, 0.05]} />
          </mesh>
          <mesh position={[x, ROOM_HEIGHT * 0.55, ROOM_HALF - 0.025]} material={panelMat}>
            <boxGeometry args={[2.5, ROOM_HEIGHT * 0.58, 0.05]} />
          </mesh>
          <mesh position={[-ROOM_HALF + 0.025, ROOM_HEIGHT * 0.55, x]} material={panelMat}>
            <boxGeometry args={[0.05, ROOM_HEIGHT * 0.58, 2.5]} />
          </mesh>
          <mesh position={[ROOM_HALF - 0.025, ROOM_HEIGHT * 0.55, x]} material={panelMat}>
            <boxGeometry args={[0.05, ROOM_HEIGHT * 0.58, 2.5]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map(s => (
        <group key={`ceiling-rail-${s}`}>
          <mesh position={[0, ROOM_HEIGHT - 0.18, s * 4.25]} material={trimMat}>
            <boxGeometry args={[ROOM_SIZE * 0.74, 0.035, 0.035]} />
          </mesh>
          <mesh position={[s * 4.25, ROOM_HEIGHT - 0.2, 0]} material={trimMat}>
            <boxGeometry args={[0.035, 0.035, ROOM_SIZE * 0.74]} />
          </mesh>
        </group>
      ))}
      {[0, 1, 2, 3].map(i => {
        const a = (i * Math.PI) / 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * ROOM_HALF, 0.05, Math.cos(a) * ROOM_HALF]}
            rotation={[0, a, 0]}
            material={trimMat}
          >
            <boxGeometry args={[ROOM_SIZE, 0.1, 0.1]} />
          </mesh>
        );
      })}
    </group>
  );
}
