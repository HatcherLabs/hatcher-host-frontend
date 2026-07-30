'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Bot, LogOut } from 'lucide-react';
import type { Agent } from '@/lib/api';
import { useWindowManager } from './WindowManager';
import styles from './win95.module.css';

function Clock() {
  const locale = useLocale();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className={styles.clock} suppressHydrationWarning>
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
    <div className={`flex flex-shrink-0 items-center gap-1.5 ${styles.taskbar}`}>
      {/* Agent identity */}
      <div className={`min-w-0 flex-shrink-0 ${styles.chip}`}>
        {agent.avatarUrl ? (
          <Image
            src={agent.avatarUrl}
            alt=""
            width={20}
            height={20}
            unoptimized
            className={styles.chipAvatar}
          />
        ) : (
          <span className={styles.chipAvatarFallback} aria-hidden>
            <Bot size={15} />
          </span>
        )}
        <span className="max-w-40 truncate">{agent.name}</span>
      </div>

      <div className={styles.divider} aria-hidden />

      {/* Open windows */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {windows.map((win) => {
          const isTop = !win.minimized && win.z === topVisibleZ;
          return (
            <button
              key={win.id}
              type="button"
              onClick={() => handleWindowButton(win.id)}
              className={`flex-shrink-0 ${styles.taskBtn} ${isTop ? styles.taskBtnActive : ''}`}
              title={win.title}
            >
              <span className="flex-shrink-0" aria-hidden>{apps[win.app]?.icon}</span>
              <span className="min-w-0 truncate">{win.title}</span>
            </button>
          );
        })}
      </div>

      {/* Clock + exit */}
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <Clock />
        <Link href={`/dashboard/agent/${agent.id}`} className={styles.btn}>
          <LogOut size={12} aria-hidden />
          {t('exit')}
        </Link>
      </div>
    </div>
  );
}
