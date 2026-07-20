import type { Metadata } from 'next';
import Script from 'next/script';
import { LandingV3 } from '@/components/landing/v3/LandingV3';
import {
  QWERTI_WIDGET_SCRIPT_INTEGRITY,
  QWERTI_WIDGET_SCRIPT_SRC,
} from '@/lib/qwerti-widget';
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
        src={QWERTI_WIDGET_SCRIPT_SRC}
        integrity={QWERTI_WIDGET_SCRIPT_INTEGRITY}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        data-widget="qwerti-widget"
        data-campaign="hatcher-792703809-48487"
        data-auto-open="false"
        data-loader-version="1.0.0"
      />
    </>
  );
}
