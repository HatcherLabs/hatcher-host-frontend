'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FrameworkPalette } from '../three-palette';
import { V2Robot } from './V2Robot';

type AvatarVariant = 'openclaw-mech' | 'openclaw-drone' | 'hermes-oracle' | 'hermes-scribe' | 'robot';

interface Props {
  framework: string;
  agentId?: string;
  palette: FrameworkPalette;
  isStreaming?: boolean;
  status?: string;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickVariant(framework: string, agentId?: string): AvatarVariant {
  const key = framework.toLowerCase();
  const seed = hashString(`${key}:${agentId ?? 'default'}`);
  if (key === 'openclaw') return seed % 2 === 0 ? 'openclaw-mech' : 'openclaw-drone';
  if (key === 'hermes') return seed % 2 === 0 ? 'hermes-oracle' : 'hermes-scribe';
  return 'robot';
}

function pulseFor(status?: string): number {
  if (status === 'active' || status === 'running') return 1.15;
  if (status === 'starting') return 1.35;
  if (status === 'error') return 1.6;
  return 0.72;
}

function statusColor(status: string | undefined, palette: FrameworkPalette): number {
  if (status === 'error' || status === 'crashed') return 0xff3b5c;
  if (status === 'starting') return 0xf59e0b;
  if (status === 'paused' || status === 'sleeping') return 0x94a3b8;
  return palette.primary;
}

function AgentStatusAura({
  palette,
  isStreaming,
  status,
}: Pick<Props, 'palette' | 'isStreaming' | 'status'>) {
  const floor = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const color = statusColor(status, palette);
  const pulse = pulseFor(status);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (floor.current) {
      floor.current.rotation.z = t * 0.36;
      const s = 1 + Math.sin(t * 2.6) * 0.025 * pulse;
      floor.current.scale.set(s, s, 1);
    }
    if (orbit.current) {
      orbit.current.rotation.y = t * (isStreaming ? 0.72 : 0.28);
      orbit.current.rotation.z = Math.sin(t * 0.5) * 0.08;
    }
    bars.current.forEach((bar, i) => {
      if (!bar) return;
      const active = isStreaming ? 1 : 0.28;
      const h = 0.18 + active * (0.28 + Math.sin(t * 7 + i * 0.75) * 0.18);
      bar.scale.y = Math.max(0.08, h);
      const mat = bar.material as THREE.MeshBasicMaterial;
      mat.opacity += ((isStreaming ? 0.82 : 0.22) - mat.opacity) * 0.14;
    });
  });

  return (
    <group>
      <group ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <mesh>
          <ringGeometry args={[1.14, 1.2, 80]} />
          <meshBasicMaterial
            color={color}
            toneMapped={false}
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <ringGeometry args={[1.44, 1.48, 80]} />
          <meshBasicMaterial
            color={palette.bright}
            toneMapped={false}
            transparent
            opacity={isStreaming ? 0.42 : 0.18}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={orbit} position={[0, 1.55, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.18, 0.012, 8, 96]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.36} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.32, 0.01, 8, 96]} />
          <meshBasicMaterial
            color={palette.bright}
            toneMapped={false}
            transparent
            opacity={isStreaming ? 0.46 : 0.2}
          />
        </mesh>
      </group>

      <group position={[0, 2.72, 0.28]}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh
            key={i}
            ref={(m) => {
              bars.current[i] = m;
            }}
            position={[(i - 2) * 0.16, 0, 0]}
          >
            <boxGeometry args={[0.07, 0.7, 0.045]} />
            <meshBasicMaterial
              color={i % 2 ? palette.bright : color}
              toneMapped={false}
              transparent
              opacity={0.2}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function OpenClawMech({ palette, isStreaming, status }: Omit<Props, 'framework' | 'agentId'>) {
  const root = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (root.current) {
      root.current.position.y = Math.sin(t * 1.4) * 0.035;
      root.current.rotation.y = Math.sin(t * 0.42) * 0.07;
    }
    if (head.current) head.current.rotation.y = Math.sin(t * 0.85) * 0.18;
    const talk = isStreaming ? Math.sin(t * 7) * 0.35 : Math.sin(t * 1.2) * 0.08;
    if (leftArm.current) leftArm.current.rotation.z = -0.34 + talk;
    if (rightArm.current) rightArm.current.rotation.z = 0.34 - talk;
  });

  return (
    <group ref={root} scale={[1.05, 1.05, 1.05]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.58, 0.72, 0.38, 8]} />
        <meshStandardMaterial color={0x1e1e25} metalness={0.9} roughness={0.32} />
      </mesh>

      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.34, 0.7, 0]}>
          <mesh>
            <boxGeometry args={[0.22, 0.85, 0.22]} />
            <meshStandardMaterial color={0x202027} metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.5, 0.08]}>
            <boxGeometry args={[0.38, 0.12, 0.46]} />
            <meshStandardMaterial color={0x16161d} metalness={0.82} roughness={0.42} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[0.95, 0.92, 0.62]} />
        <meshStandardMaterial
          color={0x22212a}
          metalness={0.92}
          roughness={0.28}
          emissive={palette.primary}
          emissiveIntensity={0.08 * pulse}
        />
      </mesh>
      <mesh position={[0, 1.46, 0.34]}>
        <circleGeometry args={[0.24, 32]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} transparent opacity={0.78} />
      </mesh>

      <group ref={head} position={[0, 2.12, 0]}>
        <mesh>
          <boxGeometry args={[0.7, 0.42, 0.48]} />
          <meshStandardMaterial color={0x272630} metalness={0.86} roughness={0.3} emissive={palette.primary} emissiveIntensity={0.06} />
        </mesh>
        <mesh position={[0, 0, 0.26]}>
          <boxGeometry args={[0.46, 0.08, 0.03]} />
          <meshBasicMaterial color={palette.bright} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
          <meshStandardMaterial color={0x2a2a32} metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color={palette.primary} toneMapped={false} />
        </mesh>
      </group>

      {[-1, 1].map((s) => (
        <group key={s} ref={s < 0 ? leftArm : rightArm} position={[s * 0.62, 1.72, 0]} rotation={[0, 0, s * 0.34]}>
          <mesh position={[s * 0.22, -0.32, 0]}>
            <boxGeometry args={[0.2, 0.72, 0.18]} />
            <meshStandardMaterial color={0x202027} metalness={0.9} roughness={0.32} />
          </mesh>
          <mesh position={[s * 0.34, -0.78, 0]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color={0x2a2930} metalness={0.9} roughness={0.28} emissive={palette.bright} emissiveIntensity={0.08} />
          </mesh>
          {[-1, 1].map((claw) => (
            <mesh key={claw} position={[s * (0.4 + claw * 0.04), -0.96, claw * 0.09]} rotation={[0.35 * claw, 0, 0]}>
              <boxGeometry args={[0.08, 0.26, 0.04]} />
              <meshBasicMaterial color={palette.primary} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function OpenClawDrone({ palette, isStreaming, status }: Omit<Props, 'framework' | 'agentId'>) {
  const root = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (root.current) {
      root.current.position.y = 1.35 + Math.sin(t * 1.6) * 0.09;
      root.current.rotation.y = Math.sin(t * 0.35) * 0.16;
    }
    if (rotor.current) rotor.current.rotation.y += isStreaming ? 0.42 : 0.16;
  });

  return (
    <group ref={root}>
      <mesh>
        <sphereGeometry args={[0.58, 28, 20]} />
        <meshStandardMaterial color={0x24232c} metalness={0.86} roughness={0.27} emissive={palette.primary} emissiveIntensity={0.08 * pulse} />
      </mesh>
      <mesh position={[0, 0, 0.48]}>
        <circleGeometry args={[0.26, 32]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <group ref={rotor} position={[0, 0.58, 0]}>
        {[0, Math.PI / 2].map((r) => (
          <mesh key={r} rotation={[0, r, 0]}>
            <boxGeometry args={[1.5, 0.035, 0.12]} />
            <meshBasicMaterial color={palette.bright} toneMapped={false} transparent opacity={0.62} />
          </mesh>
        ))}
      </group>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.92, -0.08, Math.sin(a) * 0.92]}>
            <mesh>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshBasicMaterial color={palette.primary} toneMapped={false} />
            </mesh>
            <mesh rotation={[0, a, 0]}>
              <boxGeometry args={[0.8, 0.035, 0.035]} />
              <meshStandardMaterial color={0x25242d} metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, -0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.48, 40]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} transparent opacity={isStreaming ? 0.9 : 0.42} />
      </mesh>
    </group>
  );
}

function HermesOracle({ palette, isStreaming, status }: Omit<Props, 'framework' | 'agentId'>) {
  const root = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (root.current) {
      root.current.position.y = Math.sin(t * 1.1) * 0.045;
      root.current.rotation.y = Math.sin(t * 0.28) * 0.12;
    }
    if (rings.current) {
      rings.current.rotation.y = t * (isStreaming ? 0.65 : 0.28);
      rings.current.rotation.x = Math.sin(t * 0.35) * 0.18;
    }
  });

  return (
    <group ref={root}>
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[0.72, 1.45, 5]} />
        <meshStandardMaterial color={0x1e1728} metalness={0.24} roughness={0.78} emissive={palette.primary} emissiveIntensity={0.05 * pulse} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.34, 22, 18]} />
        <meshStandardMaterial color={0x241832} metalness={0.42} roughness={0.48} emissive={palette.primary} emissiveIntensity={0.12 * pulse} />
      </mesh>
      <mesh position={[0, 1.54, 0.3]}>
        <circleGeometry args={[0.16, 32]} />
        <meshBasicMaterial color={palette.bright} toneMapped={false} transparent opacity={0.82} />
      </mesh>

      <group ref={rings} position={[0, 1.55, 0]}>
        {[0, Math.PI / 2, Math.PI / 4].map((r, i) => (
          <mesh key={i} rotation={[r, i === 2 ? Math.PI / 3 : 0, 0]}>
            <torusGeometry args={[0.82 + i * 0.16, 0.015, 8, 72]} />
            <meshBasicMaterial color={i === 1 ? palette.bright : palette.primary} toneMapped={false} transparent opacity={0.72} />
          </mesh>
        ))}
      </group>

      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.05, 1.05 + i * 0.2, Math.sin(a) * 1.05]} rotation={[0, -a + Math.PI / 2, 0]}>
            <boxGeometry args={[0.34, 0.46, 0.025]} />
            <meshStandardMaterial color={0x261a34} metalness={0.28} roughness={0.64} emissive={palette.primary} emissiveIntensity={0.18} />
          </mesh>
        );
      })}
    </group>
  );
}

function HermesScribe({ palette, isStreaming, status }: Omit<Props, 'framework' | 'agentId'>) {
  const root = useRef<THREE.Group>(null);
  const pages = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (root.current) root.current.position.y = Math.sin(t * 1.2) * 0.05;
    if (pages.current) pages.current.rotation.y = t * (isStreaming ? 0.5 : 0.22);
  });

  return (
    <group ref={root}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.52, 0.72, 0.72, 6]} />
        <meshStandardMaterial color={0x1d1627} metalness={0.34} roughness={0.74} />
      </mesh>
      <mesh position={[0, 1.28, 0]}>
        <boxGeometry args={[0.75, 0.88, 0.44]} />
        <meshStandardMaterial color={0x241832} metalness={0.32} roughness={0.58} emissive={palette.primary} emissiveIntensity={0.08 * pulse} />
      </mesh>
      <mesh position={[0, 1.88, 0]}>
        <sphereGeometry args={[0.28, 20, 18]} />
        <meshStandardMaterial color={0x2a1d3a} metalness={0.36} roughness={0.45} emissive={palette.bright} emissiveIntensity={0.08 * pulse} />
      </mesh>
      <mesh position={[0, 1.88, 0.26]}>
        <boxGeometry args={[0.38, 0.07, 0.025]} />
        <meshBasicMaterial color={palette.bright} toneMapped={false} />
      </mesh>

      <group ref={pages} position={[0, 1.32, 0]}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.92, Math.sin(i) * 0.16, Math.sin(a) * 0.92]}
              rotation={[0, -a + Math.PI / 2, 0]}
            >
              <boxGeometry args={[0.28, 0.38, 0.018]} />
              <meshBasicMaterial color={i % 2 ? palette.primary : palette.bright} toneMapped={false} transparent opacity={0.54} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

export function AgentBody({ framework, agentId, palette, isStreaming, status }: Props) {
  const variant = useMemo(() => pickVariant(framework, agentId), [framework, agentId]);
  const body = (() => {
    switch (variant) {
      case 'openclaw-mech':
        return <OpenClawMech palette={palette} isStreaming={isStreaming} status={status} />;
      case 'openclaw-drone':
        return <OpenClawDrone palette={palette} isStreaming={isStreaming} status={status} />;
      case 'hermes-oracle':
        return <HermesOracle palette={palette} isStreaming={isStreaming} status={status} />;
      case 'hermes-scribe':
        return <HermesScribe palette={palette} isStreaming={isStreaming} status={status} />;
      default:
        return <V2Robot palette={palette} isStreaming={isStreaming} />;
    }
  })();

  return (
    <group>
      <AgentStatusAura palette={palette} isStreaming={isStreaming} status={status} />
      {body}
    </group>
  );
}
