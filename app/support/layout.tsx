import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support',
  description:
    'Get support for Hatcher — contact our team, report issues, or request features for the AI agent hosting platform.',
  openGraph: {
    title: 'Support',
    description:
      'Get support for Hatcher — contact our team, report issues, or request features.',
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
