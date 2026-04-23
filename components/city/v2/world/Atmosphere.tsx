'use client';
import { Sparkles } from '@react-three/drei';
import { useQuality } from '../quality/QualityContext';
import { WORLD_HALF } from './grid';

/**
 * Ambient cyber mist — drei Sparkles drifting above street level.
 * Zero cost on a modern GPU (GPU points), reads as atmospheric depth
 * when walking or orbiting. Two layers (low magenta mist + high cyan
 * sparks) so there's something everywhere the camera points.
 */
export function Atmosphere() {
  const quality = useQuality();
  const low = quality === 'high' ? 900 : 250;
  const high = quality === 'high' ? 600 : 180;

  return (
    <group>
      {/* Ground-level purple mist */}
      <Sparkles
        count={low}
        scale={[WORLD_HALF * 1.8, 12, WORLD_HALF * 1.8]}
        position={[0, 6, 0]}
        color={'#d855ff'}
        size={2.4}
        speed={0.25}
        opacity={0.5}
        noise={0.4}
      />
      {/* Upper-air cyan data sparks */}
      <Sparkles
        count={high}
        scale={[WORLD_HALF * 1.6, 40, WORLD_HALF * 1.6]}
        position={[0, 28, 0]}
        color={'#7ad8ff'}
        size={1.8}
        speed={0.15}
        opacity={0.75}
        noise={0.2}
      />
    </group>
  );
}
