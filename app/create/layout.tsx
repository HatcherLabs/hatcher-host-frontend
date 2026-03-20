import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Agent',
  description:
    'Create and deploy your autonomous AI agent on Hatcher in 60 seconds — pick a template, configure platforms, and hatch your agent.',
  openGraph: {
    title: 'Create Agent',
    description:
      'Create and deploy your autonomous AI agent on Hatcher in 60 seconds.',
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
