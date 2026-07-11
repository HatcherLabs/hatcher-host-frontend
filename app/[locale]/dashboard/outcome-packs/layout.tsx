import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Outcome Packs',
  description: 'Configure and launch curated task recipes for your Hatcher agents.',
};

export default function OutcomePacksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
