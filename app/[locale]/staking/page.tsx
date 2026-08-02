import type { Metadata } from 'next';
import { StakingClient } from './StakingClient';
import { StakingWalletModalProvider } from './StakingWalletModalProvider';

export const metadata: Metadata = {
  title: 'Hatcher Staking | Hatcher',
  description: 'Stake HATCHER through Streamflow pools to earn variable HATCHER rewards and platform AI Credits.',
};

export default function StakingPage() {
  return (
    <StakingWalletModalProvider>
      <StakingClient />
    </StakingWalletModalProvider>
  );
}
