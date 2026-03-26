import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Free Tier, Basic & Pro Plans',
  description:
    'Hatcher pricing plans: Free tier with 20 msgs/day, Basic $9.99/mo (100 msgs/day), Pro $19.99/mo (300 msgs/day). BYOK any LLM for unlimited messages. Pay with SOL or card.',
  keywords: [
    'AI agent pricing',
    'agent hosting plans',
    'free AI hosting',
    'BYOK pricing',
    'Hatcher plans',
    'Solana payments',
  ],
  openGraph: {
    title: 'Pricing — Free Tier, Basic & Pro Plans | Hatcher',
    description:
      'Deploy AI agents free. Upgrade for more messages, dedicated resources, and file management. BYOK any LLM for unlimited usage.',
    url: 'https://hatcher.host/pricing',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher Pricing — Free Tier Included',
    description: 'Deploy AI agents free. Upgrade for more messages and dedicated resources.',
  },
  alternates: { canonical: 'https://hatcher.host/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
