// components/landing/v3/parts/SectionUseCases.tsx
'use client';

import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionUseCases.module.css';

const USE_CASE_KEYS = [
  'crypto',
  'polymarket',
  'trader',
  'community',
  'research',
  'email',
] as const;

export function SectionUseCases() {
  const t = useTranslations('landingV3.useCases');

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>{t('boxLabel')}</BoxLabel>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.body}>{t('body')}</p>
        </header>

        <div className={styles.grid}>
          {USE_CASE_KEYS.map((key) => (
            <article key={key} className={styles.card}>
              <span className={styles.cardEyebrow}>
                {t(`items.${key}.eyebrow`)}
              </span>
              <h3 className={styles.cardTitle}>{t(`items.${key}.title`)}</h3>
              <p className={styles.cardBody}>{t(`items.${key}.body`)}</p>
            </article>
          ))}
        </div>

        <div className={styles.bottom}>
          <p>{t('footer')}</p>
          <PhosphorButton href="/create">{t('cta')}</PhosphorButton>
        </div>
      </div>
    </section>
  );
}
