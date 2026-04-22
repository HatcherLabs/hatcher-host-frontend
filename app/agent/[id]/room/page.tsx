import type { Metadata } from 'next';
import { AgentRoomClient } from './AgentRoomClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'Agent Room · Hatcher',
    description: 'Gamified 3D interface for your Hatcher agent.',
    alternates: { canonical: `/agent/${id}/room` },
    robots: { index: false },
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
