'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, LogOut, Settings, ChevronDown,
  CreditCard, Users, Wallet, Activity,
} from 'lucide-react';
import { DOCS_URL } from '@/lib/config';
import { NotificationCenter } from '@/components/ui/NotificationCenter';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// ── Nav links when logged IN ──
const AUTH_NAV_LINKS = [
  { href: '/dashboard/agents',    label: 'My Agents' },
  { href: '/explore',             label: 'Explore' },
  { href: '/create',              label: 'Create' },
  { href: '/token',               label: 'Token' },
];

// ── Nav links when logged OUT ──
const GUEST_NAV_LINKS = [
  { href: '/explore',             label: 'Explore' },
  { href: '/templates',           label: 'Templates' },
  { href: '/token',               label: 'Token' },
];

// ── Auxiliary links (visible in both states, after a divider) ──
const AUX_LINKS = [
  { href: '/pricing',   label: 'Pricing',   external: false, badge: null, authOnly: false },
  { href: '/support',   label: 'Support',   external: false, badge: null, authOnly: true },
  { href: DOCS_URL,     label: 'Docs',      external: true,  badge: null, authOnly: false },
];

// ── User dropdown links ──
const USER_EXTRA_LINKS = [
  { href: '/dashboard/analytics', label: 'Analytics', icon: Activity },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

// ── Mobile links (when logged in) ──
const MOBILE_AUTH_LINKS = [
  { href: '/dashboard/agents',    label: 'My Agents' },
  { href: '/explore',             label: 'Explore' },
  { href: '/create',              label: 'Create' },
  { href: '/token',               label: 'Token' },
  { href: '/pricing',             label: 'Pricing' },
  { href: '/support',             label: 'Support' },
];

// ── Mobile links (when logged out) ──
const MOBILE_GUEST_LINKS = [
  { href: '/explore',   label: 'Explore' },
  { href: '/templates', label: 'Templates' },
  { href: '/token',     label: 'Token' },
  { href: '/pricing',   label: 'Pricing' },
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
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.isAdmin ?? false;
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (isAuthenticated && dropdownOpen && creditBalance === null) {
      api.getCreditBalance().then(res => {
        if (res.success) setCreditBalance(res.data.balance);
      });
    }
  }, [isAuthenticated, dropdownOpen, creditBalance]);

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

  // Desktop nav links depend on auth state
  const primaryLinks = isAuthenticated ? AUTH_NAV_LINKS : GUEST_NAV_LINKS;
  const mobileLinks = isAuthenticated ? MOBILE_AUTH_LINKS : MOBILE_GUEST_LINKS;

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-[var(--border-default)] backdrop-blur-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-base) 80%, transparent)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">

          {/* Left: Logo + Admin */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="flex items-center gap-2">
                <span className="relative flex items-center justify-center w-7 h-7">
                  <svg viewBox="0 0 28 28" width="28" height="28" fill="none" aria-label="Hatcher logo" role="img">
                    <defs>
                      <linearGradient id="eggShell" x1="14" y1="3" x2="14" y2="27" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#2a2a38" />
                        <stop offset="50%" stopColor="var(--bg-elevated)" />
                        <stop offset="100%" stopColor="var(--bg-card-solid)" />
                      </linearGradient>
                      <radialGradient id="eggInnerGlow" cx="50%" cy="40%" r="40%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggShell)" stroke="rgba(139,92,246,0.5)" strokeWidth="0.8" />
                    <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggInnerGlow)" />
                    <path d="M10 14.5 L12.5 12.5 L11 10.5 L13.5 9 L12 7" stroke="#8b5cf6" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.6" />
                    <circle cx="12" cy="11" r="1.5" fill="#8b5cf6" opacity="0.3" />
                    <ellipse cx="11" cy="10" rx="2.5" ry="4" fill="white" opacity="0.04" transform="rotate(-15 11 10)" />
                  </svg>
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                  Hatcher
                </span>
              </span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className={clsx(
                  'hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-200',
                  pathname === '/admin'
                    ? 'bg-purple-500/15 text-purple-400'
                    : 'text-[var(--text-muted)] hover:text-purple-400 hover:bg-purple-500/10'
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
          </div>

          {/* Desktop Nav — flat links, no dropdown */}
          <nav className="hidden lg:flex items-center gap-1 relative" aria-label="Main navigation">
            {/* Primary links (auth-only) */}
            {primaryLinks.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'relative px-3 py-1.5 text-sm rounded-lg transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
                    active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-5 h-0.5 bg-purple-500 rounded-full"
                      layoutId="headerActiveTab"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}

            {/* Divider between primary and auxiliary (only when logged in) */}
            {isAuthenticated && !authLoading && (
              <span className="w-px h-4 bg-[var(--border-default)] mx-1" aria-hidden="true" />
            )}

            {/* Auxiliary links */}
            {AUX_LINKS.filter(l => !l.authOnly || isAuthenticated).map((link) => {
              const active = !link.external && isActive(pathname, link.href);
              const Comp = link.external ? 'a' : Link;
              const extraProps = link.external
                ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' }
                : { href: link.href };
              return (
                <Comp
                  key={link.href}
                  {...extraProps}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'relative flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
                    active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {link.label}
                  {link.badge && (
                    <span className="px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      {link.badge}
                    </span>
                  )}
                  {active && (
                    <motion.div
                      className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-5 h-0.5 bg-purple-500 rounded-full"
                      layoutId="headerActiveTab"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Comp>
              );
            })}
          </nav>

          {/* Right side: notifications + user menu + hamburger */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
              {authLoading ? (
                <div className="h-9 w-24 rounded-lg bg-[var(--bg-card)] animate-pulse" />
              ) : isAuthenticated && user ? (
                <>
                  <NotificationCenter />
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(o => !o)}
                      aria-expanded={dropdownOpen}
                      aria-haspopup="menu"
                      className="h-9 px-3 flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all duration-200"
                    >
                      {user.avatarUrl ? (
                        <Image src={user.avatarUrl} alt={user.username} width={20} height={20} className="w-5 h-5 rounded-full object-cover flex-shrink-0" unoptimized />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                      )}
                      <span className="text-xs font-medium text-purple-300">{user.username}</span>
                      <ChevronDown className={clsx('w-3 h-3 text-purple-400/60 transition-transform duration-200', dropdownOpen && 'rotate-180')} />
                    </button>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-1 w-52 rounded-xl shadow-xl z-50 overflow-hidden"
                          style={{
                            background: 'color-mix(in srgb, var(--bg-surface) 95%, transparent)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          {/* User info */}
                          <div className="px-4 py-2.5 border-b border-[var(--border-default)] flex items-center gap-2.5">
                            {user.avatarUrl ? (
                              <Image src={user.avatarUrl} alt={user.username} width={32} height={32} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" unoptimized />
                            ) : (
                              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold text-purple-300 bg-purple-500/20">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                            <p className="text-xs text-[var(--text-primary)] font-medium truncate">{user.username}</p>
                            <p className="text-[10px] text-[var(--text-secondary)] truncate">{user.email}</p>
                            {creditBalance !== null && creditBalance > 0 && (
                              <Link
                                href="/dashboard/billing"
                                onClick={() => setDropdownOpen(false)}
                                className="mt-1.5 flex items-center gap-1.5 text-[10px] text-green-400 hover:text-green-300 transition-colors"
                              >
                                <Wallet className="w-3 h-3" />
                                <span className="font-semibold">${creditBalance.toFixed(2)}</span>
                                <span className="text-[var(--text-secondary)]">credits</span>
                              </Link>
                            )}
                            </div>
                          </div>

                          {/* Extra nav links */}
                          {USER_EXTRA_LINKS.map((link) => {
                            const Icon = link.icon;
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setDropdownOpen(false)}
                                className={clsx(
                                  'flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors duration-200',
                                  isActive(pathname, link.href)
                                    ? 'text-[var(--text-primary)] bg-[var(--bg-card)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                                )}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {link.label}
                              </Link>
                            );
                          })}

                          {/* Sign out */}
                          <div className="border-t border-[var(--border-default)]">
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors duration-200"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" className="h-9 px-4 text-[var(--text-primary)] font-medium text-xs rounded-full border border-[var(--border-default)] bg-transparent hover:bg-[var(--bg-card)] transition-all duration-200 flex items-center">
                    Sign In
                  </Link>
                  <Link href="/register" className="h-9 px-4 text-white font-medium text-xs rounded-full bg-purple-600 hover:bg-purple-500 transition-all duration-200 flex items-center">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile theme toggle + notification bell */}
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
            {isAuthenticated && user && (
              <div className="lg:hidden">
                <NotificationCenter />
              </div>
            )}

            {/* Hamburger -- mobile only */}
            <button
              className="lg:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-[rgba(139,92,246,0.1)] transition-colors gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-menu"
            >
              <span className={clsx('block w-4 h-px bg-[#8b5cf6]/60 transition-transform duration-200', mobileOpen && 'translate-y-[5px] rotate-45')} />
              <span className={clsx('block w-4 h-px bg-[#8b5cf6]/60 transition-opacity duration-200', mobileOpen && 'opacity-0')} />
              <span className={clsx('block w-4 h-px bg-[#8b5cf6]/60 transition-transform duration-200', mobileOpen && '-translate-y-[5px] -rotate-45')} />
            </button>
          </div>
        </div>
      </div>

    </header>

      {/* Mobile dropdown — MUST be outside <header> because backdrop-blur creates a stacking context that breaks position:fixed children */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav-menu"
            className="lg:hidden fixed inset-0 z-[60] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-base)', top: '57px' }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-0.5 min-h-full border-t border-[var(--border-default)]" aria-label="Mobile navigation">
              {mobileLinks.map((link, i) => (
                <motion.div key={link.href} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link
                    href={link.href}
                    className={clsx(
                      'block px-3 py-2.5 text-sm rounded-lg transition-colors duration-200',
                      isActive(pathname, link.href) ? 'text-[var(--text-primary)] bg-[var(--bg-card)] border-l-2 border-purple-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              {/* Docs link */}
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: mobileLinks.length * 0.03 }}>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2.5 text-sm rounded-lg transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)] border-l-2 border-transparent"
                  onClick={() => setMobileOpen(false)}
                >
                  Docs
                </a>
              </motion.div>

              {isAdmin && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (mobileLinks.length + 1) * 0.03 }}>
                  <Link
                    href="/admin"
                    className={clsx('flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors border-l-2', pathname === '/admin' ? 'text-purple-400 bg-purple-500/10 border-purple-500' : 'text-[var(--text-muted)] hover:text-purple-400 border-transparent')}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Shield className="w-4 h-4" /> Admin Panel
                  </Link>
                </motion.div>
              )}

              {/* Mobile auth */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (mobileLinks.length + 2) * 0.03 }}
                className="mt-2 pt-3 border-t border-[var(--border-default)]"
              >
                {isAuthenticated && user ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 flex items-center gap-2">
                      {user.avatarUrl ? (
                        <Image src={user.avatarUrl} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover flex-shrink-0" unoptimized />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-purple-300">{user.username}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] ml-auto truncate max-w-[150px]">{user.email}</span>
                    </div>
                    <Link href="/dashboard/analytics" className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" onClick={() => setMobileOpen(false)}>
                      <Activity className="w-4 h-4" /> Analytics
                    </Link>
                    <Link href="/dashboard/team" className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" onClick={() => setMobileOpen(false)}>
                      <Users className="w-4 h-4" /> Team
                    </Link>
                    <Link href="/dashboard/billing" className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" onClick={() => setMobileOpen(false)}>
                      <CreditCard className="w-4 h-4" /> Billing
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" onClick={() => setMobileOpen(false)}>
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setMobileOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3">
                    <Link href="/login" className="flex-1 h-10 text-[var(--text-primary)] font-medium text-sm rounded-lg border border-[var(--border-default)] flex items-center justify-center" onClick={() => setMobileOpen(false)}>Sign In</Link>
                    <Link href="/register" className="flex-1 h-10 text-white font-medium text-sm rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center" onClick={() => setMobileOpen(false)}>Sign Up</Link>
                  </div>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
