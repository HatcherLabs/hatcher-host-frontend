'use client';
import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Platform } from './Platform';
import { Sparkles } from './Sparkles';
import { MechLobster } from './MechLobster';
import { IntegrationsOrbit } from './IntegrationsOrbit';
import type { FrameworkPalette } from './colors';
import type { RoomIntegration } from './types';

interface Props {
  palette: FrameworkPalette;
  integrations: RoomIntegration[];
  snapTrigger: number;
}

export function AgentRoomScene({ palette, integrations, snapTrigger }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Canvas
      camera={{ position: [3.2, 2.2, 7.2], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, background: '#05060a' }}
    >
      <fog attach="fog" args={[0x050810, 8, 30]} />
      <ambientLight intensity={0.4} color={0x3a3f55} />
      <directionalLight position={[5, 8, 4]} intensity={1.4} color={0xffe899} />
      <pointLight
        position={[-3, 2.6, -3]}
        intensity={2.0}
        distance={18}
        decay={1.6}
        color={palette.primary}
      />
      <pointLight position={[3, 1.5, 3]} intensity={0.6} distance={16} decay={1.8} color={0x4466aa} />

      <Platform palette={palette} />
      <MechLobster palette={palette} snapTrigger={snapTrigger} />
      <IntegrationsOrbit palette={palette} integrations={integrations} />
      <Sparkles palette={palette} />

      <OrbitControls
        enableDamping
        target={[0, 1.2, 0]}
        minDistance={5}
        maxDistance={16}
        minPolarAngle={0.4}
        maxPolarAngle={1.6}
      />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom intensity={0.9} luminanceThreshold={0.35} luminanceSmoothing={0.15} mipmapBlur radius={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
