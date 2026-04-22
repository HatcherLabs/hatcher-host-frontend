'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { HexPlatform } from './HexPlatform';
import { Sparkles } from './Sparkles';
import { Starfield } from './Starfield';
import { LightRay } from './LightRay';
import { Environment } from './Environment';
import { Pet } from './Pet';
import { MechLobster } from './MechLobster';
import { MechMessenger } from './MechMessenger';
import { MechHydra } from './MechHydra';
import { MechMuse } from './MechMuse';
import { GlbRobot } from './GlbRobot';
import { IntegrationsOrbit } from './IntegrationsOrbit';
import type { FrameworkPalette } from './colors';
import type { RoomIntegration } from './types';

interface Props {
  palette: FrameworkPalette;
  integrations: RoomIntegration[];
  snapTrigger: number;
  framework: string;
  avatarStyle?: 'procedural' | 'expressive';
  onIntegrationClick?: (key: string) => void;
}

function Avatar({
  framework,
  palette,
  snapTrigger,
  avatarStyle = 'procedural',
}: {
  framework: string;
  palette: FrameworkPalette;
  snapTrigger: number;
  avatarStyle?: 'procedural' | 'expressive';
}) {
  // Expressive path wraps in a Suspense so the scene stays mounted while
  // the glTF loads from the three.js examples CDN (first visit ~800ms).
  if (avatarStyle === 'expressive') {
    return (
      <Suspense fallback={null}>
        <GlbRobot palette={palette} snapTrigger={snapTrigger} framework={framework} />
      </Suspense>
    );
  }
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

/**
 * Derives a lighting palette from the viewer's local time of day so rooms
 * visited at different hours feel alive (dawn pink, midday warm, dusk
 * purple-orange, deep-night blue). Cross-blends between four anchor
 * presets using a smooth cosine between hour buckets.
 */
function useTimeOfDay() {
  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const PRESETS: Record<'dawn' | 'day' | 'dusk' | 'night', {
      bg: string;
      fog: number;
      ambient: number;
      ambientColor: number;
      keyColor: number;
      keyIntensity: number;
      hemiColor: number;
      hemiIntensity: number;
    }> = {
      dawn: { bg: 'radial-gradient(ellipse at 50% 40%, #3a2838 0%, #141420 55%, #08090f 100%)', fog: 0x18101a, ambient: 0.9, ambientColor: 0xffc89a, keyColor: 0xffc89a, keyIntensity: 2.4, hemiColor: 0xffb8a0, hemiIntensity: 0.7 },
      day: { bg: 'radial-gradient(ellipse at 50% 50%, #1a1f36 0%, #08090f 55%, #050608 100%)', fog: 0x080b16, ambient: 0.75, ambientColor: 0x4c5272, keyColor: 0xfff0c8, keyIntensity: 2.0, hemiColor: 0xa9b4ff, hemiIntensity: 0.55 },
      dusk: { bg: 'radial-gradient(ellipse at 50% 45%, #2a1d36 0%, #120a18 55%, #060408 100%)', fog: 0x1a0e1d, ambient: 0.65, ambientColor: 0xa06070, keyColor: 0xffa070, keyIntensity: 1.8, hemiColor: 0xc87ea0, hemiIntensity: 0.55 },
      night: { bg: 'radial-gradient(ellipse at 50% 55%, #0c1228 0%, #050812 60%, #020305 100%)', fog: 0x040810, ambient: 0.5, ambientColor: 0x2a3460, keyColor: 0xa0b8ff, keyIntensity: 1.3, hemiColor: 0x4060b0, hemiIntensity: 0.35 },
    };
    let preset: typeof PRESETS.day;
    if (hour >= 5 && hour < 8) preset = PRESETS.dawn;
    else if (hour >= 8 && hour < 18) preset = PRESETS.day;
    else if (hour >= 18 && hour < 21) preset = PRESETS.dusk;
    else preset = PRESETS.night;
    return preset;
  }, []);
}

export function AgentRoomScene({
  palette,
  integrations,
  snapTrigger,
  framework,
  avatarStyle = 'procedural',
  onIntegrationClick,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const tod = useTimeOfDay();
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
        background: tod.bg,
      }}
    >
      <fog attach="fog" args={[tod.fog, 14, 40]} />
      <ambientLight intensity={tod.ambient} color={tod.ambientColor} />
      <hemisphereLight args={[tod.hemiColor, 0x2a2030, tod.hemiIntensity]} />
      <directionalLight position={[5, 8, 4]} intensity={tod.keyIntensity} color={tod.keyColor} />
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

      <Starfield />
      <LightRay palette={palette} />
      <HexPlatform palette={palette} />
      <Environment framework={framework} palette={palette} />
      <Avatar
        framework={framework}
        palette={palette}
        snapTrigger={snapTrigger}
        avatarStyle={avatarStyle}
      />
      <Pet framework={framework} palette={palette} />
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
