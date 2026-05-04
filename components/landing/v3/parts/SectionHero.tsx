// components/landing/v3/parts/SectionHero.tsx
'use client';
import { useTranslations } from 'next-intl';
import { PhosphorButton } from '../shared/PhosphorButton';
import { TerminalMockup } from '../shared/TerminalMockup';
import styles from './SectionHero.module.css';

const SIGNALS = [
  { label: 'Hosted LLM', value: 'OpenRouter', tone: 'green' },
  { label: 'Default model', value: 'DeepSeek V4 Flash', tone: 'cyan' },
  { label: 'Focus frameworks', value: 'OpenClaw + Hermes', tone: 'amber' },
] as const;

const LIVE_FEED = [
  { label: 'room', value: '3D cockpit active' },
  { label: 'city', value: 'district stream online' },
  { label: 'skills', value: 'recommended pack ready' },
] as const;

export function SectionHero() {
  const t = useTranslations('landingV3.hero');
  return (
    <section className={`${styles.hero} v3-scanline`}>
      <div className={styles.media} aria-hidden />
      <div className={styles.scrim} aria-hidden />
      <div className={styles.bottomFade} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 className={styles.headline}>
            {t('headline1')}<br />
            <span className={styles.accent}>{t('headline2')}</span>
          </h1>
          <p className={styles.sub}>{t('sub')}</p>
          <div className={styles.ctaRow}>
            <PhosphorButton href="/create">{t('ctaPrimary')}</PhosphorButton>
            <PhosphorButton href="/city" variant="ghost">{t('ctaGhost')}</PhosphorButton>
          </div>
          <div className={styles.signals} aria-label="Hatcher platform highlights">
            {SIGNALS.map((signal) => (
              <div key={signal.label} className={`${styles.signal} ${styles[signal.tone]}`}>
                <span className={styles.signalLabel}>{signal.label}</span>
                <span className={styles.signalValue}>{signal.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.visualDeck} aria-label="Live Hatcher operations preview">
          <div className={styles.terminalLift}>
            <TerminalMockup />
          </div>
          <div className={styles.telemetry}>
            <div className={styles.telemetryHead}>
              <span className={styles.liveDot} aria-hidden />
              live stack
            </div>
            <div className={styles.feed}>
              {LIVE_FEED.map((item) => (
                <div key={item.label} className={styles.feedRow}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
