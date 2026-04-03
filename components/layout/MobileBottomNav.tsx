'use client';

import { usePathname, useRouter } from 'next/navigation';
import { isNative } from '@/lib/capacitor';
import { haptic } from '@/lib/capacitor';
import {
  Home,
  Plus,
  Compass,
  Settings,
  Bot,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/agents', icon: Bot, label: 'Agents' },
  { href: '/create', icon: Plus, label: 'Create', accent: true },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (!isNative) return null;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9998] border-t border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => {
                haptic('light');
                router.push(item.href);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                item.accent && !active
                  ? 'text-[#8b5cf6]'
                  : active
                    ? 'text-[#8b5cf6]'
                    : 'text-zinc-500'
              }`}
            >
              {item.accent ? (
                <div className={`flex items-center justify-center w-10 h-7 rounded-full ${
                  active ? 'bg-[#8b5cf6] text-white' : 'bg-[#8b5cf6]/15 text-[#8b5cf6]'
                }`}>
                  <Icon className="w-5 h-5" strokeWidth={2.5} />
                </div>
              ) : (
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              )}
              <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
