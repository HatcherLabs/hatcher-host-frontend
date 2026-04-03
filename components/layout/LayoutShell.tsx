'use client';

import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { isNative } from '@/lib/capacitor';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip to content -- accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#06b6d4] focus:text-white focus:text-sm focus:font-semibold focus:outline-none focus:shadow-lg"
      >
        Skip to content
      </a>
      {/* Hide full header on native app — bottom nav replaces it */}
      {!isNative && <Header />}
      {/* Compact native header with just the logo/title */}
      {isNative && <MobileHeader />}
      <main
        id="main-content"
        role="main"
        className={`flex-1 ${isNative ? 'pb-16' : ''}`}
        tabIndex={-1}
      >
        {children}
      </main>
      {!isNative && <Footer />}
      {!isNative && <ScrollToTop />}
      <MobileBottomNav />
    </div>
  );
}

/** Minimal top bar for native app — safe area + back-aware title */
function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06] safe-area-top">
      <div className="flex items-center justify-center h-11 px-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-3.5 h-3.5" fill="none">
              <path d="M16 5 C10 5, 6 11.5, 6 17 C6 23, 10.5 28, 16 28 C21.5 28, 26 23, 26 17 C26 11.5, 22 5, 16 5Z" fill="#1a1a22" stroke="#a78bfa" strokeWidth="1.5"/>
              <path d="M12 16 L14 14 L12.5 12 L15 10 L13.5 8" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">Hatcher</span>
        </div>
      </div>
    </header>
  );
}
