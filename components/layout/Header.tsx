'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@/components/wallet/WalletButton';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { DOCS_URL } from '@/lib/config';
const ADMIN_WALLET = process.env['NEXT_PUBLIC_ADMIN_WALLET'] ?? '';

const NAV_LINKS = [
  { href: '/dashboard',         label: 'Dashboard' },
  { href: '/dashboard/agents',  label: 'My Agents' },
  { href: '/explore',           label: 'Explore' },
  { href: '/create',            label: 'Create' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/pricing',           label: 'Pricing' },
  { href: '/token',             label: '$HATCH' },
  { href: '/support',           label: 'Support' },
];

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  if (href === '/dashboard/agents' && pathname.startsWith('/dashboard/agent/')) return true;
  return pathname.startsWith(href + '/') || pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toString() ?? '';
  const isAdmin = ADMIN_WALLET ? walletAddress === ADMIN_WALLET : false;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/50 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo + Admin */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="flex items-center gap-2">
                {/* Egg logo mark */}
                <span className="relative flex items-center justify-center w-7 h-7">
                  <svg viewBox="0 0 28 28" width="28" height="28" fill="none" className="drop-shadow-[0_0_6px_rgba(249,115,22,0.3)]">
                    <ellipse cx="14" cy="15" rx="9" ry="11" fill="url(#eggGrad)" stroke="#f97316" strokeWidth="1" opacity="0.9" />
                    <ellipse cx="14" cy="13" rx="5" ry="6" fill="none" stroke="rgba(249,115,22,0.3)" strokeWidth="0.5" />
                    <circle cx="14" cy="12" r="2" fill="#f97316" opacity="0.6">
                      <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    <defs>
                      <linearGradient id="eggGrad" x1="14" y1="4" x2="14" y2="26" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#252240" />
                        <stop offset="100%" stopColor="#1A1730" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                  Hatcher
                </span>
              </span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-200',
                  pathname === '/admin'
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'text-[#71717a] hover:text-orange-400 hover:bg-orange-500/10'
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5 relative" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'relative px-3 py-1.5 text-sm rounded-lg transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                    active
                      ? 'text-white'
                      : 'text-[#71717a] hover:text-white'
                  )}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-5 h-0.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                      layoutId="headerActiveTab"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 text-[#71717a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
            >
              Docs
            </a>
          </nav>

          {/* Right side: wallet button + hamburger */}
          <div className="flex items-center gap-3">
            <WalletMultiButton />

            {/* Hamburger -- mobile/tablet only */}
            <button
              className="lg:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-[rgba(249,115,22,0.1)] transition-colors gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-menu"
            >
              <span
                className={clsx(
                  'block w-4 h-px bg-[#f97316]/60 transition-transform duration-200',
                  mobileOpen && 'translate-y-[5px] rotate-45'
                )}
              />
              <span
                className={clsx(
                  'block w-4 h-px bg-[#f97316]/60 transition-opacity duration-200',
                  mobileOpen && 'opacity-0'
                )}
              />
              <span
                className={clsx(
                  'block w-4 h-px bg-[#f97316]/60 transition-transform duration-200',
                  mobileOpen && '-translate-y-[5px] -rotate-45'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav-menu"
            className="lg:hidden border-t border-white/[0.06] bg-black/80 backdrop-blur-xl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-0.5" aria-label="Mobile navigation">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={link.href}
                    className={clsx(
                      'block px-3 py-2.5 text-sm rounded-lg transition-colors duration-200',
                      isActive(pathname, link.href)
                        ? 'text-white bg-white/[0.04]'
                        : 'text-[#71717a] hover:text-white'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: NAV_LINKS.length * 0.04 }}
              >
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2.5 text-sm rounded-lg transition-colors duration-200 text-[#71717a] hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Docs
                </a>
              </motion.div>
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (NAV_LINKS.length + 1) * 0.04 }}
                >
                  <Link
                    href="/admin"
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors duration-200',
                      pathname === '/admin'
                        ? 'text-orange-400 bg-orange-500/10'
                        : 'text-[#71717a] hover:text-orange-400'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </Link>
                </motion.div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
