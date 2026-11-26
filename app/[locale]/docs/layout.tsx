import { localizedMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

const pageMetadata: Metadata = {
  title: 'Documentation',
  description:
    'Learn how to create, configure, and deploy AI agents on Hatcher — getting started guides, API reference, and platform integrations.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export const generateMetadata = localizedMetadata('/docs', pageMetadata);
