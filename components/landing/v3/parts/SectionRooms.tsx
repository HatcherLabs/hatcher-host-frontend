// components/landing/v3/parts/SectionRooms.tsx
'use client';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { BoxLabel } from '../shared/BoxLabel';
import styles from './SectionRooms.module.css';

const FRAMEWORKS = [
  { key: 'openclaw', label: 'OpenClaw', color: '#FACC15', tag: 'skill-heavy' },
  { key: 'hermes', label: 'Hermes', color: '#38BDF8', tag: 'autonomous' },
] as const;

export function SectionRooms() {
  const t = useTranslations('landingV3.rooms');
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>{t('boxLabel')}</BoxLabel>
          <h2 className={styles.title}>{t('title')}</h2>
        </header>

        <div className={styles.layout}>
          <div className={styles.mockupWrap}>
            <Image
              src="/landing-v3/agent-room-cockpit.png"
              alt="Game-like 3D agent room with cockpit stations"
              fill
              sizes="(max-width: 960px) 100vw, 600px"
              className={styles.roomImage}
            />
            <div className={styles.roomHud} aria-hidden>
              <span>/agent/sample-room/room</span>
              <strong>LIVE</strong>
            </div>
          </div>
          <div className={styles.copy}>
            <p className={styles.body}>{t('body')}</p>
            <ul className={styles.stations}>
              <li>{t('stationAvatar')}</li>
              <li>{t('stationSkills')}</li>
              <li>{t('stationIntegrations')}</li>
              <li>{t('stationStatus')}</li>
              <li>{t('stationLogs')}</li>
              <li>{t('stationStats')}</li>
              <li>{t('stationMemory')}</li>
              <li>{t('stationConfig')}</li>
            </ul>
            <div className={styles.chips}>
              {FRAMEWORKS.map((f) => (
                <span key={f.key} className={styles.chip} style={{ borderColor: f.color, color: f.color }}>
                  <span className={styles.chipDot} style={{ background: f.color }} aria-hidden />
                  <span>{f.label}</span>
                  <small>{f.tag}</small>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
