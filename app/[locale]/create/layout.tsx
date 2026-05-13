import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Create Agent — Deploy in 60 Seconds',
  description:
    'Create and deploy your autonomous AI agent on Hatcher in 60 seconds with Chat-to-Hatch, then connect Telegram, Discord, Twitter, WhatsApp, and more.',
  keywords: [
    'create AI agent',
    'deploy AI bot',
    'chat to hatch',
    'Telegram bot deploy',
    'Discord bot deploy',
    'AI agent creator',
  ],
  openGraph: {
    title: 'Create Agent — Deploy in 60 Seconds | Hatcher',
    description:
      'Use Chat-to-Hatch to describe, configure, and hatch your autonomous AI agent in 60 seconds.',
    url: 'https://hatcher.host/create',
    images: [
      {
        url: 'https://hatcher.host/og?title=Create+Your+AI+Agent&subtitle=Use+Chat-to-Hatch+to+describe%2C+configure%2C+and+deploy+in+60+seconds.&tag=Get+Started',
        width: 1200,
        height: 630,
        alt: 'Create an AI Agent on Hatcher',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create an AI Agent in 60 Seconds',
    description: 'Use Chat-to-Hatch to describe, configure, and deploy your agent.',
    images: ['https://hatcher.host/og?title=Create+Your+AI+Agent&subtitle=Use+Chat-to-Hatch+to+describe%2C+configure%2C+and+deploy+in+60+seconds.&tag=Get+Started'],
  },
  alternates: { canonical: 'https://hatcher.host/create', languages: buildLanguagesMap('/create') },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
