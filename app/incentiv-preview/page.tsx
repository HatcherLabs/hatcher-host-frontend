import type { Metadata } from 'next';
import { IncentivPreview } from '@/components/auth/IncentivPreview';

export const metadata: Metadata = {
  title: 'Incentiv sign-in preview',
  robots: { index: false, follow: false },
};
export default function IncentivPreviewPage() {
  return <IncentivPreview />;
}
