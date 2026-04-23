import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Guides, tutorials, and insights about AI agents, deployment, and the Hatcher platform.',
  keywords: ['AI agent blog', 'agent deployment guide', 'LLM hosting', 'Hatcher tutorials', 'AI bot development'],
  openGraph: {
    title: 'Hatcher Blog — AI Agents, Deployment & More',
    description:
      'Guides, tutorials, and insights about AI agents, deployment, and the Hatcher platform.',
    url: 'https://hatcher.host/blog',
    siteName: 'Hatcher',
    images: [
      {
        url: 'https://hatcher.host/og?title=Hatcher+Blog&subtitle=Guides%2C+tutorials%2C+and+insights+about+AI+agents%2C+deployment%2C+and+the+Hatcher+platform.&tag=Blog',
        width: 1200,
        height: 630,
        alt: 'Hatcher Blog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher Blog — AI Agents & Deployment',
    description: 'Guides, tutorials, and insights about AI agents and the Hatcher platform.',
    images: ['https://hatcher.host/og?title=Hatcher+Blog&subtitle=Guides%2C+tutorials%2C+and+insights+about+AI+agents%2C+deployment%2C+and+the+Hatcher+platform.&tag=Blog'],
  },
  alternates: { canonical: 'https://hatcher.host/blog', languages: buildLanguagesMap('/blog') },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
