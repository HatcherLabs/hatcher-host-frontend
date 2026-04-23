import type { Metadata } from 'next';
import { EmbedRoomClient } from './EmbedRoomClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'Hatcher Agent · Embed',
    alternates: { canonical: `/embed/agent/${id}` },
    robots: { index: false },
  };
}

export default async function EmbedAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmbedRoomClient id={id} />;
}
