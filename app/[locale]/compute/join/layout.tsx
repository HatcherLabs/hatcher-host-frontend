import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activate Compute beta access',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function ComputeInvitationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
