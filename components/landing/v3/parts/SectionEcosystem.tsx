// components/landing/v3/parts/SectionEcosystem.tsx
'use client';
import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import styles from './SectionEcosystem.module.css';

const FRAMEWORKS = [
  { key: 'openclaw', label: 'OpenClaw', color: '#FFCC00', kind: 'framework' as const },
  { key: 'hermes',   label: 'Hermes',   color: '#A855F7', kind: 'framework' as const },
  { key: 'elizaos',  label: 'ElizaOS',  color: '#3B82F6', kind: 'framework' as const },
  { key: 'milady',   label: 'Milady',   color: '#EC4899', kind: 'framework' as const },
];

const CHAINS = [
  { key: 'solana', label: 'Solana', color: '#9945FF', href: 'https://solana.com' },
  { key: 'skale',  label: 'SKALE',  color: '#39FF88', href: 'https://skale.space' },
];

export function SectionEcosystem() {
  const t = useTranslations('landingV3.ecosystem');
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>{t('boxLabel')}</BoxLabel>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.sub}>{t('sub')}</p>
        </header>

        <div className={styles.row}>
          <div className={styles.group}>
            <span className={styles.groupLabel}>{t('frameworksLabel')}</span>
            <div className={styles.tiles}>
              {FRAMEWORKS.map((f) => (
                <div key={f.key} className={styles.tile}>
                  <span className={styles.dot} style={{ background: f.color, boxShadow: `0 0 12px ${f.color}` }} />
                  <span className={styles.tileLabel}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.divider} aria-hidden />

          <div className={styles.group}>
            <span className={styles.groupLabel}>{t('chainsLabel')}</span>
            <div className={styles.tiles}>
              {CHAINS.map((c) => (
                <a
                  key={c.key}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.tile} ${styles.tileLink}`}
                >
                  <span className={styles.dot} style={{ background: c.color, boxShadow: `0 0 12px ${c.color}` }} />
                  <span className={styles.tileLabel}>{c.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
