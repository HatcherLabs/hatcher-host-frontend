import { localizedMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

const pageMetadata: Metadata = {
  title: 'Hatcher Tutorials — Learn to build and operate AI agents',
  description:
    'Step-by-step Hatcher video tutorials for creating agents, using Neural Mesh, Mission Control, Routines, Skills, files, Agent Mail, GitHub workflows, and image generation.',
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

export const generateMetadata = localizedMetadata('/tutorials', pageMetadata);
