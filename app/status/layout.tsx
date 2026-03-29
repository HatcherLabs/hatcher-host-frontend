import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Status | Hatcher',
  description: 'Real-time status of the Hatcher platform — check service health, uptime, and incident history.',
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
