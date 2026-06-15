import type { Metadata } from 'next';
import { LandingV3 } from '@/components/landing/v3/LandingV3';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Hatcher — AI Agent Infrastructure',
  description:
    'Managed AI agent infrastructure for hosted OpenClaw and Hermes agents: models, wallets, tools, integrations, and runtime controls in one place.',
  alternates: { languages: buildLanguagesMap('/') },
};

export default function HomePage() {
  return <LandingV3 />;
}
