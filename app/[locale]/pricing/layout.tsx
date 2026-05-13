import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Pricing — Free Tier, Starter, Pro & Business Plans',
  description:
    'Hatcher pricing: Free tier included. Starter $6.99/mo, Pro $19.99/mo, Business $49.99/mo. Hosted AI and web search use AI Credits; BYOK is paid directly to your provider.',
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
      'Deploy AI agents free. Upgrade for more AI Credits, workspace, dedicated resources, and team collaboration. File Manager and Full Logs are included on every tier.',
    url: 'https://hatcher.host/pricing',
    images: [
      {
        url: 'https://hatcher.host/og?title=Hatcher+Pricing&subtitle=Free+tier+included.+Starter+%246.99%2Fmo.+Pro+%2419.99%2Fmo.+Business+%2449.99%2Fmo.+AI+Credits+for+hosted+usage.&tag=Pricing',
        width: 1200,
        height: 630,
        alt: 'Hatcher Pricing Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher Pricing — Free Tier Included',
    description: 'Deploy AI agents free. Upgrade for more AI Credits, workspace, and dedicated resources.',
    images: ['https://hatcher.host/og?title=Hatcher+Pricing&subtitle=Free+tier+included.+Starter+%246.99%2Fmo.+Pro+%2419.99%2Fmo.+Business+%2449.99%2Fmo.+AI+Credits+for+hosted+usage.&tag=Pricing'],
  },
  alternates: { canonical: 'https://hatcher.host/pricing', languages: buildLanguagesMap('/pricing') },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
