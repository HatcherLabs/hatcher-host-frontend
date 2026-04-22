'use client';
import { useEffect, useMemo, useState } from 'react';
import { AgentRoomScene } from '@/components/agent-room/AgentRoomScene';
import { LiveViewers } from '@/components/agent-room/hud/LiveViewers';
import { paletteFor } from '@/components/agent-room/colors';
import type { RoomAgent, RoomIntegration } from '@/components/agent-room/types';
import { API_URL } from '@/lib/config';

interface Props {
  id: string;
}

interface PublicAgent {
  id: string;
  slug?: string | null;
  name: string;
  framework: string;
  status: string;
  messageCount?: number;
  createdAt?: string;
  avatarUrl?: string | null;
}

const FW_META: Record<string, { icon: string; label: string }> = {
  openclaw: { icon: '🦞', label: 'OpenClaw' },
  hermes: { icon: '🪶', label: 'Hermes' },
  elizaos: { icon: '🐙', label: 'ElizaOS' },
  milady: { icon: '🎨', label: 'Milady' },
};

export function EmbedRoomClient({ id }: Props) {
  const [agent, setAgent] = useState<RoomAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const palette = useMemo(() => paletteFor(agent?.framework ?? 'openclaw'), [agent?.framework]);
  const integrations: RoomIntegration[] = useMemo(() => [], []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/city`, { cache: 'no-store' });
        if (!res.ok) throw new Error('unreachable');
        const json = (await res.json()) as { data?: { agents?: PublicAgent[] } };
        const match = json.data?.agents?.find((a) => a.id === id || a.slug === id);
        if (!alive) return;
        if (!match) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setAgent({
          id: match.id,
          slug: match.slug ?? match.id,
          name: match.name,
          framework: match.framework,
          status: match.status,
          messageCount: match.messageCount ?? 0,
          createdAt: match.createdAt ?? '',
          isPublic: true,
          avatarUrl: match.avatarUrl,
        });
        setLoading(false);
      } catch {
        if (alive) {
          setNotFound(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black text-gray-500">
        <div className="text-xs uppercase tracking-[2px]">loading agent…</div>
      </main>
    );
  }
  if (notFound || !agent) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black text-gray-300">
        <div className="text-center">
          <div className="text-sm">Agent not found or not public.</div>
          <a
            href="https://hatcher.host"
            target="_parent"
            className="mt-2 inline-block text-xs uppercase tracking-[2px] text-yellow-400 underline"
          >
            → hatcher.host
          </a>
        </div>
      </main>
    );
  }

  const cssVars: React.CSSProperties = {
    // @ts-expect-error CSS custom properties
    '--room-primary': palette.primaryHex,
    '--room-dim': palette.dimHex,
    '--room-bright': palette.brightHex,
    '--room-border': `color-mix(in srgb, ${palette.primaryHex} 32%, transparent)`,
  };

  const meta = FW_META[agent.framework] ?? FW_META.openclaw!;

  return (
    <div className="fixed inset-0 bg-black text-gray-100" style={cssVars}>
      <AgentRoomScene
        palette={palette}
        integrations={integrations}
        snapTrigger={0}
        framework={agent.framework}
      />
      {/* Minimal tag chip — name + framework badge */}
      <div
        className="pointer-events-auto absolute top-3 left-3 z-10 rounded-xl border px-3 py-2 backdrop-blur-xl"
        style={{
          background: 'rgba(12, 14, 22, 0.72)',
          borderColor: 'var(--room-border)',
        }}
      >
        <div
          className="text-[9px] font-bold uppercase tracking-[2px]"
          style={{ color: palette.primaryHex }}
        >
          {meta.icon} {meta.label}
        </div>
        <div className="mt-0.5 text-sm font-bold text-gray-100">{agent.name}</div>
        <div className="text-[10px] text-gray-400">
          {agent.messageCount.toLocaleString()} messages
        </div>
      </div>
      {/* Open-in-Hatcher CTA */}
      <LiveViewers agentId={agent.id} />
      <a
        href={`https://hatcher.host/agent/${agent.id}/room`}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] backdrop-blur-xl transition-all hover:scale-105"
        style={{
          background: 'rgba(12, 14, 22, 0.82)',
          borderColor: palette.primaryHex,
          color: palette.brightHex,
          boxShadow: `0 0 18px ${palette.primaryHex}44`,
        }}
      >
        <span>Open in Hatcher</span>
        <span aria-hidden>↗</span>
      </a>
      {/* Tiny watermark */}
      <div
        className="pointer-events-none absolute bottom-3 left-3 z-10 text-[9px] uppercase tracking-[2px] text-gray-500"
      >
        powered by <span className="text-gray-300">hatcher.host</span>
      </div>
    </div>
  );
}
