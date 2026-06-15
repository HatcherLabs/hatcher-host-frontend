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
      <rect width="26" height="26" rx="7" fill="var(--ink)" />
      <path d="M13 4.5c-4 0-7.2 3.9-7.2 8.7 0 5 3.1 8.9 7.2 8.9s7.2-3.9 7.2-8.9c0-4.8-3.2-8.7-7.2-8.7Z" fill="#fff7e8" stroke="var(--tech-accent)" strokeWidth="1.1" />
      <path d="M8.6 13.6c1.4-2.3 2.9-3.3 4.4-3.3s3 1 4.4 3.3c-1.4 2.3-2.9 3.3-4.4 3.3s-3-1-4.4-3.3Z" fill="var(--ink)" />
      <circle cx="13" cy="13.6" r="1.7" fill="var(--tech-accent)" />
    </svg>
  );
}
