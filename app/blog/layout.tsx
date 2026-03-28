import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Guides, tutorials, and insights about AI agents, deployment, and the Hatcher platform.',
  openGraph: {
    title: 'Hatcher Blog',
    description:
      'Guides, tutorials, and insights about AI agents, deployment, and the Hatcher platform.',
    url: 'https://hatcher.host/blog',
    siteName: 'Hatcher',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
