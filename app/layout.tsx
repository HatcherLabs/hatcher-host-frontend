import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import { Inter, JetBrains_Mono, Sora } from 'next/font/google';
import '@solana/wallet-adapter-react-ui/styles.css';
import './globals.css';
import { WalletProvider } from '@/components/providers/WalletProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/lib/auth-context';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { PosthogProvider } from '@/components/providers/PosthogProvider';
import { CookieConsent } from '@/components/ui/CookieConsent';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { isLocale } from '@/i18n/config';
import { HATCHER_LOCALE_HEADER } from '@/i18n/localeHeader';
import {
  ICON_PATHS,
  MANIFEST_PATH,
  SOCIAL_PREVIEW_PATH,
  absoluteSiteUrl,
  buildSocialPreviewImage,
} from '@/lib/site-assets';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
});

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
});

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#10110f',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hatcher.host';
const SOCIAL_PREVIEW_URL = absoluteSiteUrl(SOCIAL_PREVIEW_PATH, SITE_URL);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Hatcher — AI Agent Infrastructure', template: '%s | Hatcher' },
  description:
    'Managed AI agent infrastructure for hosted OpenClaw and Hermes agents: models, wallets, tools, rooms, and runtime controls in one place.',
  keywords: [
    'AI agents',
    'agent hosting',
    'OpenClaw',
    'Hermes',
    'deploy AI',
    'Telegram bot',
    'Discord bot',
    'BYOK',
    'Solana',
    'AI bot hosting',
    'autonomous agents',
    'LLM hosting',
  ],
  authors: [{ name: 'Hatcher Labs' }],
  creator: 'Hatcher Labs',
  publisher: 'Hatcher Labs',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Hatcher',
    title: 'Hatcher — AI Agent Infrastructure',
    description:
      'Managed AI agent infrastructure for hosted OpenClaw and Hermes agents: models, wallets, tools, rooms, and runtime controls in one place.',
    images: [buildSocialPreviewImage(SITE_URL)],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@HatcherLabs',
    creator: '@HatcherLabs',
    title: 'Hatcher — AI Agent Infrastructure',
    description:
      'Managed AI agent infrastructure for hosted OpenClaw and Hermes agents: models, wallets, tools, rooms, and runtime controls in one place.',
    images: [SOCIAL_PREVIEW_URL],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: SITE_URL },
  icons: {
    icon: [
      { url: ICON_PATHS.svg, type: 'image/svg+xml' },
      { url: ICON_PATHS.icon192, sizes: '192x192', type: 'image/png' },
      { url: ICON_PATHS.icon512, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: ICON_PATHS.icon192, sizes: '192x192', type: 'image/png' },
    ],
  },
  manifest: MANIFEST_PATH,
  category: 'technology',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hatcher',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Hatcher',
  url: 'https://hatcher.host',
  logo: absoluteSiteUrl(ICON_PATHS.svg, SITE_URL),
  description: 'Deploy OpenClaw and Hermes agents instantly. Configure with no code, launch on Telegram, Discord, WhatsApp, and manage agents in 3D rooms.',
  sameAs: ['https://twitter.com/HatcherLabs'],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Hatcher',
  url: 'https://hatcher.host',
  description: 'AI Agent Hosting Platform',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/frameworks?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Hatcher',
  url: 'https://hatcher.host',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description:
    'Managed AI agent hosting platform. Deploy OpenClaw and Hermes agents across 20+ platforms in 60 seconds. 3D rooms, Hatcher City, UsePod/OpenRouter routing, and BYOK support.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free Tier',
      price: '0',
      priceCurrency: 'USD',
      description: '1 agent, 500 AI Credits/month, 1 CPU/1GB RAM, 2GB workspace, all integrations.',
    },
    {
      '@type': 'Offer',
      name: 'Starter Plan',
      price: '6.99',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: '1 agent, 3,000 AI Credits/month, 1 CPU/1.5GB RAM, 10GB workspace.',
    },
    {
      '@type': 'Offer',
      name: 'Pro Plan',
      price: '19.99',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: '3 agents, 15,000 AI Credits/month, 1.5 CPU/2GB RAM, 25GB workspace.',
    },
    {
      '@type': 'Offer',
      name: 'Business Plan',
      price: '49.99',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: '5 agents, 40,000 AI Credits/month, 2 CPU/3GB RAM, 50GB workspace, always active, team collaboration.',
    },
    {
      '@type': 'Offer',
      name: 'Founding Member',
      price: '99',
      priceCurrency: 'USD',
      description: '10 agents, 25,000 AI Credits/month, 2 CPU/4GB RAM, 40GB workspace, lifetime access, 20 spots only.',
    },
  ],
  creator: {
    '@type': 'Organization',
    name: 'Hatcher Labs',
    url: SITE_URL,
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is it really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The free plan gives you 1 agent, 500 AI Credits/month, 2GB workspace, File Manager, Full Logs, and access to all platforms. No credit card required.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need to know how to code?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Not at all! Creating an agent is like filling out a form — choose a name, describe what you want it to do, pick platforms, and launch.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is "Bring Your Own Key"?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Connect your own OpenAI, Anthropic, Google, OpenRouter, or other supported LLM key. BYOK usage is paid directly to your provider and does not spend Hatcher AI Credits.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where does my agent run?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'On our cloud servers 24/7. No need to keep your computer on or install anything.',
      },
    },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Header/Footer/LayoutShell use useLocale() + useTranslations() which need a provider.
  // Non-locale pages (admin, /privacy, not-found) rely on this provider to supply
  // default-locale messages. Locale pages get their own nested provider in
  // app/[locale]/layout.tsx which takes precedence for useTranslations.
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;
  const headerLocale = requestHeaders.get(HATCHER_LOCALE_HEADER);
  const locale = isLocale(headerLocale) ? headerLocale : await getLocale();
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} className={`scroll-smooth ${inter.variable} ${jetbrainsMono.variable} ${sora.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body>
        <Script src="/register-sw.js" strategy="afterInteractive" nonce={nonce} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PosthogProvider>
            <ThemeProvider nonce={nonce}>
              <AuthProvider>
                <WalletProvider>
                  <ToastProvider>
                    <LayoutShell>{children}</LayoutShell>
                    <CommandPalette />
                  </ToastProvider>
                </WalletProvider>
              </AuthProvider>
            </ThemeProvider>
          </PosthogProvider>
        </NextIntlClientProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
