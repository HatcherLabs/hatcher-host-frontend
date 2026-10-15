import { localizedMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

const pageMetadata: Metadata = {
  title: 'Sign Up — Create Free Account',
  description:
    'Create a free Hatcher account and deploy your first AI agent in minutes. No credit card required. Free tier includes AI Credits and access to all platforms.',
  keywords: ['create account', 'sign up AI agent', 'free AI hosting', 'deploy AI bot free'],
  openGraph: {
    title: 'Sign Up — Create Free Account | Hatcher',
    description:
      'Create a free Hatcher account and deploy your first AI agent in minutes. No credit card required.',
    url: 'https://hatcher.host/register',
  },
  twitter: {
    card: 'summary',
    title: 'Sign Up Free | Hatcher',
    description: 'Create a free account and deploy your first AI agent in minutes.',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export const generateMetadata = localizedMetadata('/register', pageMetadata);
