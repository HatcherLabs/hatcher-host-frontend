import type { Metadata } from 'next';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Hatcher Tutorials — Learn to build and operate AI agents',
  description:
    'Step-by-step Hatcher video tutorials for creating agents, using Neural Mesh, Mission Control, Routines, Skills, files, and Agent Mail.',
  alternates: {
    canonical: '/tutorials',
    languages: buildLanguagesMap('/tutorials'),
  },
  openGraph: {
    title: 'Hatcher Tutorials',
    description:
      'Step-by-step video guides for building, operating, and connecting autonomous agents.',
    url: 'https://hatcher.host/tutorials',
    siteName: 'Hatcher',
    images: [
      {
        url: 'https://hatcher.host/og?title=Hatcher+Tutorials&subtitle=Learn+Hatcher+by+doing&tag=Tutorials',
        width: 1200,
        height: 630,
        alt: 'Hatcher Tutorials',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher Tutorials',
    description:
      'Step-by-step video guides for building, operating, and connecting autonomous agents.',
  },
};

export default function TutorialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
