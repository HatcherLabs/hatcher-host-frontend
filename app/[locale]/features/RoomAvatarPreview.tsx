'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AgentBody } from '@/components/agent-room/v2/stations/AgentBody';
import { paletteFor } from '@/components/agent-room/v2/three-palette';

export default function RoomAvatarPreview() {
  const palette = paletteFor('openclaw');

  return (
    <Canvas
      camera={{ position: [0, 1.18, 7.2], fov: 34 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[2.8, 4.2, 4.8]} intensity={2.4} />
      <pointLight position={[-2.8, 1.8, 2.2]} color="#4a778b" intensity={0.8} />
      <Suspense fallback={null}>
        <group
          position={[-0.62, -1.04, 0]}
          scale={0.78}
          rotation={[0, 0.16, 0]}
        >
          <AgentBody
            framework="openclaw"
            agentId="features-mecha-preview"
            palette={palette}
            isStreaming
            status="active"
            avatarVariant="hatcher-hatchling-operator"
            activeEmote="scan"
            showStatusAura={false}
          />
        </group>
        <group
          position={[1.12, -0.74, -0.15]}
          scale={0.72}
          rotation={[0, -0.28, 0]}
        >
          <AgentBody
            framework="openclaw"
            agentId="features-drone-preview"
            palette={palette}
            isStreaming
            status="active"
            avatarVariant="hatcher-hatchling-service"
            activeEmote="scan"
            showStatusAura={false}
          />
        </group>
      </Suspense>
    </Canvas>
  );
}
