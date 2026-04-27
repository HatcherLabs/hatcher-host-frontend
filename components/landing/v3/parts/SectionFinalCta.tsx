// components/landing/v3/parts/SectionFinalCta.tsx
'use client';
import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionFinalCta.module.css';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

export function SectionFinalCta() {
  const t = useTranslations('landingV3.finalCta');
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <BoxLabel>{t('boxLabel')}</BoxLabel>
        <h2 className={styles.headline}>{t('headline')}</h2>
        <div className={styles.ctaRow}>
          <PhosphorButton href="/chat-to-hatch">{t('ctaPrimary')}</PhosphorButton>
          <PhosphorButton href="/create" variant="ghost">{t('ctaGhost')}</PhosphorButton>
        </div>
        <div className={styles.meta}>
          <span className={styles.metaPrompt}>$</span> hatcher --version&nbsp;&nbsp;v{APP_VERSION}
          <span className={styles.metaDot}>·</span> {t('metaFrameworks')}
          <span className={styles.metaDot}>·</span> {t('metaNoCard')}
        </div>
      </div>
    </section>
  );
}
