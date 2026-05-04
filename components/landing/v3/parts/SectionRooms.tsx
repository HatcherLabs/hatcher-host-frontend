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
          <div className={styles.mockupWrap}>
            <RoomMockup />
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

/**
 * SVG mockup of a generic agent room. Reproduces real UI structure (8
 * stations + framework chip + walkable POV indicator) without exposing
 * any live state or PII.
 */
function RoomMockup() {
  return (
    <svg viewBox="0 0 600 380" className={styles.svg} role="img" aria-label="Agent Room mockup with 8 interactive stations">
      <defs>
        <linearGradient id="room-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0D160F" />
          <stop offset="52%" stopColor="#050805" />
          <stop offset="100%" stopColor="#020302" />
        </linearGradient>
        <linearGradient id="station-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#162118" />
          <stop offset="100%" stopColor="#080B09" />
        </linearGradient>
        <radialGradient id="avatar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#39FF88" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#39FF88" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="600" height="380" rx="8" fill="url(#room-bg)" stroke="#2A2A2A" />
      <g stroke="#1F1F1F" strokeWidth="0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`h-${i}`} x1="0" y1={i * 32 + 60} x2="600" y2={i * 32 + 60} />
        ))}
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={`v-${i}`} x1={i * 36} y1="60" x2={i * 36} y2="380" />
        ))}
      </g>
      <path d="M120 340 L245 215 L355 215 L480 340 Z" fill="#08110B" stroke="#39FF88" strokeOpacity="0.28" />
      <path d="M300 238 L90 130 M300 238 L90 290 M300 238 L510 130 M300 238 L510 290" stroke="#39FF88" strokeOpacity="0.18" strokeWidth="1" />
      <g fill="url(#station-fill)" stroke="#39FF88" strokeWidth="1">
        <rect x="40"  y="100" width="100" height="60"  rx="4" />
        <rect x="40"  y="180" width="100" height="60"  rx="4" />
        <rect x="40"  y="260" width="100" height="60"  rx="4" />
        <rect x="460" y="100" width="100" height="60"  rx="4" />
        <rect x="460" y="180" width="100" height="60"  rx="4" />
        <rect x="460" y="260" width="100" height="60"  rx="4" />
        <rect x="180" y="80"  width="120" height="50"  rx="4" />
        <rect x="320" y="80"  width="120" height="50"  rx="4" />
      </g>
      <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#A0A0A0">
        <text x="90"  y="135" textAnchor="middle">AVATAR</text>
        <text x="90"  y="215" textAnchor="middle">SKILLS</text>
        <text x="90"  y="295" textAnchor="middle">INTEGRATIONS</text>
        <text x="510" y="135" textAnchor="middle">STATUS</text>
        <text x="510" y="215" textAnchor="middle">LOGS</text>
        <text x="510" y="295" textAnchor="middle">STATS</text>
        <text x="240" y="110" textAnchor="middle">MEMORY</text>
        <text x="380" y="110" textAnchor="middle">CONFIG</text>
      </g>
      <g>
        <circle cx="300" cy="240" r="58" fill="url(#avatar-glow)" />
        <circle cx="300" cy="240" r="6" fill="#39FF88" />
        <circle cx="300" cy="240" r="14" fill="none" stroke="#39FF88" strokeWidth="0.8" opacity="0.5" />
        <circle cx="300" cy="240" r="28" fill="none" stroke="#38BDF8" strokeWidth="0.7" opacity="0.35" />
        <text x="300" y="264" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#39FF88">YOU</text>
      </g>
      <rect x="0" y="0" width="600" height="40" fill="#0F0F0F" />
      <text x="20" y="26" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#A0A0A0">/agent/sample-room/room</text>
      <circle cx="570" cy="20" r="4" fill="#39FF88" />
      <text x="556" y="25" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#39FF88">LIVE</text>
    </svg>
  );
}
