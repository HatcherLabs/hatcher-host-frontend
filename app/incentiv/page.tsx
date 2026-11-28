import type { Metadata } from 'next';
import { IncentivPreview } from '@/components/auth/IncentivPreview';

export const metadata: Metadata = {
  title: 'Incentiv wallet login and USDC payments',
  alternates: { canonical: 'https://hatcher.host/incentiv' },
};

export default function IncentivPage() {
  return <IncentivPreview returnPath="/incentiv" />;
}
