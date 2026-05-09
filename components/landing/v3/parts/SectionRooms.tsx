// components/landing/v3/parts/SectionRooms.tsx
'use client';
import { useTranslations } from 'next-intl';
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
          <div className={styles.mediaStack}>
            <div className={styles.mockupWrap}>
              <BuildingRender />
              <div className={styles.roomHud} aria-hidden>
                <span>/city/building</span>
                <strong>BUILDING</strong>
              </div>
            </div>
            <div className={`${styles.mockupWrap} ${styles.roomCard}`}>
              <RoomRender />
              <div className={styles.roomHud} aria-hidden>
                <span>/agent/nova-trader/room</span>
                <strong>ROOM</strong>
              </div>
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
                <span
                  key={f.key}
                  className={styles.chip}
                  style={{ borderColor: f.color, color: f.color }}
                >
                  <span
                    className={styles.chipDot}
                    style={{ background: f.color }}
                    aria-hidden
                  />
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

function BuildingRender() {
  return (
    <div
      className={styles.buildingRender}
      role="img"
      aria-label="Static render of a Hatcher building hallway with doors for agents"
    >
      <span className={styles.hallLight} aria-hidden />
      <span className={styles.hallLight} aria-hidden />
      <span className={styles.hallLight} aria-hidden />
      <div className={styles.hallFloor} aria-hidden>
        {Array.from({ length: 24 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className={styles.doorRow} aria-hidden>
        {['Research', 'Trader', 'Mail'].map((label, index) => (
          <span key={label} className={styles.agentDoor}>
            <strong>{label}</strong>
            <small>{index === 1 ? 'running' : 'ready'}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function RoomRender() {
  return (
    <div
      className={styles.roomRender}
      role="img"
      aria-label="Static render of an agent room with avatar, log wall, laptop and city window"
    >
      <div className={styles.windowView} aria-hidden>
        <span className={styles.windowMountain} />
        <span className={styles.windowCity} />
        <span className={styles.windowFrame} />
      </div>
      <div className={styles.tv} aria-hidden>
        <span>AGENT LOGS</span>
        <i>2026-05-09 scan markets</i>
        <i>2026-05-09 alert ready</i>
      </div>
      <span className={styles.statusLamp} aria-hidden />
      <div className={styles.avatar} aria-hidden>
        <span />
      </div>
      <div className={styles.desk} aria-hidden>
        <span className={styles.laptop} />
      </div>
      <div className={styles.shelf} aria-hidden>
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}
