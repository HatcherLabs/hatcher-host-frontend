'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Bot, CreditCard, Sparkles, Inbox, Loader2 } from 'lucide-react';
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

interface Notification {
  id: string;
  icon: typeof Bot;
  iconColor: string;
  message: string;
  time: string;
  read: boolean;
}

export function NotificationPanel() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch real notifications from API
  useEffect(() => {
    if (!isAuthenticated || fetched) return;
    setLoading(true);
    api.getNotifications().then((res) => {
      if (res.success) {
        setNotifications(
          res.data.map((n) => {
            const mapping = TYPE_ICON_MAP[n.type] ?? { icon: Bot, color: COLORS.blue };
            return {
              id: n.id,
              icon: mapping.icon,
              iconColor: mapping.color,
              message: n.message,
              time: relativeTime(n.timestamp),
              read: false,
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

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function toggleNotification(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:opacity-80 relative"
        style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}` }}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={18} style={{ color: COLORS.textSecondary }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
            style={{ background: COLORS.red }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-12 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.cardBorder}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}
          >
            <h3 className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: COLORS.accent }}
              >
                <Check size={13} />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={24} style={{ color: COLORS.accent }} className="animate-spin mb-3" />
                <p className="text-sm" style={{ color: COLORS.textMuted }}>
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Inbox size={32} style={{ color: COLORS.textMuted }} className="mb-3 opacity-40" />
                <p className="text-sm" style={{ color: COLORS.textMuted }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = notif.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => toggleNotification(notif.id)}
                    className="w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
                    style={{
                      background: notif.read ? 'transparent' : 'rgba(249,115,22,0.04)',
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: notif.iconColor + '20' }}
                    >
                      <Icon size={16} style={{ color: notif.iconColor }} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm leading-snug"
                        style={{ color: notif.read ? COLORS.textSecondary : COLORS.textPrimary }}
                      >
                        {notif.message}
                      </p>
                      <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                        {notif.time}
                      </p>
                    </div>
                    {/* Unread dot */}
                    {!notif.read && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                        style={{ background: COLORS.accent }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
