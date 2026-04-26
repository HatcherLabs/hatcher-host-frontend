'use client';

import { usePathname } from '@/i18n/routing';
import { Header } from './Header';
import { Footer } from './Footer';
import { ScrollToTop } from '@/components/ui/ScrollToTop';

// Routes that own the full viewport — the Header/Footer chrome would
// cover their canvas. Extend this list as we add more immersive views.
// Note: /city keeps the site chrome so the map feels part of hatcher.host
// rather than a standalone app; the canvas sits inside the main content area.
const IMMERSIVE_PATTERNS: RegExp[] = [
  /^\/agent\/[^/]+\/room(?:-legacy)?(?:\/|$)/,
  // Chat-to-hatch ships its own slim brand bar + back link; the legacy
  // global chrome would push the chat / preview columns below the fold.
  /^\/chat-to-hatch(?:\/|$)/,
  // LandingV3 owns its own Nav + Footer (marketing v3 chrome). Skipping
  // the legacy global chrome here prevents double-stacking.
  /^\/$/,
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = IMMERSIVE_PATTERNS.some(re => re.test(pathname));

  if (immersive) {
    // No skip-link, no header, no footer — the page owns the screen.
    // Individual pages are responsible for accessible navigation back.
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip to content -- accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--color-accent)] focus:text-white focus:text-sm focus:font-semibold focus:outline-none focus:shadow-lg"
      >
        Skip to content
      </a>
      <Header />
      <main
        id="main-content"
        role="main"
        className="flex-1"
        tabIndex={-1}
      >
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
