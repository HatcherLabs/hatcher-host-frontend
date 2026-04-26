// components/marketing/v3/Footer.tsx
import Link from 'next/link';
import styles from './Footer.module.css';
import { FOOTER_COLUMNS, SOCIAL_LINKS } from './links';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <span className={styles.brand}>
            <BrandGlyph /> HATCHER
          </span>
          <span className={styles.tag}>Managed AI agent hosting · Romania</span>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.head} className={styles.col}>
            <h4 className={styles.head}>{col.head}</h4>
            <ul className={styles.list}>
              {col.items.map((it) => (
                <li key={it.label}>
                  <Link href={it.href} className={styles.link}>{it.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={styles.bottom}>
        <div className={styles.bottomLeft}>
          © HHX Technology SRL · v{APP_VERSION}
        </div>
        <div className={styles.socials}>
          <a href={SOCIAL_LINKS.x} aria-label="X / Twitter" target="_blank" rel="noopener noreferrer">𝕏</a>
          <a href={SOCIAL_LINKS.discord} aria-label="Discord" target="_blank" rel="noopener noreferrer">◉</a>
          <a href={SOCIAL_LINKS.github} aria-label="GitHub" target="_blank" rel="noopener noreferrer">▣</a>
        </div>
      </div>
    </footer>
  );
}

function BrandGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 26 26" aria-hidden>
      <rect x="2" y="2" width="22" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="7" width="12" height="12" rx="2" fill="var(--accent)" />
    </svg>
  );
}
