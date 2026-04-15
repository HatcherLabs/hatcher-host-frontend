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
  Coins,
  HelpCircle,
  Zap,
  Clock,
  Play,
  Square,
  BarChart3,
  Users,
  BookOpen,
  Keyboard,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';

interface CommandItem {
  id: string;
  label: string;
  icon: typeof Search;
  href?: string;
  action?: () => void;
  shortcut?: string;
  section: string;
  meta?: string;
}

const STATIC_COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', shortcut: 'D', section: 'Navigation' },
  { id: 'agents', label: 'My Agents', icon: Bot, href: '/dashboard/agents', shortcut: 'A', section: 'Navigation' },
  { id: 'create', label: 'Create Agent', icon: PlusCircle, href: '/create', shortcut: 'C', section: 'Actions' },
  { id: 'billing', label: 'Billing', icon: CreditCard, href: '/dashboard/billing', shortcut: 'B', section: 'Navigation' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', shortcut: 'S', section: 'Navigation' },
  { id: 'pricing', label: 'Pricing', icon: Zap, href: '/pricing', section: 'Navigation' },
  { id: 'token', label: '$HATCHER Token', icon: Coins, href: '/token', section: 'Navigation' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', section: 'Navigation' },
  { id: 'team', label: 'Team', icon: Users, href: '/dashboard/team', section: 'Navigation' },
  { id: 'help', label: 'Help & Support', icon: HelpCircle, href: '/support', section: 'Navigation' },
  { id: 'docs', label: 'Documentation', icon: BookOpen, href: 'https://docs.hatcher.host', section: 'Navigation' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard, href: '/shortcuts', shortcut: '?', section: 'Navigation' },
];

const RECENT_KEY = 'cmd_palette_recent';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  try {
    const prev = getRecent().filter((r) => r !== id);
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch agents when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    api.getMyAgents().then((res) => {
      if (res.success) setAgents(res.data);
    });
  }, [isAuthenticated]);

  // Load recent on open
  useEffect(() => {
    if (open) setRecentIds(getRecent());
  }, [open]);

  // Build full command list
  const allCommands: CommandItem[] = [
    ...STATIC_COMMANDS,
    ...agents.map((a) => ({
      id: `agent-${a.id}`,
      label: a.name,
      icon: Bot,
      href: `/dashboard/agent/${a.id}`,
      section: 'Agents',
      meta: a.status,
    })),
    ...agents
      .filter((a) => a.status === 'active')
      .map((a) => ({
        id: `stop-${a.id}`,
        label: `Stop ${a.name}`,
        icon: Square,
        action: () => api.stopAgent(a.id),
        section: 'Actions',
        meta: 'agent action',
      })),
    ...agents
      .filter((a) => a.status !== 'active')
      .map((a) => ({
        id: `start-${a.id}`,
        label: `Start ${a.name}`,
        icon: Play,
        action: () => api.startAgent(a.id),
        section: 'Actions',
        meta: 'agent action',
      })),
  ];

  // Filtered commands
  const filtered = query
    ? allCommands.filter((c) => fuzzyMatch(c.label, query) || (c.meta && fuzzyMatch(c.meta, query)))
    : allCommands;

  // Recent section (prepended when no query)
  const recentItems: CommandItem[] = !query
    ? recentIds
        .map((id) => allCommands.find((c) => c.id === id))
        .filter(Boolean)
        .map((c) => ({ ...c!, section: 'Recent', icon: Clock }))
    : [];

  const combined = [...recentItems, ...filtered.filter((c) => !recentIds.includes(c.id) || query)];

  // Group by section
  const sections = combined.reduce<Record<string, CommandItem[]>>((acc, item) => {
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

  const execute = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery('');
      pushRecent(item.id);
      if (item.action) {
        item.action();
      } else if (item.href) {
        if (item.href.startsWith('http')) {
          window.open(item.href, '_blank', 'noopener,noreferrer');
        } else if (item.href !== pathname) {
          router.push(item.href);
        }
      }
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
      execute(flatItems[selectedIndex]);
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
              background: 'var(--bg-elevated)',
              borderColor: 'rgba(46,43,74,0.6)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(6,182,212,0.08)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-default)]">
              <Search size={18} className="text-[var(--text-muted)] flex-shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search commands, agents..."
                className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                aria-label="Command search"
                autoComplete="off"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-default)] rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              className="max-h-[320px] overflow-y-auto py-2"
              role="listbox"
              aria-label="Command results"
              aria-activedescendant={flatItems[selectedIndex] ? `cmd-item-${flatItems[selectedIndex].id}` : undefined}
            >
              {flatItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                  No commands found
                </div>
              ) : (
                Object.entries(sections).map(([section, items]) => (
                  <div key={section}>
                    <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-[var(--text-muted)]">
                      {section}
                    </p>
                    {items.map((item) => {
                      const globalIndex = flatItems.indexOf(item);
                      const Icon = item.icon;
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          id={`cmd-item-${item.id}`}
                          onClick={() => execute(item)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          role="option"
                          aria-selected={isSelected}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[rgba(6,182,212,0.08)] text-white'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          <Icon size={16} className={isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)]'} aria-hidden="true" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.meta && !item.meta.includes('action') && (
                            <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">{item.meta}</span>
                          )}
                          {item.shortcut && (
                            <kbd className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-default)] rounded px-1.5 py-0.5 shrink-0">
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
            <div className="px-4 py-2.5 border-t border-[var(--border-default)] flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded font-mono">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded font-mono">esc</kbd>
                Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
