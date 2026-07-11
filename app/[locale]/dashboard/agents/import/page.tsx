import type { Metadata } from 'next';
import { LiftImportWizard } from '@/components/agents/lift/LiftImportWizard';

export const metadata: Metadata = {
  title: 'Hatcher Lift',
  description: 'Safely review and import an existing OpenClaw or Hermes agent.',
};

export default async function HatcherLiftPage({
  searchParams,
}: {
  searchParams: Promise<{ importId?: string | string[] }>;
}) {
  const { importId } = await searchParams;
  return <LiftImportWizard initialImportId={typeof importId === 'string' ? importId : undefined} />;
}
