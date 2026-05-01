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
          <a href={SOCIAL_LINKS.discord} aria-label="Discord" target="_blank" rel="noopener noreferrer">
            <DiscordIcon />
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
      <rect x="2" y="2" width="22" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="7" width="12" height="12" rx="2" fill="var(--accent)" />
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

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.077.077 0 0 0-.082.038c-.353.63-.74 1.45-1.012 2.094a18.3 18.3 0 0 0-5.487 0 12.5 12.5 0 0 0-1.029-2.094.08.08 0 0 0-.082-.038A19.74 19.74 0 0 0 5.103 4.37a.07.07 0 0 0-.032.027C1.578 9.045.567 13.58 1.062 18.057a.082.082 0 0 0 .031.057 19.91 19.91 0 0 0 5.992 3.03.078.078 0 0 0 .084-.028 14.2 14.2 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.873-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.075.075 0 0 1 .078-.011c3.927 1.793 8.18 1.793 12.061 0a.075.075 0 0 1 .079.01c.12.099.245.198.372.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.874.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
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
