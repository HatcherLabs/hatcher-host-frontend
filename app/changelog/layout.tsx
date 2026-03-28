import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog — Latest Updates & Features',
  description:
    'See what is new on Hatcher. Latest features, improvements, bug fixes, and platform updates for the AI agent hosting platform.',
  keywords: ['Hatcher changelog', 'AI agent updates', 'new features', 'platform updates'],
  openGraph: {
    title: 'Hatcher Changelog — Latest Updates',
    description: 'See what is new on Hatcher. Latest features, improvements, and platform updates.',
    url: 'https://hatcher.host/changelog',
    siteName: 'Hatcher',
    images: [{ url: 'https://hatcher.host/og?title=Changelog&subtitle=Latest+updates+and+features&tag=Updates', width: 1200, height: 630 }],
  },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
