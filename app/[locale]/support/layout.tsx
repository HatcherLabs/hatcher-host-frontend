import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Support — Help & Contact',
  description:
    'Get help with Hatcher. Submit support tickets, report bugs, request features, or contact our team. Browse FAQs and documentation for quick answers.',
  keywords: ['Hatcher support', 'AI agent help', 'contact support', 'bug report', 'feature request'],
  openGraph: {
    title: 'Support — Help & Contact | Hatcher',
    description: 'Get help with Hatcher. Submit support tickets, report bugs, or request features.',
    url: 'https://hatcher.host/support',
    images: [
      {
        url: 'https://hatcher.host/og?title=Hatcher+Support&subtitle=Submit+tickets%2C+report+bugs%2C+or+request+features.+Our+team+is+here+to+help.&tag=Support',
        width: 1200,
        height: 630,
        alt: 'Hatcher Support',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher Support',
    description: 'Get help with Hatcher — submit tickets, report bugs, or request features.',
    images: ['https://hatcher.host/og?title=Hatcher+Support&subtitle=Submit+tickets%2C+report+bugs%2C+or+request+features.+Our+team+is+here+to+help.&tag=Support'],
  },
  alternates: { canonical: 'https://hatcher.host/support', languages: buildLanguagesMap('/support') },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
