import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#8b5cf6',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hatcher.host';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Hatcher — Hatch Your AI Agent in 60 Seconds', template: '%s | Hatcher' },
  description:
    'Deploy AI agents instantly. Pick from 4 frameworks, configure with no code, launch on Telegram, Discord, WhatsApp. Free tier available.',
  keywords: [
    'AI agents',
    'agent hosting',
    'OpenClaw',
    'Hermes',
    'ElizaOS',
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
    title: 'Hatcher — Hatch Your AI Agent in 60 Seconds',
    description:
      'Deploy AI agents instantly. Pick from 4 frameworks, configure with no code, launch on Telegram, Discord, WhatsApp. Free tier available.',
    images: [{ url: `${SITE_URL}/og?title=Hatcher&subtitle=Deploy+AI+agents+instantly.+Pick+from+4+frameworks%2C+configure+with+no+code%2C+launch+on+Telegram%2C+Discord%2C+WhatsApp.&tag=AI+Agent+Hosting`, width: 1200, height: 630, alt: 'Hatcher — Hatch Your AI Agent in 60 Seconds' }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@HatcherLabs',
    creator: '@HatcherLabs',
    title: 'Hatcher — Hatch Your AI Agent in 60 Seconds',
    description:
      'Deploy AI agents instantly. Pick from 4 frameworks, configure with no code, launch on Telegram, Discord, WhatsApp. Free tier available.',
    images: [`${SITE_URL}/og?title=Hatcher&subtitle=Deploy+AI+agents+instantly.+Pick+from+4+frameworks%2C+configure+with+no+code%2C+launch+on+Telegram%2C+Discord%2C+WhatsApp.&tag=AI+Agent+Hosting`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: SITE_URL },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
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
  logo: `${SITE_URL}/icon.svg`,
  description: 'Deploy AI agents instantly. Pick from 4 frameworks, configure with no code, launch on Telegram, Discord, WhatsApp. Free tier available.',
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
    'Managed AI agent hosting platform. Deploy autonomous AI agents across 20+ platforms in 60 seconds. OpenClaw, Hermes, ElizaOS, Milady frameworks. BYOK any LLM.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free Tier',
      price: '0',
      priceCurrency: 'USD',
      description: '1 agent, 20 messages/day, 3 searches/day, all integrations.',
    },
    {
      '@type': 'Offer',
      name: 'Starter Plan',
      price: '6.99',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: '1 agent, 50 messages/day, 10 searches/day, 1 CPU/1.5GB RAM.',
    },
    {
      '@type': 'Offer',
      name: 'Pro Plan',
      price: '19.99',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: '3 agents, 100 messages/day, 50 searches/day, dedicated resources.',
    },
    {
      '@type': 'Offer',
      name: 'Business Plan',
      price: '49.99',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: '10 agents, 300 messages/day, 200 searches/day, always-on, priority support.',
    },
    {
      '@type': 'Offer',
      name: 'Founding Member',
      price: '99',
      priceCurrency: 'USD',
      description: '10 agents, 300 messages/day, 200 searches/day, lifetime access, always-on, 10 spots only.',
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
        text: 'Yes. The free plan gives you 1 agent, 10 messages per day, and access to all platforms. No credit card required.',
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
        text: 'Connect your own OpenAI, Anthropic, Google, or Groq key for unlimited messages. You only pay your AI provider directly.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable} ${jetbrainsMono.variable} ${sora.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body>
        <Script src="/register-sw.js" strategy="afterInteractive" />
        <PosthogProvider>
          <ThemeProvider>
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
        <CookieConsent />
      </body>
    </html>
  );
}
