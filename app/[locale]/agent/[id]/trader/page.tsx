import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import type { PublicTraderData } from '@/lib/api';
import { PublicTraderPageClient } from './PublicTraderPageClient';

type PublicTraderEnvelope = {
  success: boolean;
  data?: PublicTraderData;
};

async function fetchTrader(id: string): Promise<PublicTraderData | null> {
  try {
    const response = await fetch(
      `${API_URL}/agents/${encodeURIComponent(id)}/public-trader`,
      { next: { revalidate: 30 } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as PublicTraderEnvelope;
    return body.success ? body.data ?? null : null;
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
  const trader = await fetchTrader(id);
  if (!trader) {
    return {
      title: 'Trader page unavailable',
      description: 'This public Hatcher trader page is not available.',
      robots: { index: false, follow: false },
    };
  }

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
