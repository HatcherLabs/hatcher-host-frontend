import type { Metadata } from 'next';
import { AgentDetailTour } from '@/components/onboarding/AgentDetailTour';
import { DashboardTour } from '@/components/onboarding/DashboardTour';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Dashboard',
  description:
    'Manage your AI agents, monitor performance, and track usage on Hatcher — the managed hosting platform for autonomous AI agents.',
  alternates: {
    canonical: '/dashboard',
    languages: buildLanguagesMap('/dashboard'),
  },
  openGraph: {
    title: 'Dashboard',
    description:
      'Manage your AI agents, monitor performance, and track usage on Hatcher.',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <DashboardTour />
      <AgentDetailTour />
      {children}
    </ErrorBoundary>
  );
}
