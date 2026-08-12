import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AgentEmbedChat } from '@/components/embed/AgentEmbedChat';

export const metadata: Metadata = {
  title: 'Embedded agent chat',
  robots: { index: false, follow: false },
};

export default async function EmbeddedAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/u.test(id)) notFound();
  return <AgentEmbedChat agentId={id} />;
}
