import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Sora } from 'next/font/google';
import '@solana/wallet-adapter-react-ui/styles.css';
import './globals.css';
import { WalletProvider } from '@/components/providers/WalletProvider';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { Toaster } from 'sonner';

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

export const metadata: Metadata = {
  title: 'Hatcher — AI Agent Platform on Solana',
  description:
    'Create, customize, and run AI agents powered by OpenClaw. Pay for premium features with $HATCH tokens.',
  keywords: ['AI agents', 'Solana', 'crypto', 'OpenClaw', '$HATCH'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark scroll-smooth ${inter.variable} ${jetbrainsMono.variable} ${sora.variable}`}>
      <body>
        <WalletProvider>
          <LayoutShell>{children}</LayoutShell>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1A1730',
                border: '1px solid rgba(46,43,74,0.6)',
                color: '#fafafa',
                fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}
