import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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
      {children}
    </ErrorBoundary>
  );
}
