import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Templates | Hatcher',
  description: 'Browse and deploy pre-built AI agent templates on Hatcher. OpenClaw, Hermes, ElizaOS, and Milady templates ready to go.',
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
