import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import { AgentRoomClient } from './AgentRoomClient';

interface PublicAgent {
  id: string;
  slug?: string | null;
  name: string;
  framework: string;
  isPublic?: boolean;
}

async function fetchPublicAgent(id: string): Promise<PublicAgent | null> {
  try {
    const res = await fetch(`${API_URL}/public/city`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success?: boolean;
      data?: { agents?: PublicAgent[] };
    };
    return json.data?.agents?.find((a) => a.id === id || a.slug === id) ?? null;
  } catch {
    return null;
  }
}

const FRAMEWORK_ICON: Record<string, string> = {
  openclaw: '🦞',
  hermes: '🪶',
  elizaos: '🐙',
  milady: '🎨',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const agent = await fetchPublicAgent(id);

  if (!agent) {
    return {
      title: 'Agent Room · Hatcher',
      description: 'Gamified 3D interface for your Hatcher agent.',
      alternates: { canonical: `/agent/${id}/room` },
      robots: { index: false },
    };
  }

  const icon = FRAMEWORK_ICON[agent.framework] ?? '✨';
  const title = `${icon} ${agent.name} · Agent Room · Hatcher`;
  const description = `Enter the live 3D room for ${agent.name} on Hatcher. Built on ${agent.framework}. Watch it think, chat, and run real tools.`;

  return {
    title,
    description,
    alternates: { canonical: `/agent/${agent.id}/room` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://hatcher.host/agent/${agent.id}/room`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function AgentRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentRoomClient id={id} />;
}
