import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Templates — 23+ Pre-built AI Bots',
  description:
    'Browse 23+ pre-built AI agent templates on Hatcher. Business assistants, crypto traders, research bots, developer tools, and more. Deploy any template in 60 seconds.',
  keywords: [
    'AI agent templates',
    'pre-built AI bots',
    'agent templates',
    'crypto trading bot',
    'business assistant AI',
    'deploy AI template',
    'Hatcher templates',
  ],
  openGraph: {
    title: 'Agent Templates — 23+ Pre-built AI Bots | Hatcher',
    description:
      'Browse 23+ pre-built AI agent templates. Business assistants, crypto traders, research bots, and more. Deploy in 60 seconds.',
    url: 'https://hatcher.host/templates',
    images: [
      {
        url: 'https://hatcher.host/og?title=Agent+Templates&subtitle=23%2B+pre-built+AI+agent+templates+ready+to+deploy+in+60+seconds.+Business%2C+crypto%2C+research%2C+and+more.&tag=Templates',
        width: 1200,
        height: 630,
        alt: 'AI Agent Templates on Hatcher',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '23+ AI Agent Templates on Hatcher',
    description: 'Browse pre-built AI agent templates and deploy in 60 seconds.',
    images: [
      'https://hatcher.host/og?title=Agent+Templates&subtitle=23%2B+pre-built+AI+agent+templates+ready+to+deploy+in+60+seconds.+Business%2C+crypto%2C+research%2C+and+more.&tag=Templates',
    ],
  },
  alternates: { canonical: 'https://hatcher.host/templates' },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
