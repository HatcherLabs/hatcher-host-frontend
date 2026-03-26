import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to your Hatcher account to manage your AI agents, view analytics, configure integrations, and monitor performance.',
  openGraph: {
    title: 'Sign In | Hatcher',
    description: 'Sign in to manage your AI agents on Hatcher.',
    url: 'https://hatcher.host/login',
  },
  twitter: {
    card: 'summary',
    title: 'Sign In | Hatcher',
    description: 'Sign in to manage your AI agents on Hatcher.',
  },
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://hatcher.host/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
