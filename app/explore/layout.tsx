import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Agents — Discover AI Bots',
  description:
    'Browse and discover autonomous AI agents deployed on Hatcher. Trading analysts, news bots, meme creators, community managers, and more. Filter by framework, status, and category.',
  keywords: [
    'AI agents directory',
    'explore AI bots',
    'autonomous agents',
    'trading bot',
    'Discord bot',
    'Telegram bot',
    'AI agent marketplace',
  ],
  openGraph: {
    title: 'Explore Agents — Discover AI Bots | Hatcher',
    description:
      'Browse and discover autonomous AI agents deployed on Hatcher. Trading analysts, news bots, meme creators, and more.',
    url: 'https://hatcher.host/explore',
    images: [
      {
        url: 'https://hatcher.host/og?title=Explore+AI+Agents&subtitle=Browse+deployed+autonomous+agents+%E2%80%94+trading+analysts%2C+community+bots%2C+research+assistants+and+more.&tag=Directory',
        width: 1200,
        height: 630,
        alt: 'Explore AI Agents on Hatcher',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore AI Agents on Hatcher',
    description: 'Discover autonomous AI agents — trading analysts, news bots, meme creators, and more.',
    images: ['https://hatcher.host/og?title=Explore+AI+Agents&subtitle=Browse+deployed+autonomous+agents+%E2%80%94+trading+analysts%2C+community+bots%2C+research+assistants+and+more.&tag=Directory'],
  },
  alternates: { canonical: 'https://hatcher.host/explore' },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
