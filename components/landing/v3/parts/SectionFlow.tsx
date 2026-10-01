'use client';

import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionFlow.module.css';

export function SectionFlow() {
  const t = useTranslations('landingV3.flow');
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>{t('boxLabel')}</BoxLabel>
          <h2 className={styles.title}>{t('title')}</h2>
        </header>
        <ol className={styles.tiles}>
          {([1, 2, 3] as const).map((step) => (
            <li key={step} className={styles.tile}>
              <span className={styles.step} aria-hidden>0{step}</span>
              <h3 className={styles.tileTitle}>{t(`tile${step}Title`)}</h3>
              <p className={styles.tileBody}>{t(`tile${step}Body`)}</p>
            </li>
          ))}
        </ol>
        <div className={styles.ctaRow}>
          <PhosphorButton href="/create">{t('cta')}</PhosphorButton>
          <PhosphorButton href="/features" variant="ghost">{t('ctaFeatures')}</PhosphorButton>
        </div>
      </div>
    </section>
  );
}
