'use client';

import { Files, MessageSquareText, PlugZap, TerminalSquare } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import styles from './SectionRooms.module.css';

const STATION_KEYS = [
  'stationStatus',
  'stationLogs',
  'stationIntegrations',
  'stationConfig',
  'stationSkills',
  'stationMemory',
  'stationAvatar',
  'stationStats',
] as const;

const CONTROL_ROOM_ROWS = [
  {
    icon: MessageSquareText,
    title: 'Chat and steer',
    body: 'Give instructions, review answers, and keep each agent focused from one clean workspace.',
    meta: 'Private by default',
  },
  {
    icon: Files,
    title: 'Files and logs',
    body: 'Inspect outputs, generated files, and recent activity without jumping between tools.',
    meta: 'Readable history',
  },
  {
    icon: PlugZap,
    title: 'Integrations',
    body: 'Connect communication, developer, wallet, and partner tools only when the agent needs them.',
    meta: 'Scoped access',
  },
  {
    icon: TerminalSquare,
    title: 'Terminal when needed',
    body: 'Open a secure terminal surface for advanced workflows without making it the center of the UI.',
    meta: 'Controlled operations',
  },
] as const;

const ROOM_STATUS = [
  'stationStatus',
  'Private room',
  'Launch-ready',
] as const;

export function SectionRooms() {
  const t = useTranslations('landingV3.rooms');

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <BoxLabel>{t('boxLabel')}</BoxLabel>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.body}>{t('body')}</p>
          <ul className={styles.stations}>
            {STATION_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>

        <div className={styles.roomSummary}>
          <div className={styles.roomVisual}>
            <Image
              src="/landing-v3/hatcher-agent-room-shell.webp"
              alt="Hatcher agent control room with shell architecture and clean operational surfaces"
              fill
              sizes="(max-width: 980px) 100vw, 680px"
              className={styles.roomImage}
              unoptimized
            />
          </div>

          <div className={styles.summaryHeader}>
            <span className={styles.summaryMark} aria-hidden />
            <div>
              <span className={styles.summaryEyebrow}>Agent room</span>
              <h3>One workspace per agent.</h3>
            </div>
            <div className={styles.statusStack} aria-hidden>
              {ROOM_STATUS.map((item) => (
                <span key={item}>{item === 'stationStatus' ? t(item) : item}</span>
              ))}
            </div>
          </div>

          <div className={styles.summaryList}>
            {CONTROL_ROOM_ROWS.map(({ icon: Icon, title, body, meta }) => (
              <article key={title} className={styles.summaryItem}>
                <span className={styles.summaryIcon}>
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                <span className={styles.summaryText}>
                  <strong>{title}</strong>
                  <small>{body}</small>
                </span>
                <em>{meta}</em>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
