// components/marketing/v3/Nav.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import styles from './Nav.module.css';
import { NAV_GROUPS, PRIMARY_CTA, SECONDARY_CTA } from './links';
import { NavDrawer } from './NavDrawer';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { useAuth } from '@/lib/auth-context';

export function Nav() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const router = useRouter();
  const tNav = useTranslations('nav');
  const tGroups = useTranslations('nav.groups');
  const tMenu = useTranslations('nav.userMenu');

  const USER_MENU = useMemo(() => ([
    { key: 'agents',   label: tNav('myAgents'),  sub: tMenu('sub_myAgents'), href: '/dashboard/agents',   glyph: '◐' },
    { key: 'create',   label: tNav('create'),    sub: tMenu('sub_create'),   href: '/create',             glyph: '⊞' },
    { key: 'billing',  label: tNav('billing'),   sub: tMenu('sub_billing'),  href: '/dashboard/billing',  glyph: '◇' },
    { key: 'settings', label: tNav('settings'),  sub: tMenu('sub_settings'), href: '/dashboard/settings', glyph: '◆' },
    { key: 'support',  label: tNav('support'),   sub: tMenu('sub_support'),  href: '/support',            glyph: '✎' },
  ] as const), [tNav, tMenu]);

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

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  function handleLogout() {
    setUserMenuOpen(false);
    logout();
    router.push('/');
  }

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
                  {tGroups(g.labelKey)}
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
                          <span className={styles.itemLabel}>{tGroups(it.labelKey)}</span>
                          <span className={styles.itemSub}>{tGroups(it.subKey)}</span>
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
            <span className={styles.localeSlot}>
              <LocaleSwitcher />
            </span>
            {authLoading ? (
              <span className={styles.userPillSkeleton} aria-hidden />
            ) : isAuthenticated && user ? (
              <div className={styles.userAnchor} ref={userMenuRef}>
                <button
                  className={styles.userPill}
                  type="button"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label={`${user.username} — ${tNav('settings')}`}
                  onClick={() => setUserMenuOpen((v) => !v)}
                >
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt=""
                      width={20}
                      height={20}
                      className={styles.userAvatar}
                      unoptimized
                    />
                  ) : (
                    <span className={styles.userDot} aria-hidden />
                  )}
                  <span className={styles.userName}>{user.username}</span>
                  <svg className={styles.caret} viewBox="0 0 8 8" aria-hidden>
                    <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className={`${styles.dropdown} ${styles.userDropdown}`} role="menu">
                    <div className={styles.userMeta}>
                      <div className={styles.userMetaTop}>
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt=""
                            width={36}
                            height={36}
                            className={styles.userMetaAvatar}
                            unoptimized
                          />
                        ) : (
                          <span className={styles.userMetaInitial} aria-hidden>
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className={styles.userMetaText}>
                          <span className={styles.userMetaName}>{user.username}</span>
                          <span className={styles.userMetaEmail}>{user.email}</span>
                        </div>
                      </div>
                      <span className={styles.userMetaTier}>{user.tier} {tMenu('tierSuffix')}</span>
                    </div>
                    {USER_MENU.map((it) => (
                      <Link
                        key={it.key}
                        href={it.href}
                        className={styles.item}
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className={styles.glyph} aria-hidden>{it.glyph}</span>
                        <span className={styles.itemBody}>
                          <span className={styles.itemLabel}>{it.label}</span>
                          <span className={styles.itemSub}>{it.sub}</span>
                        </span>
                      </Link>
                    ))}
                    {user.isAdmin && (
                      <Link
                        href="/admin"
                        className={styles.item}
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className={styles.glyph} aria-hidden>★</span>
                        <span className={styles.itemBody}>
                          <span className={styles.itemLabel}>{tNav('admin')}</span>
                          <span className={styles.itemSub}>{tMenu('sub_admin')}</span>
                        </span>
                      </Link>
                    )}
                    <button
                      type="button"
                      className={`${styles.item} ${styles.signOut}`}
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <span className={styles.glyph} aria-hidden>⎋</span>
                      <span className={styles.itemBody}>
                        <span className={styles.itemLabel}>{tNav('logout')}</span>
                        <span className={styles.itemSub}>{tMenu('sub_signOut')}</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href={SECONDARY_CTA.href} className={styles.signIn}>
                {tNav(SECONDARY_CTA.labelKey)}
              </Link>
            )}
            <Link href={PRIMARY_CTA.href} className={styles.cta}>
              <span className={styles.cursor} aria-hidden>▎</span>
              {tNav(PRIMARY_CTA.labelKey)}
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
