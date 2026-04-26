// components/auth/v3/AuthShell.tsx
import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './AuthShell.module.css';

interface Props {
  /** Card title (e.g. "Sign in", "Reset password"). */
  title: string;
  /** Optional sub-line under the title. */
  subtitle?: string;
  children: ReactNode;
  /** Footer text under the card — e.g. "No account? Register". */
  foot?: ReactNode;
}

/**
 * Slim auth chrome: brand bar at top, centered card on dark background.
 * No editorial side panel (was slop in v2). Token-driven so palette swap
 * lands automatically.
 */
export function AuthShell({ title, subtitle, children, foot }: Props) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <BrandGlyph /> HATCHER
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.head}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {children}
          {foot && <div className={styles.foot}>{foot}</div>}
        </div>
      </main>
    </div>
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
