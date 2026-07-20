import type { Metadata } from 'next';
import Script from 'next/script';
import { LandingV3 } from '@/components/landing/v3/LandingV3';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Hatcher — AI Agent Infrastructure',
  description:
    'Managed AI agent infrastructure for hosted OpenClaw and Hermes agents: models, wallets, tools, integrations, and runtime controls in one place.',
  alternates: { languages: buildLanguagesMap('/') },
};

export default function HomePage() {
  return (
    <>
      <LandingV3 />
      <Script
        src="https://widget.qwerti.ai/widget/v1/buy.js"
        strategy="afterInteractive"
        data-widget="qwerti-widget"
        data-campaign="hatcher-792703809-48487"
        data-auto-open="true"
      />
    </>
  );
}
