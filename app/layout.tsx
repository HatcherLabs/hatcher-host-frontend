import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Sora } from 'next/font/google';
import '@solana/wallet-adapter-react-ui/styles.css';
import './globals.css';
import { WalletProvider } from '@/components/providers/WalletProvider';
import { AuthProvider } from '@/lib/auth-context';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { CommandPalette } from '@/components/ui/CommandPalette';

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
};

export const metadata: Metadata = {
  metadataBase: new URL('https://hatcher.host'),
  title: { default: 'Hatcher — AI Agent Hosting Platform', template: '%s | Hatcher' },
  description:
    'Deploy autonomous AI agents across 20+ platforms in 60 seconds. Free tier included. OpenClaw, Hermes, ElizaOS, Milady frameworks. BYOK any LLM.',
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
    url: 'https://hatcher.host',
    siteName: 'Hatcher',
    title: 'Hatcher — AI Agent Hosting Platform',
    description:
      'Deploy autonomous AI agents across 20+ platforms in 60 seconds. Free tier included. OpenClaw, Hermes, ElizaOS, Milady frameworks. BYOK any LLM.',
    images: [{ url: 'https://hatcher.host/og?title=Hatcher&subtitle=Deploy+autonomous+AI+agents+across+20%2B+platforms+in+60+seconds.+Free+tier+included.&tag=AI+Agent+Hosting', width: 1200, height: 630, alt: 'Hatcher — AI Agent Hosting Platform' }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@HatcherLabs',
    creator: '@HatcherLabs',
    title: 'Hatcher — AI Agent Hosting Platform',
    description:
      'Deploy autonomous AI agents across 20+ platforms in 60 seconds. Free tier included. BYOK any LLM.',
    images: ['https://hatcher.host/og?title=Hatcher&subtitle=Deploy+autonomous+AI+agents+across+20%2B+platforms+in+60+seconds.+Free+tier+included.&tag=AI+Agent+Hosting'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: 'https://hatcher.host' },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
  category: 'technology',
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Hatcher',
  url: 'https://hatcher.host',
  logo: 'https://hatcher.host/icon.svg',
  description: 'Deploy autonomous AI agents across 20+ platforms in 60 seconds. Free tier included.',
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
    target: 'https://hatcher.host/explore?q={search_term_string}',
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
      description: '1 agent, 20 messages/day with hosted LLM, all integrations.',
    },
    {
      '@type': 'Offer',
      name: 'Basic Plan',
      price: '9.99',
      priceCurrency: 'USD',
      description: '1 agent, 100 messages/day, 1 CPU/1.5GB RAM.',
    },
    {
      '@type': 'Offer',
      name: 'Pro Plan',
      price: '19.99',
      priceCurrency: 'USD',
      description: '5 agents, 300 messages/day, dedicated resources, file manager.',
    },
  ],
  creator: {
    '@type': 'Organization',
    name: 'Hatcher Labs',
    url: 'https://hatcher.host',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark scroll-smooth ${inter.variable} ${jetbrainsMono.variable} ${sora.variable}`}>
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
      </head>
      <body>
        <AuthProvider>
          <WalletProvider>
            <ToastProvider>
              <LayoutShell>{children}</LayoutShell>
              <CommandPalette />
            </ToastProvider>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
