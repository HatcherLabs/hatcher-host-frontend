import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Create Agent — Hatcher',
  description:
    'Describe, configure, and deploy a hosted AI agent on Hatcher with a managed runtime, tools, integrations, logs, and a live control room.',
  keywords: [
    'create AI agent',
    'deploy AI bot',
    'chat to hatch',
    'Telegram bot deploy',
    'Discord bot deploy',
    'AI agent creator',
  ],
  openGraph: {
    title: 'Create Agent | Hatcher',
    description:
      'Use Chat-to-Hatch to describe an agent, review its runtime configuration, and deploy it into Hatcher.',
    url: 'https://hatcher.host/create',
    images: [
      {
        url: 'https://hatcher.host/og?title=Create+Your+AI+Agent&subtitle=Describe%2C+review%2C+and+deploy+a+hosted+agent+runtime.&tag=Get+Started',
        width: 1200,
        height: 630,
        alt: 'Create an AI Agent on Hatcher',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create an AI Agent on Hatcher',
    description: 'Describe, review, and deploy a hosted agent runtime.',
    images: ['https://hatcher.host/og?title=Create+Your+AI+Agent&subtitle=Describe%2C+review%2C+and+deploy+a+hosted+agent+runtime.&tag=Get+Started'],
  },
  alternates: { canonical: 'https://hatcher.host/create', languages: buildLanguagesMap('/create') },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
