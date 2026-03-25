import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up',
  description:
    'Create a free Hatcher account and deploy your first AI agent in minutes. No credit card required.',
  openGraph: {
    title: 'Sign Up',
    description:
      'Create a free Hatcher account and deploy your first AI agent in minutes.',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
