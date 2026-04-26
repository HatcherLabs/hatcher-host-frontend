// components/landing/v3/shared/PhosphorButton.tsx
'use client';

import Link from 'next/link';
import styles from './PhosphorButton.module.css';

interface Props {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  /** Optional hook for analytics fired by the consumer. */
  onClickExtra?: () => void;
}

/**
 * Primary CTA. The `▎` cursor block on the left is the terminal signature
 * glyph. Ghost variant skips the bg fill but keeps the cursor.
 */
export function PhosphorButton({ href, children, variant = 'primary', onClickExtra }: Props) {
  return (
    <Link href={href} className={`${styles.btn} ${styles[variant]}`} onClick={onClickExtra}>
      <span className={styles.cursor} aria-hidden>▎</span>
      <span className={styles.label}>{children}</span>
    </Link>
  );
}
