import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Platform Status | Hatcher',
  description: 'Real-time status of the Hatcher platform — check service health, uptime, and incident history.',
  alternates: {
    canonical: '/status',
    languages: buildLanguagesMap('/status'),
  },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
