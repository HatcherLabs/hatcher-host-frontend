import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Hatcher agent hosting pricing — free tier with Groq, BYOK always free, and premium features unlockable with platform tokens on Solana.',
  openGraph: {
    title: 'Pricing',
    description:
      'Hatcher agent hosting pricing — free tier included, premium features unlockable with platform tokens.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
