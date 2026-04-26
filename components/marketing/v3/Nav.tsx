// components/marketing/v3/Nav.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './Nav.module.css';
import { NAV_GROUPS, PRIMARY_CTA, SECONDARY_CTA } from './links';
import { NavDrawer } from './NavDrawer';

export function Nav() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!openGroup) return;
    const onDoc = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroup(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [openGroup]);

  return (
    <>
      <nav className={styles.nav} ref={navRef}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand}>
            <BrandGlyph />
            HATCHER
          </Link>

          <div className={styles.groups}>
            {NAV_GROUPS.map((g) => (
              <div key={g.key} className={styles.groupAnchor}>
                <button
                  className={styles.groupBtn}
                  type="button"
                  aria-expanded={openGroup === g.key}
                  aria-haspopup="true"
                  onClick={() => setOpenGroup(openGroup === g.key ? null : g.key)}
                >
                  {g.label}
                  <svg className={styles.caret} viewBox="0 0 8 8" aria-hidden>
                    <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openGroup === g.key && (
                  <div className={styles.dropdown} role="menu">
                    {g.items.map((it) => (
                      <Link
                        key={it.key}
                        href={it.href}
                        className={styles.item}
                        role="menuitem"
                        onClick={() => setOpenGroup(null)}
                      >
                        <span className={styles.glyph} aria-hidden>{it.glyph}</span>
                        <span className={styles.itemBody}>
                          <span className={styles.itemLabel}>{it.label}</span>
                          <span className={styles.itemSub}>{it.sub}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.spacer} />

          <div className={styles.actions}>
            <Link href={SECONDARY_CTA.href} className={styles.signIn}>
              {SECONDARY_CTA.label}
            </Link>
            <Link href={PRIMARY_CTA.href} className={styles.cta}>
              <span className={styles.cursor} aria-hidden>▎</span>
              {PRIMARY_CTA.label}
            </Link>
            <button
              className={`${styles.hamburger} ${drawerOpen ? styles.open : ''}`}
              type="button"
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
            >
              <span />
            </button>
          </div>
        </div>
      </nav>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

function BrandGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden>
      <rect x="2" y="2" width="22" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="7" width="12" height="12" rx="2" fill="var(--accent)" />
    </svg>
  );
}
