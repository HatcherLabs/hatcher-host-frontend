'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  PlusCircle,
  CreditCard,
  Settings,
  HelpCircle,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/agents',  label: 'My Agents',    icon: Bot },
  { href: '/create',            label: 'Create Agent',  icon: PlusCircle },
  { href: '/dashboard/billing', label: 'Billing',      icon: CreditCard },
] as const;

const BOTTOM_ITEMS = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/support',            label: 'Help',     icon: HelpCircle },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/agents' && pathname.startsWith('/dashboard/agent/')) return true;
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  const isDashboard = useMemo(
    () => pathname.startsWith('/dashboard') || pathname === '/create' || pathname === '/settings',
    [pathname],
  );

  const displayName = user?.username ?? user?.email ?? '';

  if (!isDashboard) return null;

  return (
    <>
      {/* Desktop sidebar: full width (lg+) */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 z-40 h-screen w-[260px] flex-col border-r border-white/[0.06]"
        style={{
          background: 'linear-gradient(180deg, #0F0D1F 0%, #130F28 100%)',
        }}
        aria-label="Dashboard sidebar"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-white/[0.06] flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg viewBox="0 0 28 28" width="24" height="24" fill="none" className="drop-shadow-[0_0_8px_rgba(249,115,22,0.25)]">
              <defs>
                <linearGradient id="eggSidebarD" x1="14" y1="3" x2="14" y2="27" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3D375E" />
                  <stop offset="50%" stopColor="#252240" />
                  <stop offset="100%" stopColor="#1A1730" />
                </linearGradient>
                <radialGradient id="eggGlowSidebarD" cx="50%" cy="40%" r="40%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggSidebarD)" stroke="rgba(249,115,22,0.5)" strokeWidth="0.8" />
              <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggGlowSidebarD)" />
              <path d="M10 14.5 L12.5 12.5 L11 10.5 L13.5 9 L12 7" stroke="#f97316" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.6" />
              <circle cx="12" cy="11" r="1.5" fill="#f97316" opacity="0.3">
                <animate attributeName="opacity" values="0.2;0.45;0.2" dur="3s" repeatCount="indefinite" />
              </circle>
            </svg>
            <span
              className="text-lg font-bold text-white"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Hatcher
            </span>
          </Link>
        </div>

        {/* Main nav */}
        <nav role="navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200',
                  active
                    ? 'text-white bg-[rgba(249,115,22,0.1)]'
                    : 'text-[#A5A1C2] hover:text-white hover:bg-[#2E2B4A]',
                )}
              >
                {active && (
                  <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#f97316]"
                    layoutId="sidebarActive"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-3 space-y-1 flex-shrink-0">
          {BOTTOM_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200',
                  active
                    ? 'text-white bg-[rgba(249,115,22,0.1)]'
                    : 'text-[#A5A1C2] hover:text-white hover:bg-[#2E2B4A]',
                )}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* User info */}
          {isAuthenticated && displayName && (
            <div className="mt-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f97316]/30 to-[#f97316]/10 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#A5A1C2] truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-[#4ade80] font-medium">Signed in</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Tablet sidebar: icon-only (md to lg) */}
      <aside
        className="hidden md:flex lg:hidden fixed top-0 left-0 z-40 h-screen w-[60px] flex-col items-center border-r border-white/[0.06]"
        style={{
          background: 'linear-gradient(180deg, #0F0D1F 0%, #130F28 100%)',
        }}
        aria-label="Dashboard sidebar (compact)"
      >
        {/* Logo icon */}
        <div className="flex items-center justify-center h-14 w-full border-b border-white/[0.06] flex-shrink-0">
          <Link href="/" aria-label="Hatcher home">
            <svg viewBox="0 0 28 28" width="22" height="22" fill="none" className="drop-shadow-[0_0_8px_rgba(249,115,22,0.25)]">
              <defs>
                <linearGradient id="eggSidebarT" x1="14" y1="3" x2="14" y2="27" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3D375E" />
                  <stop offset="50%" stopColor="#252240" />
                  <stop offset="100%" stopColor="#1A1730" />
                </linearGradient>
                <radialGradient id="eggGlowSidebarT" cx="50%" cy="40%" r="40%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggSidebarT)" stroke="rgba(249,115,22,0.5)" strokeWidth="0.8" />
              <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggGlowSidebarT)" />
              <path d="M10 14.5 L12.5 12.5 L11 10.5 L13.5 9 L12 7" stroke="#f97316" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.6" />
            </svg>
          </Link>
        </div>

        {/* Nav icons */}
        <nav role="navigation" className="flex-1 flex flex-col items-center gap-1 py-4" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-200',
                  active
                    ? 'text-white bg-[rgba(249,115,22,0.1)]'
                    : 'text-[#A5A1C2] hover:text-white hover:bg-[#2E2B4A]',
                )}
              >
                {active && (
                  <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#f97316]"
                    layoutId="sidebarActiveTablet"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-[18px] h-[18px]" />
              </Link>
            );
          })}
        </nav>

        {/* Bottom icons */}
        <div className="pb-3 flex flex-col items-center gap-1 flex-shrink-0">
          {BOTTOM_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={clsx(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-200',
                  active
                    ? 'text-white bg-[rgba(249,115,22,0.1)]'
                    : 'text-[#A5A1C2] hover:text-white hover:bg-[#2E2B4A]',
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
              </Link>
            );
          })}

          {/* Auth indicator */}
          {isAuthenticated && (
            <div className="mt-2 w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center" aria-label="Signed in">
              <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
