import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Hatcher Features - AI agents, CLI, iOS, Android, 3D city',
  description:
    'Explore Hatcher features: agent email, 3D city and rooms, skills, CLI, GitHub workflows, mobile apps, and managed OpenClaw or Hermes agents.',
  keywords: [
    'Hatcher features',
    'AI agents',
    'OpenClaw',
    'Hermes',
    'agent CLI',
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
    description: 'Everything Hatcher agents can do across web, CLI, mobile, and 3D spaces.',
    url: 'https://hatcher.host/features',
    siteName: 'Hatcher',
    images: [
      {
        url: 'https://hatcher.host/og?title=Hatcher+Features&subtitle=AI+agents+across+web%2C+CLI%2C+mobile%2C+and+3D+spaces&tag=Features',
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
