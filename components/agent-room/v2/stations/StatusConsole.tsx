'use client';
import { Html } from '@react-three/drei';
import { useState } from 'react';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { api } from '@/lib/api';
import { ProximityHalo } from './ProximityHalo';
import { MetalBox, NeonBar, Screen } from './CyberParts';

function ledColor(status: string): string {
  if (status === 'active' || status === 'running') return '#22c55e';
  if (status === 'starting') return '#3b82f6';
  if (status === 'sleeping' || status === 'paused' || status === 'dormant') return '#f59e0b';
  if (status === 'error') return '#ef4444';
  return '#6b7280';
}

interface Props {
  station: Station;
  framework: string;
  agentId: string;
  status: string;
  canEdit: boolean;
  onStatusChange: () => void;
  onOpenPanel: () => void;
  isNear?: boolean;
  hideLabel?: boolean;
}

export function StatusConsole({
  station,
  framework,
  agentId,
  status,
  canEdit,
  onStatusChange,
  onOpenPanel,
  isNear,
  hideLabel,
}: Props) {
  const palette = paletteFor(framework);
  const edgeColor = palette.primary;
  const [busy, setBusy] = useState(false);
  const led = ledColor(status);

  const toggleDirect = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (busy) return;
    if (!canEdit) {
      onOpenPanel();
      return;
    }
    setBusy(true);
    try {
      const isUp = status === 'active' || status === 'running' || status === 'starting';
      const res = isUp ? await api.stopAgent(agentId) : await api.startAgent(agentId);
      if (res.success) onStatusChange();
    } catch {
      // swallow
    } finally {
      setBusy(false);
    }
  };

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]}>
      <ProximityHalo color={edgeColor} active={!!isNear} />

      {/* Curved-front console — flat bottom, sloped top */}
      <MetalBox size={[2.6, 0.9, 1.1]} position={[0, 0.45, 0]} />
      {/* Sloped top slab (tilt -20° forward) */}
      <group position={[0, 0.95, -0.1]} rotation={[-0.35, 0, 0]}>
        <MetalBox size={[2.5, 0.08, 0.9]} />
      </group>

      {/* Front neon trim along the top edge of the base */}
      <NeonBar start={[-1.28, 0.91, 0.52]} end={[1.28, 0.91, 0.52]} color={edgeColor} thickness={0.04} />
      {/* Side verticals on the base */}
      <NeonBar start={[-1.32, 0.02, 0.54]} end={[-1.32, 0.9, 0.54]} color={edgeColor} thickness={0.03} />
      <NeonBar start={[1.32, 0.02, 0.54]} end={[1.32, 0.9, 0.54]} color={edgeColor} thickness={0.03} />

      {/* Console click target — opens panel */}
      <mesh position={[0, 0.55, 0.3]} onClick={onOpenPanel}>
        <boxGeometry args={[2.3, 0.8, 0.6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Sloped display showing agent status */}
      <group position={[0, 1.0, 0.25]} rotation={[-0.35, 0, 0]}>
        <Screen
          size={[1.8, 0.6]}
          position={[0, 0, 0.02]}
          color={palette.primary}
          intensity={isNear ? 1 : 0.7}
        />
      </group>

      {/* Big status LED ring — raised slightly above the desk, tilted forward */}
      <group position={[0, 1.35, 0.5]} rotation={[-0.4, 0, 0]}>
        <mesh onClick={toggleDirect}>
          <torusGeometry args={[0.3, 0.08, 16, 48]} />
          <meshBasicMaterial color={led} toneMapped={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.26, 32]} />
          <meshStandardMaterial
            color={0x05050a}
            emissive={led}
            emissiveIntensity={0.6}
            metalness={0.2}
            roughness={0.4}
          />
        </mesh>
        {/* Inner pulse dot */}
        <mesh position={[0, 0, 0.005]}>
          <circleGeometry args={[0.08, 24]} />
          <meshBasicMaterial color={led} toneMapped={false} />
        </mesh>
      </group>

      {!hideLabel && (
        <Html position={[0, 2.15, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
          <div
            className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
            style={{ borderColor: edgeColor, background: 'rgba(0,0,0,0.55)' }}
          >
            ⚡ Status · {status}
          </div>
        </Html>
      )}
    </group>
  );
}
