import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Token',
  description:
    'Learn about the Hatcher platform token — an SPL token on Solana that powers the Hatcher platform. Use tokens to unlock agent features, purchase credits, and more.',
  openGraph: {
    title: 'Platform Token',
    description:
      'Learn about the Hatcher platform token — the Solana SPL token powering the Hatcher AI agent hosting platform.',
  },
};

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
