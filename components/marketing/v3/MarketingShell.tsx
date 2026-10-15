// components/marketing/v3/MarketingShell.tsx
import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

interface Props {
  children: ReactNode;
  contentLanguage?: string;
}

/**
 * Wraps marketing pages (/pricing, /explore, /traders, /frameworks, /token, /blog, /roadmap,
 * /changelog, /help, /support hub, /privacy, /terms,
 * /compute, /cookies, /impressum) with the v3 Nav + Footer.
 *
 * Pages wrapped here MUST be in LayoutShell's IMMERSIVE_PATTERNS so the
 * legacy global Header/Footer don't double-stack.
 */
export function MarketingShell({ children, contentLanguage }: Props) {
  return (
    <div>
      <Nav />
      <main lang={contentLanguage}>{children}</main>
      <Footer />
    </div>
  );
}
