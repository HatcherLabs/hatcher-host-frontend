'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  AlertTriangle,
  Bell,
  Server,
  CreditCard,
  Plus,
  Users,
  DollarSign,
  MessageSquare,
  Check,
  Activity,
  X,
  Trash2,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  link?: string;
}

const ICON_MAP: Record<string, typeof Server> = {
  agent_started: Server,
  agent_stopped: Server,
  agent_created: Plus,
  agent_error: AlertTriangle,
  agent_restarted: Server,
  workspace_quota: AlertTriangle,
  subscription: CreditCard,
  subscription_confirmed: CreditCard,
  payment: CreditCard,
  team_member: Users,
  team_joined: Users,
  rental: DollarSign,
  rental_received: DollarSign,
  support: MessageSquare,
  support_reply: MessageSquare,
  feature: Activity,
  agent: Server,
};

const ICON_COLOR_MAP: Record<string, string> = {
  agent_started: 'text-emerald-400 bg-emerald-500/15',
  agent_stopped: 'text-amber-400 bg-amber-500/15',
  agent_created: 'text-[var(--color-accent)] bg-[var(--color-accent)]/15',
  agent_error: 'text-red-400 bg-red-500/15',
  agent_restarted: 'text-blue-400 bg-blue-500/15',
  workspace_quota: 'text-orange-400 bg-orange-500/15',
  agent: 'text-emerald-400 bg-emerald-500/15',
  subscription: 'text-purple-400 bg-purple-500/15',
  subscription_confirmed: 'text-purple-400 bg-purple-500/15',
  payment: 'text-purple-400 bg-purple-500/15',
  team_member: 'text-blue-400 bg-blue-500/15',
  team_joined: 'text-blue-400 bg-blue-500/15',
  rental: 'text-emerald-400 bg-emerald-500/15',
  rental_received: 'text-emerald-400 bg-emerald-500/15',
  support: 'text-[var(--color-accent)] bg-[var(--color-accent)]/15',
  support_reply: 'text-[var(--color-accent)] bg-[var(--color-accent)]/15',
  feature: 'text-amber-400 bg-amber-500/15',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Persist dismissed notification IDs in localStorage
const DISMISSED_KEY = 'hatcher:dismissed-notifications';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    // Keep only last 100 to prevent unbounded growth
    const arr = [...ids].slice(-100);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
  } catch {
    // localStorage full — ignore
  }
}

export function NotificationCenter() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Load dismissed IDs from localStorage
  useEffect(() => {
    setDismissed(getDismissed());
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getNotifications();
      if (res.success && res.data) {
        setNotifications((res.data.items ?? []).slice(0, 20));
        setReadAt((prev) => prev ?? res.data.readAt ?? null);
      }
    } catch {
      // silently fail
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(n => !dismissed.has(n.id));

  // Count unread (only visible ones)
  const unreadCount = readAt
    ? visibleNotifications.filter((n) => new Date(n.timestamp).getTime() > new Date(readAt).getTime()).length
    : visibleNotifications.length;

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setReadAt(now);
    try {
      const res = await api.markNotificationsRead();
      if (res.success) setReadAt(res.data.readAt);
    } catch (e) { console.debug('Failed to mark notifications as read', e); }
  };

  const dismissOne = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const clearAll = () => {
    const next = new Set(dismissed);
    for (const n of notifications) next.add(n.id);
    setDismissed(next);
    saveDismissed(next);
    markAllRead();
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => { if (!o && unreadCount > 0) markAllRead(); return !o; })}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-card)] transition-colors"
        aria-label={unreadCount > 0 ? t('unreadAriaLabel', { count: unreadCount }) : t('allReadAriaLabel')}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} className="text-[var(--text-secondary)]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-purple-600 text-[9px] font-bold text-white px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
          <div
            className="absolute right-0 mt-1 w-80 rounded-xl shadow-xl z-50 overflow-hidden bg-[var(--bg-card-solid)] border border-[var(--border-default)]"
            style={{
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('heading')}</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    aria-label={t('markReadAriaLabel')}
                    className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Check size={10} aria-hidden="true" />
                    {t('markRead')}
                  </button>
                )}
                {visibleNotifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    aria-label={t('clearAriaLabel')}
                    className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={10} aria-hidden="true" />
                    {t('clear')}
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {visibleNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <Activity size={24} className="text-[var(--text-muted)] mb-2" />
                  <p className="text-xs text-[var(--text-muted)]">{t('empty')}</p>
                </div>
              ) : (
                visibleNotifications.map((n) => {
                  const isUnread = readAt
                    ? new Date(n.timestamp).getTime() > new Date(readAt).getTime()
                    : true;
                  const Icon = ICON_MAP[n.type] || Activity;
                  const colorClass = ICON_COLOR_MAP[n.type] || 'text-[var(--text-secondary)] bg-white/10';
                  const [iconText, iconBg] = colorClass.split(' ');

                  // Derive a navigation target from explicit link or notification type.
                  // `feature` / `billing` / `subscription*` / `payment` all land on
                  // the billing page so users can act on an expiry warning or a
                  // feature-unlock receipt without hunting through menus.
                  const href: string | null = n.link
                    || (n.type === 'workspace_quota' ? '/dashboard' : null)
                    || (n.type.startsWith('agent') ? '/dashboard' : null)
                    || (n.type === 'feature' || n.type === 'billing' || n.type === 'subscription' || n.type === 'subscription_confirmed' || n.type === 'payment' ? '/dashboard/billing' : null)
                    || (n.type.startsWith('team') ? '/dashboard/team' : null)
                    || (n.type.startsWith('support') ? '/support' : null);

                  const rowBase = `group relative flex items-start gap-3 px-4 py-3 border-b border-[var(--border-default)] transition-colors ${isUnread ? 'bg-purple-500/[0.04]' : ''} ${href ? 'cursor-pointer hover:bg-[var(--bg-card)]/50' : ''}`;

                  const handleNotificationClick = () => {
                    if (!href) return;
                    // Close popover first, then navigate after DOM settles
                    // — mousedown-based outside-click can race with click,
                    //   so we delay navigation to avoid the unmount cancelling it
                    setOpen(false);
                    setTimeout(() => router.push(href), 50);
                  };

                  return (
                    <div
                      key={n.id}
                      className={rowBase}
                      onClick={handleNotificationClick}
                      role={href ? 'link' : undefined}
                      tabIndex={href ? 0 : undefined}
                      onKeyDown={href ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(); } } : undefined}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        <Icon size={14} className={iconText} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${isUnread ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                          {n.message}{href ? ' \u2192' : ''}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {timeAgo(n.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissOne(n.id); }}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5 p-1 rounded hover:bg-[var(--bg-card)] transition-all focus:opacity-100"
                        aria-label={`Dismiss notification: ${n.message}`}
                      >
                        <X size={12} className="text-[var(--text-muted)]" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
    </div>
  );
}
