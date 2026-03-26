import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Agent — Deploy in 60 Seconds',
  description:
    'Create and deploy your autonomous AI agent on Hatcher in 60 seconds. Choose from 23+ templates, connect Telegram, Discord, Twitter, WhatsApp, and more. BYOK any LLM.',
  keywords: [
    'create AI agent',
    'deploy AI bot',
    'agent templates',
    'Telegram bot deploy',
    'Discord bot deploy',
    'AI agent creator',
  ],
  openGraph: {
    title: 'Create Agent — Deploy in 60 Seconds | Hatcher',
    description:
      'Pick a template, configure platforms, and hatch your autonomous AI agent in 60 seconds. 23+ templates available.',
    url: 'https://hatcher.host/create',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create an AI Agent in 60 Seconds',
    description: 'Pick a template, configure platforms, and deploy. 23+ templates on Hatcher.',
  },
  alternates: { canonical: 'https://hatcher.host/create' },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
