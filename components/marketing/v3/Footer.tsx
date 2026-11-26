// components/marketing/v3/Footer.tsx
'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './Footer.module.css';
import { FOOTER_COLUMNS, SOCIAL_LINKS } from './links';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

export function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <span className={styles.brand}>
            <BrandGlyph /> HATCHER
          </span>
          <span className={styles.tag}>{t('tag')}</span>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.headKey} className={styles.col}>
            <h4 className={styles.head}>{t(col.headKey)}</h4>
            <ul className={styles.list}>
              {col.items.map((it) => (
                <li key={it.labelKey}>
                  <Link href={it.href} className={styles.link}>{t(it.labelKey)}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={styles.partners}>
        <span className={styles.partnersHead}>{t('poweredBy')}</span>
        <a
          href="https://skale.space"
          aria-label="SKALE Network"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.partner}
        >
          <SkaleLogo /> <span>SKALE</span>
        </a>
        <a
          href="https://solana.com"
          aria-label="Solana"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.partner}
        >
          <SolanaLogo /> <span>Solana</span>
        </a>
      </div>

      <div className={styles.bottom}>
        <div className={styles.bottomLeft}>
          © HHX Technology SRL · v{APP_VERSION}
        </div>
        <div className={styles.socials}>
          <a href={SOCIAL_LINKS.x} aria-label="X / Twitter" target="_blank" rel="noopener noreferrer">
            <XIcon />
          </a>
          <a href={SOCIAL_LINKS.telegram} aria-label="Telegram" target="_blank" rel="noopener noreferrer">
            <TelegramIcon />
          </a>
          <a href={SOCIAL_LINKS.github} aria-label="GitHub" target="_blank" rel="noopener noreferrer">
            <GitHubIcon />
          </a>
        </div>
      </div>
    </footer>
  );
}

function SkaleLogo() {
  // Octagonal mark + "SKALE" wordmark, mono-style. Uses currentColor so it
  // inherits the partner pill's text color (and shifts to accent on hover).
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8" />
      <polygon points="8,7 16,7 17,12 16,17 8,17 7,12" fill="currentColor" stroke="none" opacity="0.85" />
    </svg>
  );
}

function SolanaLogo() {
  // Three-bar Solana wordmark glyph, simplified for mono treatment.
  return (
    <svg width="22" height="18" viewBox="0 0 24 18" fill="currentColor" aria-hidden>
      <path d="M4 3 L20 3 L17 0 L1 0 Z" />
      <path d="M1 10 L17 10 L20 7 L4 7 Z" />
      <path d="M4 17 L20 17 L17 14 L1 14 Z" />
    </svg>
  );
}

function BrandGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 26 26" aria-hidden>
      <rect width="26" height="26" rx="7" fill="var(--ink)" />
      <path d="M13 4.5c-4 0-7.2 3.9-7.2 8.7 0 5 3.1 8.9 7.2 8.9s7.2-3.9 7.2-8.9c0-4.8-3.2-8.7-7.2-8.7Z" fill="#fff7e8" stroke="var(--tech-accent)" strokeWidth="1.1" />
      <path d="M8.6 13.6c1.4-2.3 2.9-3.3 4.4-3.3s3 1 4.4 3.3c-1.4 2.3-2.9 3.3-4.4 3.3s-3-1-4.4-3.3Z" fill="var(--ink)" />
      <circle cx="13" cy="13.6" r="1.7" fill="var(--tech-accent)" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.78 15.66 9.4 20.9c.54 0 .78-.23 1.06-.5l2.54-2.43 5.27 3.86c.97.53 1.65.25 1.91-.9l3.47-16.25c.31-1.43-.52-1.99-1.46-1.64L1.83 10.88c-1.39.54-1.37 1.31-.24 1.66l5.21 1.62L18.9 6.59c.57-.38 1.09-.17.66.21z" />
    </svg>
  );
}


function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
