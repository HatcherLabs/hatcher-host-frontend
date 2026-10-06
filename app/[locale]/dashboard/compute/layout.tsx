import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compute network',
  description: 'Use the Hatcher Compute builder API or enroll and monitor provider nodes.',
};

export default function ComputeDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
