'use client';
import { Html } from '@react-three/drei';
import { useState } from 'react';
import type { Station } from '../world/layout';
import { paletteFor } from '../colors';
import { api } from '@/lib/api';

function ledColor(status: string): string {
  if (status === 'running') return '#22c55e';
  if (status === 'sleeping') return '#f59e0b';
  if (status === 'error') return '#ef4444';
  return '#6b7280';
}

interface Props {
  station: Station;
  framework: string;
  agentId: string;
  status: string;
  onStatusChange: () => void;
  onOpenPanel: () => void;
  isNear?: boolean;
}

export function StatusConsole({
  station,
  framework,
  agentId,
  status,
  onStatusChange,
  onOpenPanel,
  isNear,
}: Props) {
  const palette = paletteFor(framework);
  const [busy, setBusy] = useState(false);

  const toggleDirect = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (status === 'running') await api.stopAgent(agentId);
      else await api.startAgent(agentId);
      onStatusChange();
    } catch {
      // swallow — panel lets user retry with visible error
    } finally {
      setBusy(false);
    }
  };

  return (
    <group position={station.position} rotation={[0, station.rotationY, 0]}>
      {/* Console body — click opens full panel */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow onClick={onOpenPanel}>
        <boxGeometry args={[2.4, 1.2, 1.0]} />
        <meshStandardMaterial color={0x1d1d25} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Trim */}
      <mesh position={[0, 1.22, 0]}>
        <boxGeometry args={[2.45, 0.04, 1.05]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} />
      </mesh>
      {/* Big LED ring — direct click toggles run state */}
      <mesh position={[0, 1.4, 0.3]} onClick={toggleDirect}>
        <torusGeometry args={[0.32, 0.07, 12, 48]} />
        <meshBasicMaterial color={ledColor(status)} toneMapped={false} />
      </mesh>
      {/* Fill the ring with a darker disc so it reads as a big button */}
      <mesh position={[0, 1.4, 0.29]}>
        <circleGeometry args={[0.27, 24]} />
        <meshStandardMaterial color={0x0b0b12} emissive={ledColor(status)} emissiveIntensity={0.25} />
      </mesh>
      <Html position={[0, 2.1, 0]} center distanceFactor={10}>
        <div
          className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-white backdrop-blur"
          style={{
            borderColor: palette.primary,
            background: isNear ? `${palette.primary}cc` : 'rgba(0,0,0,0.55)',
            color: isNear ? '#000' : '#fff',
          }}
        >
          ⚡ Status · {status}
        </div>
      </Html>
    </group>
  );
}
