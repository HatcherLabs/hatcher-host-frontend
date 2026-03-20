'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ScrollToTop } from '@/components/ui/ScrollToTop';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard') || pathname === '/create' || pathname === '/settings';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip to content -- accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#f97316] focus:text-white focus:text-sm focus:font-semibold focus:outline-none focus:shadow-lg"
      >
        Skip to content
      </a>
      <Header />
      <Sidebar />
      <main
        id="main-content"
        role="main"
        className={isDashboard ? 'flex-1 dashboard-content' : 'flex-1'}
        tabIndex={-1}
      >
        {children}
      </main>
      {isDashboard ? <BottomNav /> : <Footer />}
      <ScrollToTop />
    </div>
  );
}
