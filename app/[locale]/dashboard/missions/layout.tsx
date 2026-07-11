import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'Create, approve, run, and review one-shot tasks across your Hatcher agents.',
};

export default function MissionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
