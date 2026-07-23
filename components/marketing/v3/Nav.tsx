// components/marketing/v3/Nav.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Clock,
  CreditCard,
  FileText,
  GitBranch,
  HelpCircle,
  Handshake,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Newspaper,
  PackageCheck,
  Plus,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import styles from './Nav.module.css';
import { NAV_GROUPS, PRIMARY_CTA, PRIMARY_NAV_LINKS, SECONDARY_CTA } from './links';
import { NavDrawer } from './NavDrawer';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { AiCreditStatus } from '@/components/layout/AiCreditStatus';
import { HatcherMarketStatus } from '@/components/layout/HatcherMarketStatus';
import { VersionBadge } from '@/components/layout/VersionBadge';
import { NotificationCenter } from '@/components/ui/NotificationCenter';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatFeatureKey } from '@/lib/feature-labels';
import { useToast } from '@/components/ui/ToastProvider';

type AffiliateMenuState = 'affiliate' | 'pending' | 'rejected' | 'none';

export function Nav() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [affiliateState, setAffiliateState] = useState<AffiliateMenuState | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const tNav = useTranslations('nav');
  const tGroups = useTranslations('nav.groups');
  const tMenu = useTranslations('nav.userMenu');
  const tMission = useTranslations('missionControl');
  const tOutcome = useTranslations('outcomePacks');

  const WORKSPACE_MENU = useMemo(() => ([
    { key: 'dashboard', label: tNav('dashboard'), sub: tMenu('sub_dashboard'), href: '/dashboard', Icon: LayoutDashboard },
    { key: 'missions', label: tMission('title'), sub: tMenu('sub_missionControl'), href: '/dashboard/missions', Icon: ListChecks },
    { key: 'outcomePacks', label: tOutcome('title'), sub: tMenu('sub_outcomePacks'), href: '/dashboard/outcome-packs', Icon: PackageCheck },
    { key: 'approvals', label: 'Action approvals', sub: 'Review effectful agent actions', href: '/dashboard/approvals', Icon: ShieldCheck },
  ] satisfies ReadonlyArray<{ key: string; label: string; sub: string; href: string; Icon: LucideIcon }>), [tMenu, tMission, tNav, tOutcome]);

  const USER_MENU = useMemo(() => ([
    ...WORKSPACE_MENU,
    { key: 'analytics', label: tNav('analytics'), sub: tMenu('sub_analytics'), href: '/dashboard/analytics', Icon: BarChart3 },
    { key: 'create', label: tNav('create'), sub: tMenu('sub_create'), href: '/create', Icon: Plus },
    { key: 'billing', label: tNav('billing'), sub: tMenu('sub_billing'), href: '/dashboard/billing', Icon: CreditCard },
    { key: 'settings', label: tNav('settings'), sub: tMenu('sub_settings'), href: '/dashboard/settings', Icon: Settings },
    { key: 'support', label: tNav('support'), sub: tMenu('sub_support'), href: '/support', Icon: HelpCircle },
  ] satisfies ReadonlyArray<{ key: string; label: string; sub: string; href: string; Icon: LucideIcon }>), [WORKSPACE_MENU, tNav, tMenu]);

  const affiliateItem = useMemo(() => {
    switch (affiliateState) {
      case 'affiliate': return { href: '/dashboard/affiliate', label: tNav('affiliateDashboard') };
      case 'pending':   return { href: '/affiliate/apply',     label: tNav('affiliatePending') };
      case 'rejected':  return { href: '/affiliate/apply',     label: tNav('affiliateRejected') };
      default:          return { href: '/affiliate',           label: tNav('affiliateBecome') };
    }
  }, [affiliateState, tNav]);

  useEffect(() => {
    setAffiliateState(null);
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !userMenuOpen || affiliateState !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await api.getAffiliateMe();
        if (cancelled) return;
        if (me.success) { setAffiliateState('affiliate'); return; }
        const app = await api.getMyAffiliateApplication();
        if (cancelled) return;
        if (app.success && app.data.application) {
          const status = app.data.application.status;
          if (status === 'PENDING') setAffiliateState('pending');
          else if (status === 'REJECTED') setAffiliateState('rejected');
          else if (status === 'APPROVED') setAffiliateState('affiliate');
          else setAffiliateState('none');
        } else {
          setAffiliateState('none');
        }
      } catch {
        if (!cancelled) setAffiliateState('none');
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, userMenuOpen, affiliateState]);

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

  async function handleLogout() {
    setUserMenuOpen(false);
    try {
      await logout();
    } catch (error) {
      toast.warning(
        error instanceof Error
          ? error.message
          : 'Signed out locally, but the server session could not be closed.',
      );
    }
    router.push('/');
  }

  return (
    <>
      <nav className={styles.nav} ref={navRef}>
        <div className={styles.inner}>
          <div className={styles.brandCluster}>
            <Link href="/" className={styles.brand}>
              <BrandGlyph />
              HATCHER
            </Link>
            <VersionBadge />
          </div>

          <div className={styles.groups} aria-label="Primary navigation">
            {NAV_GROUPS.map((group) => (
              <div key={group.key} className={styles.groupAnchor}>
                <button
                  type="button"
                  className={styles.groupBtn}
                  aria-haspopup="menu"
                  aria-expanded={openGroup === group.key}
                  onClick={() => {
                    setUserMenuOpen(false);
                    setOpenGroup((current) => (current === group.key ? null : group.key));
                  }}
                >
                  {tGroups(group.labelKey)}
                  <svg className={styles.caret} viewBox="0 0 8 8" aria-hidden>
                    <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openGroup === group.key && (
                  <div className={styles.dropdown} role="menu" aria-label={tGroups(group.labelKey)}>
                    {group.items.filter((it) => !(
                      isAuthenticated && group.key === 'build' && it.key === 'myAgents'
                    )).map((it) => (
                      <Link
                        key={it.key}
                        href={it.href}
                        className={styles.item}
                        role="menuitem"
                        onClick={() => setOpenGroup(null)}
                      >
                        <span className={styles.glyph} aria-hidden>
                          <NavItemIcon itemKey={it.key} />
                        </span>
                        <span className={styles.itemBody}>
                          <span className={styles.itemLabel}>{tGroups(it.labelKey)}</span>
                          <span className={styles.itemSub}>{tGroups(it.subKey)}</span>
                        </span>
                      </Link>
                    ))}
                    {group.key === 'build' && isAuthenticated ? WORKSPACE_MENU.map((it) => (
                      <Link
                        key={it.key}
                        href={it.href}
                        className={styles.item}
                        role="menuitem"
                        onClick={() => setOpenGroup(null)}
                      >
                        <span className={styles.glyph} aria-hidden>
                          <it.Icon size={15} strokeWidth={1.8} />
                        </span>
                        <span className={styles.itemBody}>
                          <span className={styles.itemLabel}>{it.label}</span>
                          <span className={styles.itemSub}>{it.sub}</span>
                        </span>
                      </Link>
                    )) : null}
                  </div>
                )}
              </div>
            ))}
            {PRIMARY_NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={styles.navLink}
                onClick={() => setOpenGroup(null)}
              >
                {tNav(link.labelKey)}
              </Link>
            ))}
            <Link href="/docs" className={styles.navLink} onClick={() => setOpenGroup(null)}>
              {tNav('docs')}
            </Link>
          </div>

          <div className={styles.spacer} />

          <div className={styles.actions}>
            <span className={styles.marketSlot}>
              <HatcherMarketStatus />
            </span>
            <span className={styles.localeSlot}>
              <LocaleSwitcher />
            </span>
            <span className={styles.themeSlot}>
              <ThemeToggle />
            </span>
            {!authLoading && isAuthenticated && user ? (
              <>
                <span className={styles.notificationSlot}>
                  <NotificationCenter />
                </span>
                <div className={styles.userAnchor} ref={userMenuRef}>
                  <button
                    className={styles.userPill}
                    type="button"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    aria-label={`${user.username} — ${tNav('settings')}`}
                    onClick={() => {
                      setOpenGroup(null);
                      setUserMenuOpen((v) => !v);
                    }}
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
                        <span className={styles.userMetaTier}>{formatFeatureKey(user.tier)} {tMenu('tierSuffix')}</span>
                      </div>
                      <div className={styles.userCredits}>
                        <AiCreditStatus
                          variant="drawer"
                          onNavigate={() => setUserMenuOpen(false)}
                        />
                      </div>
                      {USER_MENU.map((it) => (
                        <Link
                          key={it.key}
                          href={it.href}
                          className={styles.item}
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className={styles.glyph} aria-hidden>
                            <it.Icon size={15} strokeWidth={1.8} />
                          </span>
                          <span className={styles.itemBody}>
                            <span className={styles.itemLabel}>{it.label}</span>
                            <span className={styles.itemSub}>{it.sub}</span>
                          </span>
                        </Link>
                      ))}
                      <Link
                        href={affiliateItem.href}
                        className={styles.item}
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className={styles.glyph} aria-hidden>
                          <Handshake size={15} strokeWidth={1.8} />
                        </span>
                        <span className={styles.itemBody}>
                          <span className={styles.itemLabel}>{affiliateItem.label}</span>
                          <span className={styles.itemSub}>{tMenu('sub_affiliate')}</span>
                        </span>
                      </Link>
                      {user.isAdmin && (
                        <Link
                          href="/admin"
                          className={styles.item}
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className={styles.glyph} aria-hidden>
                            <ShieldCheck size={15} strokeWidth={1.8} />
                          </span>
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
                        <span className={styles.glyph} aria-hidden>
                          <LogOut size={15} strokeWidth={1.8} />
                        </span>
                        <span className={styles.itemBody}>
                          <span className={styles.itemLabel}>{tNav('logout')}</span>
                          <span className={styles.itemSub}>{tMenu('sub_signOut')}</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href={SECONDARY_CTA.href} className={styles.signIn}>
                  {tNav(SECONDARY_CTA.labelKey)}
                </Link>
              </>
            )}
            <Link href={PRIMARY_CTA.href} className={styles.cta}>
              {tNav(PRIMARY_CTA.labelKey)}
              <ArrowRight size={14} aria-hidden />
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
      <rect width="26" height="26" rx="7" fill="var(--ink)" />
      <path d="M13 4.5c-4 0-7.2 3.9-7.2 8.7 0 5 3.1 8.9 7.2 8.9s7.2-3.9 7.2-8.9c0-4.8-3.2-8.7-7.2-8.7Z" fill="var(--bg-card)" stroke="var(--tech-accent)" strokeWidth="1.1" />
      <path d="M8.6 13.6c1.4-2.3 2.9-3.3 4.4-3.3s3 1 4.4 3.3c-1.4 2.3-2.9 3.3-4.4 3.3s-3-1-4.4-3.3Z" fill="var(--ink)" />
      <circle cx="13" cy="13.6" r="1.7" fill="var(--tech-accent)" />
    </svg>
  );
}

function NavItemIcon({ itemKey }: { itemKey: string }) {
  const iconProps = { size: 15, strokeWidth: 1.8, 'aria-hidden': true } as const;

  switch (itemKey) {
    case 'hatchAgent':
      return <Rocket {...iconProps} />;
    case 'myAgents':
      return <LayoutDashboard {...iconProps} />;
    case 'publicAgents':
      return <Search {...iconProps} />;
    case 'features':
      return <Sparkles {...iconProps} />;
    case 'city':
      return <Building2 {...iconProps} />;
    case 'frameworks':
      return <Boxes {...iconProps} />;
    case 'token':
      return <CreditCard {...iconProps} />;
    case 'staking':
      return <Clock {...iconProps} />;
    case 'whitepaper':
      return <FileText {...iconProps} />;
    case 'blog':
      return <Newspaper {...iconProps} />;
    case 'roadmap':
      return <GitBranch {...iconProps} />;
    case 'changelog':
      return <BookOpen {...iconProps} />;
    default:
      return <ArrowRight {...iconProps} />;
  }
}
