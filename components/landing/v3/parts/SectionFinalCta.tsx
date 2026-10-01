// components/landing/v3/parts/SectionFinalCta.tsx
'use client';
import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionFinalCta.module.css';

export function SectionFinalCta() {
  const t = useTranslations('landingV3.finalCta');
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <BoxLabel>{t('boxLabel')}</BoxLabel>
        <h2 className={styles.headline}>{t('headline')}</h2>
        <div className={styles.ctaRow}>
          <PhosphorButton href="/create">{t('ctaPrimary')}</PhosphorButton>
          <PhosphorButton href="/explore" variant="ghost">{t('ctaGhost')}</PhosphorButton>
        </div>
        <div className={styles.meta}>
          {t('metaNoCard')}
        </div>
      </div>
    </section>
  );
}
