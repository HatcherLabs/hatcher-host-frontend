import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { setRequestLocale } from 'next-intl/server';
import { ChatToHatch } from '@/components/chat-to-hatch/ChatToHatch';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hatcher.host';

export const metadata: Metadata = {
  title: 'Chat to hatch · Hatcher',
  description:
    'Describe the agent you want, in plain English. Hatcher picks the framework, names it, and queues it for hatching.',
  alternates: { canonical: `${SITE_URL}/chat-to-hatch` },
  // No locale alternates yet — the page is interactive and the
  // assistant only speaks English in V1.
  robots: { index: false, follow: true },
};

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className={spaceGrotesk.variable}>
      <ChatToHatch />
    </div>
  );
}
