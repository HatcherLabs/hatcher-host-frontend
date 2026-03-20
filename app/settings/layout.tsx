import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings — Hatcher',
  description:
    'Manage your Hatcher account settings, API keys, wallet connections, and notification preferences.',
  openGraph: {
    title: 'Settings — Hatcher',
    description:
      'Manage your Hatcher account settings, API keys, and wallet connections.',
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
