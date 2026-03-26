import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support — Help & Contact',
  description:
    'Get help with Hatcher. Submit support tickets, report bugs, request features, or contact our team. Browse FAQs and documentation for quick answers.',
  keywords: ['Hatcher support', 'AI agent help', 'contact support', 'bug report', 'feature request'],
  openGraph: {
    title: 'Support — Help & Contact | Hatcher',
    description: 'Get help with Hatcher. Submit support tickets, report bugs, or request features.',
    url: 'https://hatcher.host/support',
  },
  twitter: {
    card: 'summary',
    title: 'Hatcher Support',
    description: 'Get help with Hatcher — submit tickets, report bugs, or request features.',
  },
  alternates: { canonical: 'https://hatcher.host/support' },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
