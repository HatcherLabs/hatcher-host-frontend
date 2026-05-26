// components/landing/v3/parts/SectionCli.tsx
'use client';

import { GitBranch, KeyRound, MessageSquareText, Terminal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionCli.module.css';

const COMMANDS = ['npm install -g @hatcherlabs/cli', 'hatcher', 'hatcher hatch "build a repo triage agent"'];

const FEATURES = [
  { key: 'hatch', icon: MessageSquareText },
  { key: 'terminal', icon: Terminal },
  { key: 'dev', icon: GitBranch },
] as const;

export function SectionCli() {
  const t = useTranslations('landingV3.cli');

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <BoxLabel>{t('boxLabel')}</BoxLabel>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.sub}>{t('sub')}</p>
          <div className={styles.keyHint}>
            <KeyRound size={14} aria-hidden />
            <span>{t('apiKeyHint')}</span>
          </div>
          <div className={styles.ctaRow}>
            <PhosphorButton href="/dashboard/settings/api-keys">{t('ctaKey')}</PhosphorButton>
            <PhosphorButton href="https://docs.hatcher.host/cli" variant="ghost" target="_blank" rel="noopener noreferrer">
              {t('ctaDocs')}
            </PhosphorButton>
          </div>
        </div>

        <div className={styles.panel} aria-label={t('terminalLabel')}>
          <div className={styles.panelBar}>
            <span className={styles.panelDot} />
            <span className={styles.panelTitle}>{t('terminalLabel')}</span>
          </div>
          <pre className={styles.terminal}>
            {COMMANDS.map((command) => (
              <span key={command} className={styles.line}>
                <span className={styles.prompt}>$</span> {command}
              </span>
            ))}
          </pre>
          <div className={styles.featureGrid}>
            {FEATURES.map(({ key, icon: Icon }) => (
              <div key={key} className={styles.feature}>
                <Icon size={16} aria-hidden />
                <div>
                  <h3>{t(`features.${key}.title`)}</h3>
                  <p>{t(`features.${key}.body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
