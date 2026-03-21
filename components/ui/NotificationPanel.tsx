'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, Bot, CreditCard, Sparkles, Inbox, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const COLORS = {
  accent: '#f97316',
  textPrimary: '#FFFFFF',
  textSecondary: '#A5A1C2',
  textMuted: '#71717a',
  cardBg: '#0D0B1A',
  cardBorder: 'rgba(46,43,74,0.4)',
  green: '#4ADE80',
  amber: '#FBBF24',
  blue: '#60A5FA',
  red: '#F87171',
} as const;

const STORAGE_KEY = 'hatcher:dismissed_notifications';

const TYPE_ICON_MAP: Record<string, { icon: typeof Bot; color: string }> = {
  agent: { icon: Bot, color: COLORS.green },
  payment: { icon: CreditCard, color: COLORS.amber },
  feature: { icon: Sparkles, color: COLORS.blue },
};

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function getDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

interface Notification {
  id: string;
  icon: typeof Bot;
  iconColor: string;
  message: string;
  time: string;
  timestamp: string;
}

export function NotificationPanel() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    setDismissed(getDismissed());
  }, []);

  // Fetch notifications from API
  useEffect(() => {
    if (!isAuthenticated || fetched) return;
    setLoading(true);
    api.getNotifications().then((res) => {
      if (res.success) {
        setAllNotifications(
          res.data.map((n) => {
            const mapping = TYPE_ICON_MAP[n.type] ?? { icon: Bot, color: COLORS.blue };
            return {
              id: n.id,
              icon: mapping.icon,
              iconColor: mapping.color,
              message: n.message,
              time: relativeTime(n.timestamp),
              timestamp: n.timestamp,
            };
          })
        );
      }
      setFetched(true);
      setLoading(false);
    }).catch(() => {
      setFetched(true);
      setLoading(false);
    });
  }, [isAuthenticated, fetched]);

  // Visible = not dismissed
  const visible = allNotifications.filter((n) => !dismissed.has(n.id));

  const dismissOne = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const n of allNotifications) next.add(n.id);
      saveDismissed(next);
      return next;
    });
  }, [allNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:opacity-80 relative"
        style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}` }}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={18} style={{ color: COLORS.textSecondary }} />
        {visible.length > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
            style={{ background: COLORS.red }}
          >
            {visible.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-12 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.cardBorder}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}
          >
            <h3 className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
              Notifications
            </h3>
            {visible.length > 0 && (
              <button
                onClick={dismissAll}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: COLORS.accent }}
              >
                <Check size={13} />
                Dismiss all
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={24} style={{ color: COLORS.accent }} className="animate-spin mb-3" />
                <p className="text-sm" style={{ color: COLORS.textMuted }}>Loading...</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Inbox size={32} style={{ color: COLORS.textMuted }} className="mb-3 opacity-40" />
                <p className="text-sm" style={{ color: COLORS.textMuted }}>No notifications</p>
              </div>
            ) : (
              visible.map((notif) => {
                const Icon = notif.icon;
                return (
                  <div
                    key={notif.id}
                    className="w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] group"
                    style={{ background: 'rgba(249,115,22,0.04)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: notif.iconColor + '20' }}
                    >
                      <Icon size={16} style={{ color: notif.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug" style={{ color: COLORS.textPrimary }}>
                        {notif.message}
                      </p>
                      <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                        {notif.time}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissOne(notif.id)}
                      className="p-1 rounded-md text-[#71717a] hover:text-white hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
                      title="Dismiss"
                    >
                      <X size={14} />
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
