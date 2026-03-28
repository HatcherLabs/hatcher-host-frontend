import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import { AgentPageClient } from './AgentPageClient';

interface AgentApiResponse {
  success: boolean;
  data?: { name?: string; description?: string; framework?: string };
}

async function fetchAgent(id: string): Promise<AgentApiResponse['data'] | null> {
  try {
    const res = await fetch(`${API_URL}/agents/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as AgentApiResponse;
    return json.success ? json.data ?? null : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const agent = await fetchAgent(id);

  if (!agent) {
    return {
      title: 'Agent Not Found',
      description: 'This agent does not exist or has been removed.',
    };
  }

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
      url: `https://hatcher.host/agent/${id}`,
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
    alternates: { canonical: `https://hatcher.host/agent/${id}` },
  };
}

export default function AgentPage() {
  return <AgentPageClient />;
}
