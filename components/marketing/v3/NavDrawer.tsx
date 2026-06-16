// components/marketing/v3/NavDrawer.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  Clock,
  Coins,
  FileText,
  GitBranch,
  LayoutDashboard,
  Newspaper,
  Plus,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import styles from './NavDrawer.module.css';
import { NAV_GROUPS, PRIMARY_CTA, SECONDARY_CTA, SIGN_UP_CTA } from './links';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { AiCreditStatus } from '@/components/layout/AiCreditStatus';
import { HatcherMarketStatus } from '@/components/layout/HatcherMarketStatus';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/lib/auth-context';

interface Props {
  open: boolean;
  onClose: () => void;
}

function DrawerIcon({ itemKey }: { itemKey: string }) {
  const props = { size: 17, strokeWidth: 1.8, 'aria-hidden': true } as const;
  switch (itemKey) {
    case 'hatchAgent':
      return <Plus {...props} />;
    case 'myAgents':
      return <LayoutDashboard {...props} />;
    case 'publicAgents':
      return <Bot {...props} />;
    case 'features':
      return <Sparkles {...props} />;
    case 'city':
      return <Building2 {...props} />;
    case 'frameworks':
      return <Boxes {...props} />;
    case 'pricing':
      return <Coins {...props} />;
    case 'token':
      return <TerminalSquare {...props} />;
    case 'staking':
      return <Clock {...props} />;
    case 'whitepaper':
      return <FileText {...props} />;
    case 'blog':
      return <Newspaper {...props} />;
    case 'roadmap':
      return <GitBranch {...props} />;
    case 'changelog':
      return <BookOpen {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

export function NavDrawer({ open, onClose }: Props) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const tNav = useTranslations('nav');
  const tGroups = useTranslations('nav.groups');
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
        <div className={styles.marketRow}>
          <HatcherMarketStatus variant="drawer" onNavigate={onClose} />
        </div>

        {!authLoading && isAuthenticated && (
          <div className={styles.creditRow}>
            <AiCreditStatus variant="drawer" onNavigate={onClose} />
          </div>
        )}

        {NAV_GROUPS.map((g) => (
          <section key={g.key} className={styles.section}>
            <h3 className={styles.head}>{tGroups(g.labelKey)}</h3>
            <ul className={styles.list}>
              {g.items.map((it) => (
                <li key={it.key}>
                  <Link href={it.href} className={styles.item} onClick={onClose}>
                    <span className={styles.glyph}>
                      <DrawerIcon itemKey={it.key} />
                    </span>
                    <span>
                      <span className={styles.itemLabel}>{tGroups(it.labelKey)}</span>
                      <span className={styles.itemSub}>{tGroups(it.subKey)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className={styles.localeRow}>
          <LocaleSwitcher align="start" side="top" />
          <ThemeToggle />
        </div>

        <div className={styles.bottom}>
          {authLoading ? null : isAuthenticated ? (
            <Link href="/dashboard" className={styles.signIn} onClick={onClose}>
              {tNav('dashboard')}
            </Link>
          ) : (
            <>
              <Link href={SECONDARY_CTA.href} className={styles.signIn} onClick={onClose}>
                {tNav(SECONDARY_CTA.labelKey)}
              </Link>
              <Link href={SIGN_UP_CTA.href} className={styles.cta} onClick={onClose}>
                {tNav(SIGN_UP_CTA.labelKey)}
                <ArrowRight size={15} aria-hidden />
              </Link>
            </>
          )}
          {(authLoading || isAuthenticated) && (
            <Link href={PRIMARY_CTA.href} className={styles.cta} onClick={onClose}>
              {tNav(PRIMARY_CTA.labelKey)}
              <ArrowRight size={15} aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
