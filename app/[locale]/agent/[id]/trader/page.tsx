import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicProfile } from '@/lib/public-profile';
import type { PublicTraderData } from '@/lib/api';
import { PublicTraderPageClient } from './PublicTraderPageClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchPublicProfile<PublicTraderData>(`/agents/${encodeURIComponent(id)}/public-trader`);
  if (result.status === 'missing') notFound();
  if (result.status === 'unavailable') throw new Error('Public trader lookup temporarily unavailable');
  const trader = result.data;

  const symbol = trader.token?.symbol ?? 'agent token';
  const title = `${trader.agent.name} · $${symbol} trader`;
  const description = `Follow ${trader.agent.name}'s public Robinhood Chain portfolio, ${symbol} market activity and confirmed onchain trades.`;
  const canonical = `https://hatcher.host/agent/${encodeURIComponent(trader.agent.slug)}/trader`;
  const image = `https://hatcher.host/og?title=${encodeURIComponent(trader.agent.name)}&subtitle=${encodeURIComponent(`$${symbol} · Robinhood Chain`)}&tag=${encodeURIComponent('Public trader')}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Hatcher',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function PublicTraderPage() {
  return <PublicTraderPageClient />;
}
