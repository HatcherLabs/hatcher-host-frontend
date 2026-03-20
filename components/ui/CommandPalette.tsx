'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Bot,
  PlusCircle,
  CreditCard,
  Settings,
  Globe,
  Coins,
  HelpCircle,
  Zap,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: typeof Search;
  href: string;
  shortcut?: string;
  section: string;
}

const COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', shortcut: 'D', section: 'Navigation' },
  { id: 'agents', label: 'My Agents', icon: Bot, href: '/dashboard/agents', shortcut: 'A', section: 'Navigation' },
  { id: 'create', label: 'Create Agent', icon: PlusCircle, href: '/create', shortcut: 'C', section: 'Actions' },
  { id: 'explore', label: 'Explore Agents', icon: Globe, href: '/explore', shortcut: 'E', section: 'Navigation' },
  { id: 'billing', label: 'Billing', icon: CreditCard, href: '/dashboard/billing', shortcut: 'B', section: 'Navigation' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', shortcut: 'S', section: 'Navigation' },
  { id: 'pricing', label: 'Pricing', icon: Zap, href: '/pricing', section: 'Navigation' },
  { id: 'token', label: '$HATCH Token', icon: Coins, href: '/token', section: 'Navigation' },
  { id: 'help', label: 'Help & Support', icon: HelpCircle, href: '/support', section: 'Navigation' },
];

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  // Group by section
  const sections = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  const flatItems = Object.values(sections).flat();

  // Open/close with Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      if (href !== pathname) router.push(href);
    },
    [router, pathname],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
      navigate(flatItems[selectedIndex].href);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            className="relative w-full max-w-lg mx-4 rounded-2xl border overflow-hidden"
            style={{
              background: '#1A1730',
              borderColor: 'rgba(46,43,74,0.6)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(249,115,22,0.08)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            role="dialog"
            aria-label="Command palette"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(46,43,74,0.6)]">
              <Search size={18} className="text-[#71717a] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search commands..."
                className="flex-1 bg-transparent outline-none text-sm text-[#fafafa] placeholder:text-[#71717a]"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#71717a] bg-white/[0.04] border border-white/[0.06] rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto py-2">
              {flatItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[#71717a]">
                  No commands found
                </div>
              ) : (
                Object.entries(sections).map(([section, items]) => (
                  <div key={section}>
                    <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#71717a]">
                      {section}
                    </p>
                    {items.map((item) => {
                      const globalIndex = flatItems.indexOf(item);
                      const Icon = item.icon;
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.href)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            isSelected
                              ? 'bg-[rgba(249,115,22,0.08)] text-white'
                              : 'text-[#A5A1C2] hover:bg-white/[0.02]'
                          }`}
                        >
                          <Icon size={16} className={isSelected ? 'text-[#f97316]' : 'text-[#71717a]'} />
                          <span className="flex-1">{item.label}</span>
                          {item.shortcut && (
                            <kbd className="text-[10px] font-mono text-[#71717a] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5">
                              {item.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-[rgba(46,43,74,0.6)] flex items-center gap-4 text-[10px] text-[#71717a]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded font-mono">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded font-mono">esc</kbd>
                Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
