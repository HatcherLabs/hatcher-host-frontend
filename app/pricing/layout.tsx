import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Free Tier, Starter, Pro & Business Plans',
  description:
    'Hatcher pricing plans: Free tier with 10 msgs/day, Starter $4.99/mo (50 msgs/day), Pro $14.99/mo (200 msgs/day), Business $39.99/mo (500 msgs/day). BYOK any LLM for unlimited messages. Pay with SOL or card.',
  keywords: [
    'AI agent pricing',
    'agent hosting plans',
    'free AI hosting',
    'BYOK pricing',
    'Hatcher plans',
    'Solana payments',
  ],
  openGraph: {
    title: 'Pricing — Free Tier, Starter, Pro & Business Plans | Hatcher',
    description:
      'Deploy AI agents free. Upgrade for more messages, dedicated resources, and file management. BYOK any LLM for unlimited usage.',
    url: 'https://hatcher.host/pricing',
    images: [
      {
        url: 'https://hatcher.host/og?title=Hatcher+Pricing&subtitle=Free+tier+included.+Starter+%244.99%2Fmo.+Pro+%2414.99%2Fmo.+Business+%2439.99%2Fmo.+BYOK+for+unlimited+messages.&tag=Pricing',
        width: 1200,
        height: 630,
        alt: 'Hatcher Pricing Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher Pricing — Free Tier Included',
    description: 'Deploy AI agents free. Upgrade for more messages and dedicated resources.',
    images: ['https://hatcher.host/og?title=Hatcher+Pricing&subtitle=Free+tier+included.+Starter+%244.99%2Fmo.+Pro+%2414.99%2Fmo.+Business+%2439.99%2Fmo.+BYOK+for+unlimited+messages.&tag=Pricing'],
  },
  alternates: { canonical: 'https://hatcher.host/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
