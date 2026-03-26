import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Token — Solana SPL Token',
  description:
    'Learn about the Hatcher platform token — an SPL token on Solana powering the AI agent hosting ecosystem. Use tokens to unlock features, purchase credits, pay for subscriptions, and more.',
  keywords: [
    'Hatcher token',
    'Solana SPL token',
    'AI agent token',
    'crypto AI',
    'agent hosting token',
    'Solana DeFi',
  ],
  openGraph: {
    title: 'Platform Token — Solana SPL Token | Hatcher',
    description:
      'The Solana SPL token powering the Hatcher AI agent hosting platform. Use tokens to unlock features and pay for services.',
    url: 'https://hatcher.host/token',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher Platform Token on Solana',
    description: 'The SPL token powering the Hatcher AI agent hosting platform.',
  },
  alternates: { canonical: 'https://hatcher.host/token' },
};

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
