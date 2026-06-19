// components/landing/v3/parts/SectionHero.tsx
'use client';
import { Link } from '@/i18n/routing';
import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  SOLANA_MOBILE_URL,
} from '@/lib/mobile-app-links';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionHero.module.css';

export function SectionHero() {
  const t = useTranslations('landingV3.hero');
  return (
    <section className={styles.hero}>
      <div className={styles.heroArt} aria-hidden>
        <Image
          className={styles.heroImage}
          src="/landing-v3/hero-agent-room-hatchling.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          unoptimized
        />
      </div>
      <div className={styles.scrim} aria-hidden />
      <div className={styles.bottomFade} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 className={styles.headline}>
            {t('headline1')}<br />
            <span className={styles.accent}>{t('headline2')}</span>
          </h1>
          <p className={styles.sub}>{t('sub')}</p>
          <div className={styles.ctaRow}>
            <PhosphorButton href="/create" surface="dark">{t('ctaPrimary')}</PhosphorButton>
            <PhosphorButton href="/explore" variant="ghost" surface="dark">{t('ctaGhost')}</PhosphorButton>
          </div>
          <Link href="/register" className={styles.signupHint}>
            {t('ctaSignup')}
          </Link>
          <div className={styles.appLinks} aria-label="Mobile app links">
            <a
              className={styles.appLink}
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{t('ctaAppStoreKicker')}</span>
              <strong>{t('ctaAppStore')}</strong>
            </a>
            <a
              className={styles.appLink}
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{t('ctaPlayStoreKicker')}</span>
              <strong>{t('ctaPlayStore')}</strong>
            </a>
            <a
              className={styles.appLink}
              href={SOLANA_MOBILE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{t('ctaSolanaMobileKicker')}</span>
              <strong>{t('ctaSolanaMobile')}</strong>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
