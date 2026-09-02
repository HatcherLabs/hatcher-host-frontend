import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { buildLanguagesMap } from '@/lib/seo';
import { ComputeExperience } from './ComputeExperience';

export function generateMetadata(): Metadata {
  return {
    title: 'Hatcher Compute — Distributed inference network',
    description:
      'Contribute GPU capacity to Hatcher Compute, serve verified open-model inference, and receive USDC for accepted work.',
    alternates: {
      canonical: '/compute',
      languages: buildLanguagesMap('/compute'),
    },
  };
}

export default function ComputePage() {
  return (
    <MarketingShell>
      <ComputeExperience />
    </MarketingShell>
  );
}
