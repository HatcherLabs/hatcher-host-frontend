import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
  description:
    'Sign in to your Hatcher account to manage your AI agents, view analytics, and configure integrations.',
  openGraph: {
    title: 'Login',
    description:
      'Sign in to your Hatcher account to manage your AI agents.',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
