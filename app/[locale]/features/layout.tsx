import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Hatcher Features - AI agents, skills, iOS, Android',
  description:
    'Explore Hatcher features: agent email, skills, GitHub workflows, mobile apps, and managed OpenClaw or Hermes agents.',
  keywords: [
    'Hatcher features',
    'AI agents',
    'OpenClaw',
    'Hermes',
    'iOS app',
    'App Store',
    'Android app',
    'Solana Mobile',
    'AI agent hosting',
  ],
  alternates: {
    canonical: '/features',
    languages: buildLanguagesMap('/features'),
  },
  openGraph: {
    title: 'Hatcher Features',
    description: 'Everything Hatcher agents can do across web and mobile.',
    url: 'https://hatcher.host/features',
    siteName: 'Hatcher',
    images: [
      {
        url: 'https://hatcher.host/og?title=Hatcher+Features&subtitle=AI+agents+across+web+and+mobile&tag=Features',
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
