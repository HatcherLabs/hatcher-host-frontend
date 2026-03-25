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
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: { default: 'Hatcher — AI Agent Hosting Platform', template: '%s | Hatcher' },
  description: 'Deploy, host, and manage AI agents. Free tier included. Pay with SOL, tokens, or card.',
  keywords: ['AI agents', 'agent hosting', 'deploy AI', 'Solana', 'hatcher', 'AI bot', 'OpenClaw', 'Hermes'],
  authors: [{ name: 'Hatcher Labs' }],
  openGraph: {
    type: 'website',
    url: 'https://hatcher.host',
    siteName: 'Hatcher',
    title: 'Hatcher — Deploy AI Agents in Minutes',
    description: 'The managed platform for AI agents. Free tier, BYOK, multi-framework.',
    images: [{ url: '/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher — AI Agent Hosting',
    description: 'Deploy and manage AI agents. Free tier included.',
    images: ['/og'],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL('https://hatcher.host'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark scroll-smooth ${inter.variable} ${jetbrainsMono.variable} ${sora.variable}`}>
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
