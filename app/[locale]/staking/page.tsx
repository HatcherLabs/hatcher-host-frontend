import type { Metadata } from 'next';
import { HatcherWalletModalProvider } from '@/components/providers/HatcherWalletModalProvider';
import { StakingClient } from './StakingClient';

export const metadata: Metadata = {
  title: 'Hatcher Staking | Hatcher',
  description: 'Stake HATCHER through Streamflow pools to earn variable HATCHER rewards and platform AI Credits.',
};

export default function StakingPage() {
  return (
    <HatcherWalletModalProvider
      description="Choose a wallet that can sign messages and staking transactions."
      eyebrow="Hatcher staking"
    >
      <StakingClient />
    </HatcherWalletModalProvider>
  );
}
