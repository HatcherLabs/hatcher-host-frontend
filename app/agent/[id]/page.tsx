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
      title: 'Agent Not Found | Hatcher',
      description: 'This agent does not exist or has been removed.',
    };
  }

  const title = `${agent.name} | Hatcher`;
  const description =
    agent.description ?? `${agent.name} — an AI agent powered by ${agent.framework ?? 'OpenClaw'} on Hatcher.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Hatcher',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function AgentPage() {
  return <AgentPageClient />;
}
