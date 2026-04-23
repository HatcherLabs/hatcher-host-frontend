import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to your Hatcher account to manage your AI agents, view analytics, configure integrations, and monitor performance.',
  openGraph: {
    title: 'Sign In | Hatcher',
    description: 'Sign in to manage your AI agents on Hatcher.',
    url: 'https://hatcher.host/login',
    images: [
      {
        url: 'https://hatcher.host/og?title=Sign+In&subtitle=Sign+in+to+manage+your+AI+agents&tag=Hatcher',
        width: 1200,
        height: 630,
        alt: 'Sign In to Hatcher',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In | Hatcher',
    description: 'Sign in to manage your AI agents on Hatcher.',
    images: ['https://hatcher.host/og?title=Sign+In&subtitle=Sign+in+to+manage+your+AI+agents&tag=Hatcher'],
  },
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://hatcher.host/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
