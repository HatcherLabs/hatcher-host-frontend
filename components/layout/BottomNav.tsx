'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  PlusCircle,
  CreditCard,
  Settings,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  accent?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/agents',   label: 'Agents',    icon: Bot },
  { href: '/create',             label: 'Create',    icon: PlusCircle, accent: true },
  { href: '/dashboard/billing',  label: 'Billing',   icon: CreditCard },
  { href: '/settings', label: 'Settings',  icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/agents' && pathname.startsWith('/dashboard/agent/')) return true;
  return pathname === href || pathname.startsWith(href + '/');
}

export function BottomNav() {
  const pathname = usePathname();

  const isDashboard = useMemo(
    () => pathname.startsWith('/dashboard') || pathname === '/create' || pathname === '/settings',
    [pathname],
  );

  if (!isDashboard) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06]"
      style={{
        background: 'linear-gradient(180deg, rgba(15, 13, 31, 0.85) 0%, rgba(13, 11, 26, 0.95) 100%)',
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 h-16">
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
                'relative flex flex-col items-center justify-center gap-1 min-w-[48px] py-1 rounded-xl transition-colors duration-200',
                item.accent && !active && 'text-[#f97316]',
                active
                  ? 'text-[#f97316]'
                  : !item.accent && 'text-[#71717a]',
              )}
            >
              {/* Active indicator dot */}
              {active && (
                <motion.div
                  className="absolute -top-1 w-1 h-1 rounded-full bg-[#f97316] shadow-[0_0_6px_rgba(249,115,22,0.6)]"
                  layoutId="bottomNavActive"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon container -- accent "create" button gets special styling */}
              {item.accent ? (
                <div
                  className={clsx(
                    'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200',
                    active
                      ? 'bg-[#f97316] text-white shadow-[0_0_16px_rgba(249,115,22,0.4)]'
                      : 'bg-[rgba(249,115,22,0.12)] text-[#f97316]',
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
              ) : (
                <Icon className="w-5 h-5" />
              )}

              {/* Label (hidden for the accent Create button to save space) */}
              {!item.accent && (
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
