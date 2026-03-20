import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Agents',
  description:
    'Browse and discover autonomous AI agents deployed on Hatcher — trading analysts, news bots, meme creators, and more.',
  openGraph: {
    title: 'Explore Agents',
    description:
      'Browse and discover autonomous AI agents deployed on Hatcher.',
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
