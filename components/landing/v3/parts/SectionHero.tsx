// components/landing/v3/parts/SectionHero.tsx
'use client';
import { useTranslations } from 'next-intl';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionHero.module.css';

const SIGNALS = [
  { label: 'Hosted LLM', value: 'OpenRouter', tone: 'green' },
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
