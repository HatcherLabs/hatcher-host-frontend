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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore AI Agents on Hatcher',
    description: 'Discover autonomous AI agents — trading analysts, news bots, meme creators, and more.',
  },
  alternates: { canonical: 'https://hatcher.host/explore' },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
