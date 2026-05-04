import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'AI Frameworks — OpenClaw and Hermes',
  description:
    'Compare OpenClaw and Hermes on Hatcher: skill-heavy automation, persistent memory, integrations, and OpenRouter-hosted LLM support. Deploy an agent in 60 seconds.',
  keywords: ['OpenClaw', 'Hermes', 'OpenRouter', 'DeepSeek', 'AI frameworks', 'agent framework comparison'],
  alternates: {
    canonical: '/frameworks',
    languages: buildLanguagesMap('/frameworks'),
  },
  openGraph: {
    title: 'AI Agent Frameworks — OpenClaw and Hermes',
    description: 'Compare OpenClaw and Hermes. Deploy an agent in 60 seconds on Hatcher.',
    url: 'https://hatcher.host/frameworks',
    siteName: 'Hatcher',
    images: [{ url: 'https://hatcher.host/og?title=Frameworks&subtitle=OpenClaw+%E2%80%A2+Hermes+%E2%80%A2+OpenRouter&tag=Compare', width: 1200, height: 630 }],
  },
};

export default function FrameworksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
