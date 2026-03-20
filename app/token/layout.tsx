import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '$HATCH Token',
  description:
    'Learn about $HATCH — the SPL token on Solana that powers the Hatcher platform. Use $HATCH to unlock agent features, purchase credits, and more.',
  openGraph: {
    title: '$HATCH Token',
    description:
      'Learn about $HATCH — the Solana SPL token powering the Hatcher AI agent hosting platform.',
  },
};

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
