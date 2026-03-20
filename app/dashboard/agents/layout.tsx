import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Agents — Hatcher',
  description: 'Manage your AI agents — view status, start, stop, and configure each agent.',
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
