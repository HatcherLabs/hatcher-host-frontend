// components/marketing/v3/NavDrawer.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './NavDrawer.module.css';
import { NAV_GROUPS, PRIMARY_CTA, SECONDARY_CTA } from './links';
import { useAuth } from '@/lib/auth-context';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NavDrawer({ open, onClose }: Props) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Site menu">
      <div className={styles.scroll}>
        {NAV_GROUPS.map((g) => (
          <section key={g.key} className={styles.section}>
            <h3 className={styles.head}>{g.label}</h3>
            <ul className={styles.list}>
              {g.items.map((it) => (
                <li key={it.key}>
                  <Link href={it.href} className={styles.item} onClick={onClose}>
                    <span className={styles.glyph} aria-hidden>{it.glyph}</span>
                    <span>
                      <span className={styles.itemLabel}>{it.label}</span>
                      <span className={styles.itemSub}>{it.sub}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className={styles.bottom}>
          {authLoading ? null : isAuthenticated ? (
            <Link href="/dashboard" className={styles.signIn} onClick={onClose}>
              Dashboard
            </Link>
          ) : (
            <Link href={SECONDARY_CTA.href} className={styles.signIn} onClick={onClose}>
              {SECONDARY_CTA.label}
            </Link>
          )}
          <Link href={PRIMARY_CTA.href} className={styles.cta} onClick={onClose}>
            <span aria-hidden>▎</span> {PRIMARY_CTA.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
