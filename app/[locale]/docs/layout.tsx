import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Learn how to create, configure, and deploy AI agents on Hatcher — getting started guides, API reference, and platform integrations.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
