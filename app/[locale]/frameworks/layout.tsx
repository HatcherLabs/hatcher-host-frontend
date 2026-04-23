import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'AI Frameworks — OpenClaw, Hermes, ElizaOS, Milady',
  description:
    'Compare 4 AI agent frameworks on Hatcher: OpenClaw (tools + memory), Hermes (ultra-fast), ElizaOS (multi-agent), Milady (personality-driven). Deploy any framework in 60 seconds.',
  keywords: ['OpenClaw', 'Hermes', 'ElizaOS', 'Milady', 'AI frameworks', 'agent framework comparison'],
  alternates: {
    canonical: '/frameworks',
    languages: buildLanguagesMap('/frameworks'),
  },
  openGraph: {
    title: 'AI Agent Frameworks — OpenClaw, Hermes, ElizaOS, Milady',
    description: 'Compare 4 AI agent frameworks. Deploy any framework in 60 seconds on Hatcher.',
    url: 'https://hatcher.host/frameworks',
    siteName: 'Hatcher',
    images: [{ url: 'https://hatcher.host/og?title=Frameworks&subtitle=OpenClaw+%E2%80%A2+Hermes+%E2%80%A2+ElizaOS+%E2%80%A2+Milady&tag=Compare', width: 1200, height: 630 }],
  },
};

export default function FrameworksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
