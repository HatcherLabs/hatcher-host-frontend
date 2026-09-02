import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compute providers',
  description: 'Enroll and monitor your Hatcher Compute provider nodes.',
};

export default function ComputeDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
