import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Templates — Browse AI Agent Templates',
  description:
    'Browse and deploy pre-built AI agent templates on Hatcher. OpenClaw, Hermes, ElizaOS, and Milady templates ready to deploy in 60 seconds.',
  keywords: [
    'AI agent templates',
    'pre-built agents',
    'OpenClaw templates',
    'Hermes templates',
    'deploy AI bot',
    'agent marketplace',
  ],
  openGraph: {
    title: 'Templates — Browse AI Agent Templates | Hatcher',
    description:
      'Explore pre-built AI agent templates across frameworks. Deploy a trading analyst, community bot, or research assistant in 60 seconds.',
    url: 'https://hatcher.host/marketplace',
    images: [
      {
        url: 'https://hatcher.host/og?title=Agent+Templates&subtitle=Pre-built+AI+agent+templates+ready+to+deploy+in+60+seconds.+OpenClaw%2C+Hermes%2C+ElizaOS+%26+Milady.&tag=Templates',
        width: 1200,
        height: 630,
        alt: 'AI Agent Templates on Hatcher',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Templates on Hatcher',
    description: 'Deploy pre-built AI agent templates in 60 seconds. OpenClaw, Hermes, ElizaOS, and Milady.',
    images: ['https://hatcher.host/og?title=Agent+Templates&subtitle=Pre-built+AI+agent+templates+ready+to+deploy+in+60+seconds.+OpenClaw%2C+Hermes%2C+ElizaOS+%26+Milady.&tag=Templates'],
  },
  alternates: { canonical: 'https://hatcher.host/marketplace' },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
