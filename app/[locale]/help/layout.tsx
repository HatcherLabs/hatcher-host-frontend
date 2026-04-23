import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center — FAQ & Documentation',
  description:
    'Help center and frequently asked questions about Hatcher — learn how to create, deploy, and manage your AI agents.',
  keywords: ['Hatcher help', 'AI agent FAQ', 'agent documentation', 'how to deploy agent', 'Hatcher guide'],
  openGraph: {
    title: 'Help Center — FAQ & Documentation | Hatcher',
    description:
      'Help center and FAQ for Hatcher — learn how to create, deploy, and manage your AI agents.',
    url: 'https://hatcher.host/help',
    images: [
      {
        url: 'https://hatcher.host/og?title=Help+Center&subtitle=Guides%2C+FAQs%2C+and+documentation+for+creating%2C+deploying%2C+and+managing+your+AI+agents+on+Hatcher.&tag=Documentation',
        width: 1200,
        height: 630,
        alt: 'Hatcher Help Center',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher Help Center',
    description: 'Guides, FAQs, and documentation for AI agents on Hatcher.',
    images: ['https://hatcher.host/og?title=Help+Center&subtitle=Guides%2C+FAQs%2C+and+documentation+for+creating%2C+deploying%2C+and+managing+your+AI+agents+on+Hatcher.&tag=Documentation'],
  },
  alternates: { canonical: 'https://hatcher.host/help' },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
