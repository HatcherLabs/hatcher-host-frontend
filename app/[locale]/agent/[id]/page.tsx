import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicProfile } from '@/lib/public-profile';
import { AgentPageClient } from './AgentPageClient';

interface PublicAgent { name?: string; description?: string; framework?: string; slug?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchPublicProfile<PublicAgent>(`/agents/${encodeURIComponent(id)}`);
  if (result.status === 'missing') notFound();
  if (result.status === 'unavailable') throw new Error('Public agent lookup temporarily unavailable');
  const agent = result.data;

  const title = agent.name ?? 'AI Agent';
  const description =
    agent.description ?? `${title} — an AI agent powered by ${agent.framework ?? 'OpenClaw'} on Hatcher.`;
  const ogImage = `https://hatcher.host/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description.slice(0, 120))}&tag=${encodeURIComponent(agent.framework ?? 'AI Agent')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://hatcher.host/agent/${encodeURIComponent(agent.slug || id)}`,
      siteName: 'Hatcher',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: { canonical: `https://hatcher.host/agent/${encodeURIComponent(agent.slug || id)}` },
  };
}

export default function AgentPage() {
  return <AgentPageClient />;
}
