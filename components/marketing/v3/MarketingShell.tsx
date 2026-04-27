// components/marketing/v3/MarketingShell.tsx
import type { ReactNode } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';

interface Props {
  children: ReactNode;
}

/**
 * Wraps marketing pages (/pricing, /frameworks, /token, /blog, /roadmap,
 * /changelog, /help, /support hub, /affiliate, /privacy, /terms,
 * /cookies, /impressum) with the v3 Nav + Footer.
 *
 * Pages wrapped here MUST be in LayoutShell's IMMERSIVE_PATTERNS so the
 * legacy global Header/Footer don't double-stack.
 */
export function MarketingShell({ children }: Props) {
  return (
    <div>
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
