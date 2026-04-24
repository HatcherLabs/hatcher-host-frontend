'use client';
import { Html } from '@react-three/drei';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { ProximityHalo } from './ProximityHalo';
import { KenneyModel } from './KenneyModel';

const PLATFORMS = ['discord', 'telegram', 'twitter', 'whatsapp', 'slack'] as const;

interface Props {
  station: Station;
  framework: string;
  connected: Set<string>;
  onClick: () => void;
  isNear?: boolean;
}

export function IntegrationsRack({ station, framework, connected, onClick, isNear }: Props) {
  const palette = paletteFor(framework);
  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]} onClick={onClick}>
      <ProximityHalo color={palette.primary} active={!!isNear} />
      {/* Server rack / generator — Kenney Space Kit CC0 */}
      <KenneyModel
        url="machine_generator.glb"
        scale={1.8}
        tint={palette.primary}
        tintAmount={0.15}
        emissive={palette.primary}
        emissiveIntensity={isNear ? 0.3 : 0.12}
      />
      {/* 5 platform LEDs mounted on the front of the rack */}
      {PLATFORMS.map((p, i) => {
        const on = connected.has(p);
        return (
          <mesh key={p} position={[-0.35 + (i - 2) * 0.18, 1.55, 0.82]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color={on ? '#22c55e' : '#525252'} toneMapped={false} />
          </mesh>
        );
      })}
      <Html position={[0, 2.4, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur transition"
          style={{
            borderColor: palette.primary,
            background: isNear ? `${palette.primary}cc` : 'rgba(0,0,0,0.55)',
            color: isNear ? '#000' : '#fff',
          }}
        >
          🔌 Integrations
        </div>
      </Html>
    </group>
  );
}
