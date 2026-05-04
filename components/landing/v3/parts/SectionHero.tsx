// components/landing/v3/parts/SectionHero.tsx
'use client';
import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import { TerminalMockup } from '../shared/TerminalMockup';
import styles from './SectionHero.module.css';

export function SectionHero() {
  const t = useTranslations('landingV3.hero');
  return (
    <section className={`${styles.hero} v3-scanline`}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <BoxLabel>{t('boxLabel')}</BoxLabel>
          <h1 className={styles.headline}>
            {t('headline1')}<br />
            <span className={styles.accent}>{t('headline2')}</span>
          </h1>
          <p className={styles.sub}>{t('sub')}</p>
          <div className={styles.ctaRow}>
            <PhosphorButton href="/create">{t('ctaPrimary')}</PhosphorButton>
            <PhosphorButton href="/city" variant="ghost">{t('ctaGhost')}</PhosphorButton>
          </div>
        </div>
        <div className={styles.visual}>
          <TerminalMockup />
        </div>
      </div>
    </section>
  );
}
