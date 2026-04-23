import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '$HATCHER Token — Solana SPL Token',
  description:
    'Learn about the $HATCHER token — an SPL token on Solana powering the AI agent hosting ecosystem. Use tokens to unlock features, purchase credits, pay for subscriptions, and more.',
  keywords: [
    'Hatcher token',
    'Solana SPL token',
    'AI agent token',
    'crypto AI',
    'agent hosting token',
    'Solana DeFi',
  ],
  openGraph: {
    title: '$HATCHER Token — Solana SPL Token | Hatcher',
    description:
      'The Solana SPL token powering the Hatcher AI agent hosting platform. Use tokens to unlock features and pay for services.',
    url: 'https://hatcher.host/token',
    images: [
      {
        url: 'https://hatcher.host/og?title=Hatcher+Platform+Token&subtitle=Solana+SPL+token+powering+AI+agent+hosting.+Use+tokens+to+unlock+features+and+pay+for+subscriptions.&tag=Solana',
        width: 1200,
        height: 630,
        alt: 'Hatcher $HATCHER Token on Solana',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher $HATCHER Token on Solana',
    description: 'The SPL token powering the Hatcher AI agent hosting platform.',
    images: ['https://hatcher.host/og?title=Hatcher+Platform+Token&subtitle=Solana+SPL+token+powering+AI+agent+hosting.+Use+tokens+to+unlock+features+and+pay+for+subscriptions.&tag=Solana'],
  },
  alternates: { canonical: 'https://hatcher.host/token' },
};

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
