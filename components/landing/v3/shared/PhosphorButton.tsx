// components/landing/v3/shared/PhosphorButton.tsx
'use client';

import Link from 'next/link';
import posthog from 'posthog-js';
import styles from './PhosphorButton.module.css';

interface Props {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
  /** PostHog event name. Defaults to a slug derived from `href`. */
  event?: string;
  /** Optional hook for analytics fired by the consumer. */
  onClickExtra?: () => void;
}

/**
 * Primary CTA. The `▎` cursor block on the left is the terminal signature
 * glyph. Ghost variant skips the bg fill but keeps the cursor.
 */
export function PhosphorButton({
  href,
  children,
  variant = 'primary',
  target,
  rel,
  event,
  onClickExtra,
}: Props) {
  const handleClick = () => {
    const evt = event ?? `landing_cta${href.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}`;
    try { posthog.capture(evt, { variant, href }); } catch {}
    onClickExtra?.();
  };
  return (
    <Link
      href={href}
      className={`${styles.btn} ${styles[variant]}`}
      target={target}
      rel={rel}
      onClick={handleClick}
    >
      <span className={styles.cursor} aria-hidden>▎</span>
      <span className={styles.label}>{children}</span>
    </Link>
  );
}
