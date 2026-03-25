'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LogOut, Settings, User } from 'lucide-react';
import { DOCS_URL } from '@/lib/config';

const NAV_LINKS = [
  { href: '/dashboard/agents',  label: 'My Agents' },
  { href: '/explore',           label: 'Explore' },
  { href: '/marketplace',       label: 'Templates' },
  { href: '/create',            label: 'Create' },
  { href: '/dashboard/team',    label: 'Team' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/pricing',           label: 'Pricing' },
  { href: '/token',             label: 'Our Token' },
  { href: '/support',           label: 'Support' },
];

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === '/dashboard/agents' && (pathname.startsWith('/dashboard/agent/') || pathname === '/dashboard')) return true;
  return pathname.startsWith(href + '/');
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.isAdmin ?? false;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/50 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo + Admin */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="flex items-center gap-2">
                <span className="relative flex items-center justify-center w-7 h-7">
                  <svg viewBox="0 0 28 28" width="28" height="28" fill="none" className="drop-shadow-[0_0_8px_rgba(249,115,22,0.25)]">
                    <defs>
                      <linearGradient id="eggShell" x1="14" y1="3" x2="14" y2="27" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#3D375E" />
                        <stop offset="50%" stopColor="#252240" />
                        <stop offset="100%" stopColor="#1A1730" />
                      </linearGradient>
                      <radialGradient id="eggInnerGlow" cx="50%" cy="40%" r="40%">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggShell)" stroke="rgba(249,115,22,0.5)" strokeWidth="0.8" />
                    <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggInnerGlow)" />
                    <path d="M10 14.5 L12.5 12.5 L11 10.5 L13.5 9 L12 7" stroke="#f97316" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.6" />
                    <circle cx="12" cy="11" r="1.5" fill="#f97316" opacity="0.3">
                      <animate attributeName="opacity" values="0.2;0.45;0.2" dur="3s" repeatCount="indefinite" />
                    </circle>
                    <ellipse cx="11" cy="10" rx="2.5" ry="4" fill="white" opacity="0.04" transform="rotate(-15 11 10)" />
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

          {/* Right side: auth button/user menu + hamburger */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  className="h-9 px-3 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-all duration-200"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                  <span className="text-xs font-medium text-orange-300">{user.username}</span>
                  <span className="text-xs ml-1" style={{ color: 'rgba(167,139,250,0.6)' }}>&#9662;</span>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-1 w-48 rounded-xl shadow-xl z-50 overflow-hidden"
                    style={{
                      background: 'rgba(13, 11, 26, 0.95)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1px solid rgba(46, 43, 74, 0.4)',
                    }}
                  >
                    <div className="px-4 py-2.5 border-b border-white/[0.06]">
                      <p className="text-xs text-white font-medium truncate">{user.username}</p>
                      <p className="text-[10px] text-[#A5A1C2] truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#A5A1C2] hover:bg-white/[0.04] transition-colors duration-200 border-b border-white/[0.06]"
                    >
                      <Settings className="w-3 h-3" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors duration-200"
                    >
                      <LogOut className="w-3 h-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="h-9 px-4 text-white font-medium text-xs rounded-full border border-white/20 bg-transparent hover:bg-white/[0.04] transition-all duration-200 flex items-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="h-9 px-4 text-white font-medium text-xs rounded-full bg-orange-600 hover:bg-orange-500 transition-all duration-200 flex items-center"
                >
                  Sign Up
                </Link>
              </div>
            )}

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
