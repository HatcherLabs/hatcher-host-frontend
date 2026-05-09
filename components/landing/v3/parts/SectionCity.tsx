// components/landing/v3/parts/SectionCity.tsx
'use client';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import { LiveCityCounter } from '../shared/LiveCityCounter';
import styles from './SectionCity.module.css';

/**
 * Hatcher City section. Uses a static capture of the current city scene rather
 * than autoplay video, so the landing page shows the real product surface.
 * LiveCityCounter pulls from /public/city at runtime, hidden if <10.
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
            src="/landing-v3/hatcher-city-live-network.webp"
            alt="Hatcher City live agent network with user building and active agents"
            fill
            sizes="(max-width: 768px) 100vw, 1280px"
            className={styles.image}
            loading="eager"
            unoptimized
          />
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
