'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Bot, LogOut } from 'lucide-react';
import type { Agent } from '@/lib/api';
import { useWindowManager } from './WindowManager';

function Clock() {
  const locale = useLocale();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]" suppressHydrationWarning>
      {now ? now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : ''}
    </span>
  );
}

export function Taskbar({ agent }: { agent: Agent }) {
  const t = useTranslations('desktop.taskbar');
  const { windows, apps, focusWindow, minimizeWindow, restoreWindow } = useWindowManager();

  const topVisibleZ = windows.reduce((max, w) => (!w.minimized && w.z > max ? w.z : max), 0);

  const handleWindowButton = (id: string) => {
    const win = windows.find((w) => w.id === id);
    if (!win) return;
    if (win.minimized) {
      restoreWindow(id);
    } else if (win.z === topVisibleZ) {
      minimizeWindow(id);
    } else {
      focusWindow(id);
    }
  };

  return (
    <div className="flex h-12 flex-shrink-0 items-center gap-3 border-t border-[var(--border-default)] bg-[var(--bg-card)] px-3">
      {/* Agent identity */}
      <div className="flex min-w-0 flex-shrink-0 items-center gap-2">
        {agent.avatarUrl ? (
          <Image
            src={agent.avatarUrl}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="h-7 w-7 flex-shrink-0 rounded-lg border border-[var(--border-default)] object-cover"
          />
        ) : (
          <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]" aria-hidden>
            <Bot size={15} />
          </span>
        )}
        <span className="max-w-40 truncate text-xs font-semibold text-[var(--text-primary)]">{agent.name}</span>
      </div>

      <div className="h-6 w-px flex-shrink-0 bg-[var(--border-default)]" aria-hidden />

      {/* Open windows */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {windows.map((win) => {
          const isTop = !win.minimized && win.z === topVisibleZ;
          return (
            <button
              key={win.id}
              type="button"
              onClick={() => handleWindowButton(win.id)}
              className={`inline-flex h-8 max-w-48 flex-shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ${
                isTop
                  ? 'border-[var(--border-hover)] bg-[var(--tech-accent-soft)] text-[var(--text-primary)]'
                  : win.minimized
                    ? 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title={win.title}
            >
              <span className="flex-shrink-0 text-[var(--accent)]" aria-hidden>{apps[win.app]?.icon}</span>
              <span className="min-w-0 truncate font-medium">{win.title}</span>
            </button>
          );
        })}
      </div>

      {/* Clock + exit */}
      <div className="flex flex-shrink-0 items-center gap-3">
        <Clock />
        <Link
          href={`/dashboard/agent/${agent.id}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
        >
          <LogOut size={12} aria-hidden />
          {t('exit')}
        </Link>
      </div>
    </div>
  );
}
