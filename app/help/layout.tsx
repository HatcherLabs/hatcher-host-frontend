import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help',
  description:
    'Help center and frequently asked questions about Hatcher — learn how to create, deploy, and manage your AI agents.',
  openGraph: {
    title: 'Help',
    description:
      'Help center and FAQ for Hatcher — learn how to create, deploy, and manage your AI agents.',
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
