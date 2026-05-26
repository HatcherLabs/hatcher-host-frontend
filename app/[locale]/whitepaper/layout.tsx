import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Hatcher Whitepaper - $HATCHER Token and Agent Economy',
  description:
    'Read the Hatcher whitepaper covering the hosted AI agent platform, $HATCHER token utility, AI Credits, partner compute, security model, and roadmap.',
  keywords: [
    'Hatcher whitepaper',
    '$HATCHER token',
    'AI agent economy',
    'Solana AI agents',
    'agent hosting platform',
    'AI Credits',
  ],
  openGraph: {
    title: 'Hatcher Whitepaper | $HATCHER Token and Agent Economy',
    description:
      'A product and ecosystem overview for Hatcher: hosted AI agents, $HATCHER token utility, AI Credits, partner compute, and future governance.',
    url: 'https://hatcher.host/whitepaper',
    images: [
      {
        url: 'https://hatcher.host/og?title=Hatcher+Whitepaper&subtitle=Hosted+AI+agents%2C+%24HATCHER+utility%2C+AI+Credits%2C+partner+compute%2C+and+the+agent+economy.&tag=Whitepaper',
        width: 1200,
        height: 630,
        alt: 'Hatcher whitepaper',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher Whitepaper',
    description: 'Hosted AI agents, $HATCHER token utility, AI Credits, and the Hatcher agent economy.',
    images: [
      'https://hatcher.host/og?title=Hatcher+Whitepaper&subtitle=Hosted+AI+agents%2C+%24HATCHER+utility%2C+AI+Credits%2C+partner+compute%2C+and+the+agent+economy.&tag=Whitepaper',
    ],
  },
  alternates: {
    canonical: 'https://hatcher.host/whitepaper',
    languages: buildLanguagesMap('/whitepaper'),
  },
};

export default function WhitepaperLayout({ children }: { children: React.ReactNode }) {
  return children;
}
