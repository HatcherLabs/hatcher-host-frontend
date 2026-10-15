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
import { QwertiWidgetGate } from '@/components/landing/QwertiWidgetGate';
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
    'Managed AI agent infrastructure for hosted OpenClaw and Hermes agents: models, wallets, tools, integrations, and runtime controls in one place.',
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
      'Managed AI agent infrastructure for hosted OpenClaw and Hermes agents: models, wallets, tools, integrations, and runtime controls in one place.',
    images: [buildSocialPreviewImage(SITE_URL)],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@HatcherLabs',
    creator: '@HatcherLabs',
    title: 'Hatcher — AI Agent Infrastructure',
    description:
      'Managed AI agent infrastructure for hosted OpenClaw and Hermes agents: models, wallets, tools, integrations, and runtime controls in one place.',
    images: [SOCIAL_PREVIEW_URL],
  },
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
  description: 'Deploy OpenClaw and Hermes agents instantly. Configure with no code, launch on Telegram, Discord, WhatsApp, and manage them from one workspace.',
  sameAs: ['https://twitter.com/HatcherLabs'],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Hatcher',
  url: 'https://hatcher.host',
  description: 'AI Agent Hosting Platform',
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
                    {process.env.HATCHER_CHAT_ENTRY_ENABLED !== 'true' && <QwertiWidgetGate />}
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
