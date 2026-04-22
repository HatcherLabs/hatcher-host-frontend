'use client';
import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Platform } from './Platform';
import { Sparkles } from './Sparkles';
import { MechLobster } from './MechLobster';
import { MechMessenger } from './MechMessenger';
import { MechHydra } from './MechHydra';
import { MechMuse } from './MechMuse';
import { IntegrationsOrbit } from './IntegrationsOrbit';
import type { FrameworkPalette } from './colors';
import type { RoomIntegration } from './types';

interface Props {
  palette: FrameworkPalette;
  integrations: RoomIntegration[];
  snapTrigger: number;
  framework: string;
  onIntegrationClick?: (key: string) => void;
}

function Avatar({
  framework,
  palette,
  snapTrigger,
}: {
  framework: string;
  palette: FrameworkPalette;
  snapTrigger: number;
}) {
  switch (framework) {
    case 'hermes':
      return <MechMessenger palette={palette} snapTrigger={snapTrigger} />;
    case 'elizaos':
      return <MechHydra palette={palette} snapTrigger={snapTrigger} />;
    case 'milady':
      return <MechMuse palette={palette} snapTrigger={snapTrigger} />;
    case 'openclaw':
    default:
      return <MechLobster palette={palette} snapTrigger={snapTrigger} />;
  }
}

export function AgentRoomScene({
  palette,
  integrations,
  snapTrigger,
  framework,
  onIntegrationClick,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Per-framework camera framing — some avatars are taller/shorter than the lobster baseline
  const orbitTargetY =
    framework === 'hermes' ? 1.4 : framework === 'elizaos' ? 1.3 : framework === 'milady' ? 1.3 : 1.2;
  const cameraZ =
    framework === 'hermes' ? 7.6 : framework === 'elizaos' ? 7.4 : framework === 'milady' ? 7.0 : 7.2;

  return (
    <Canvas
      camera={{ position: [3.2, 2.2, cameraZ], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      dpr={[1, 2]}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, #1a1f36 0%, #08090f 55%, #050608 100%)',
      }}
    >
      <fog attach="fog" args={[0x080b16, 14, 40]} />
      <ambientLight intensity={0.75} color={0x4c5272} />
      <hemisphereLight args={[0xa9b4ff, 0x2a2030, 0.55]} />
      <directionalLight position={[5, 8, 4]} intensity={2.0} color={0xfff0c8} />
      <directionalLight position={[-4, 6, -2]} intensity={0.8} color={0xb0c4ff} />
      <pointLight
        position={[-3, 2.6, -3]}
        intensity={2.6}
        distance={22}
        decay={1.6}
        color={palette.primary}
      />
      <pointLight position={[3, 1.5, 3]} intensity={0.9} distance={16} decay={1.8} color={0x6688cc} />
      <pointLight position={[0, 5, 0]} intensity={0.6} distance={12} decay={1.6} color={0xffffff} />

      <Platform palette={palette} />
      <Avatar framework={framework} palette={palette} snapTrigger={snapTrigger} />
      <IntegrationsOrbit
        palette={palette}
        integrations={integrations}
        onIntegrationClick={onIntegrationClick}
      />
      <Sparkles palette={palette} />

      <OrbitControls
        enableDamping
        target={[0, orbitTargetY, 0]}
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
