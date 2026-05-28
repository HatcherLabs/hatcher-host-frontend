// components/landing/v3/parts/SectionHero.tsx
'use client';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Play, Smartphone } from 'lucide-react';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionHero.module.css';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=host.hatcher.app';
const SOLANA_MOBILE_URL = 'https://solanamobile.com/';

const SIGNALS = [
  { label: 'Hosted LLM', value: 'UsePod/OpenRouter + IDLE + MiMo', tone: 'green' },
  { label: 'Default model', value: 'DeepSeek V4 Flash', tone: 'cyan' },
  { label: 'Focus frameworks', value: 'OpenClaw + Hermes', tone: 'amber' },
] as const;

export function SectionHero() {
  const t = useTranslations('landingV3.hero');
  return (
    <section className={`${styles.hero} v3-scanline`}>
      <div className={styles.media} aria-hidden />
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
            <PhosphorButton href="/create">{t('ctaPrimary')}</PhosphorButton>
            <PhosphorButton href="/city" variant="ghost">{t('ctaGhost')}</PhosphorButton>
          </div>
          <Link href="/register" className={styles.signupHint}>
            {t('ctaSignup')}
          </Link>
          <div className={styles.storeBadges} aria-label="Hatcher mobile availability">
            <a
              className={styles.storeBadge}
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-event="landing_google_play_click"
            >
              <Play className={styles.storeIcon} aria-hidden />
              <span className={styles.storeCopy}>
                <span className={styles.storeKicker}>{t('ctaPlayStoreKicker')}</span>
                <span className={styles.storeName}>{t('ctaPlayStore')}</span>
              </span>
            </a>
            <a
              className={styles.storeBadge}
              href={SOLANA_MOBILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-event="landing_solana_mobile_click"
            >
              <Smartphone className={styles.storeIcon} aria-hidden />
              <span className={styles.storeCopy}>
                <span className={styles.storeKicker}>{t('ctaSolanaMobileKicker')}</span>
                <span className={styles.storeName}>{t('ctaSolanaMobile')}</span>
              </span>
            </a>
          </div>
          <Link href="/features" className={styles.featuresLink}>
            {t('ctaFeatures')}
          </Link>
          <div className={styles.signals} aria-label="Hatcher platform highlights">
            {SIGNALS.map((signal) => (
              <div key={signal.label} className={`${styles.signal} ${styles[signal.tone]}`}>
                <span className={styles.signalLabel}>{signal.label}</span>
                <span className={styles.signalValue}>{signal.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
