// components/landing/v3/parts/SectionCity.tsx
'use client';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import { LiveCityCounter } from '../shared/LiveCityCounter';
import styles from './SectionCity.module.css';

/**
 * Hatcher City section. Uses the real public city preview asset instead of a
 * schematic mockup so the landing page shows the product's game-like surface.
 * Real data: "25 categories" comes from world/grid.ts (5x5 grid).
 * LiveCityCounter pulls from /agents/snapshot at runtime, hidden if <10.
 */
export function SectionCity() {
  const t = useTranslations('landingV3.city');
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>{t('boxLabel')}</BoxLabel>
          <h2 className={styles.title}>{t('title')}</h2>
        </header>

        <div className={styles.shot}>
          <Image
            src="/city-preview.png"
            alt="Hatcher City 3D agent district preview"
            fill
            sizes="(max-width: 768px) 100vw, 1280px"
            className={styles.image}
          />
          <div className={styles.hud} aria-hidden>
            <span>/city</span>
            <strong>{t('districts')}</strong>
          </div>
          <div className={styles.statusRail} aria-hidden>
            <span>OPENCLAW</span>
            <span>HERMES</span>
            <span>LIVE ROOMS</span>
          </div>
        </div>

        <div className={styles.belowShot}>
          <p className={styles.body}>{t('body')}</p>
          <div className={styles.actions}>
            <PhosphorButton href="/city">{t('cta')}</PhosphorButton>
            <LiveCityCounter />
          </div>
        </div>
      </div>
    </section>
  );
}
