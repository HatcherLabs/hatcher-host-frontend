import type { Metadata } from 'next';
import { API_URL, AUTR_DEPLOY_URL } from '@/lib/config';
import { buildLanguagesMap } from '@/lib/seo';
import { shouldSkipStaticApiFetch } from '@/lib/static-api-fetch';
import { AutrLiveTraderDashboard } from '@/components/autr-live-trader/AutrLiveTraderDashboard';
import type { AutrLiveTraderSnapshot } from '@/components/autr-live-trader/viewModel';

export const metadata: Metadata = {
  title: 'AUTR Live Trader',
  description: 'A public Hatcher live-test agent tracking real AUTR BUY and SELL webhook signals with guarded execution limits.',
  alternates: { canonical: '/autr-live-trader', languages: buildLanguagesMap('/autr-live-trader') },
  openGraph: {
    title: 'AUTR Live Trader · Hatcher',
    description: 'Watch real AUTR trading signals flow through a guarded Hatcher live-test agent.',
    url: 'https://hatcher.host/autr-live-trader',
    siteName: 'Hatcher',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AUTR Live Trader · Hatcher',
    description: 'Real AUTR signals, guarded wallet tracking, public PnL tracking.',
  },
};

async function fetchInitialSnapshot(): Promise<AutrLiveTraderSnapshot | null> {
  if (shouldSkipStaticApiFetch(API_URL)) return null;
  try {
    const response = await fetch(`${API_URL}/integrations/autr/live-trader`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as AutrLiveTraderSnapshot;
  } catch {
    return null;
  }
}

export default async function AutrLiveTraderPage() {
  const snapshot = await fetchInitialSnapshot();
  return (
    <AutrLiveTraderDashboard
      initialSnapshot={snapshot}
      apiUrl={API_URL}
      deployUrl={AUTR_DEPLOY_URL}
    />
  );
}
