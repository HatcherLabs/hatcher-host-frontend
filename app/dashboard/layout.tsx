import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { EmailVerificationBanner } from '@/components/ui/EmailVerificationBanner';

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Manage your AI agents, monitor performance, and track usage on Hatcher — the managed hosting platform for autonomous AI agents.',
  openGraph: {
    title: 'Dashboard',
    description:
      'Manage your AI agents, monitor performance, and track usage on Hatcher.',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <EmailVerificationBanner />
      {children}
    </ErrorBoundary>
  );
}
